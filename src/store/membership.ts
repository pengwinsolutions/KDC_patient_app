import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BenefitArea, MembershipRecord, SavingsEntry } from '../types'
import { planById, seedMembership } from '../mock-data/membership'
import { services } from '../services'
import { persistStorage } from './storage'

interface MembershipState extends MembershipRecord {
  /** Plan chosen on the offer screen, carried into checkout. */
  pickedPlanId: string
  pickPlan: (planId: string) => void
  activate: (planId: string, startedOn?: Date) => Promise<void>
  setAutoRenew: (autoRenew: boolean) => void
  expire: () => void
  addSaving: (entry: SavingsEntry) => void
  reset: () => void
}

const seed = { ...seedMembership, pickedPlanId: 'annual' }

export const useMembership = create<MembershipState>()(
  persist(
    (set) => ({
      ...seed,
      pickPlan: (pickedPlanId) => set({ pickedPlanId }),
      /* The savings record belongs to the patient, so it outlives any one plan. */
      activate: async (planId, startedOn = new Date()) => {
        const record = await services.membership.activate(planById(planId), startedOn)
        set((s) => ({ ...record, ledger: s.ledger }))
      },
      setAutoRenew: (autoRenew) => set({ autoRenew }),
      expire: () => set({ status: 'expired', daysLeft: 0, autoRenew: false }),
      addSaving: (entry) => set((s) => ({ ledger: [entry, ...s.ledger] })),
      reset: () => set(seed),
    }),
    { name: 'membership', storage: persistStorage },
  ),
)

export const totalSaved = (ledger: SavingsEntry[]) => ledger.reduce((sum, r) => sum + r.saved, 0)

export const savedByArea = (ledger: SavingsEntry[]) =>
  ledger.reduce<Record<BenefitArea, number>>(
    (acc, r) => ({ ...acc, [r.area]: acc[r.area] + r.saved }),
    { consultations: 0, pharmacy: 0, diagnostics: 0 },
  )

/** Screen a patient lands on from any KDC+ Plus entry point. */
export const membershipEntryScreen = (status: MembershipRecord['status']) =>
  status === 'active' ? 'membership-manage' : status === 'expired' ? 'st-membership-expired' : 'membership'
