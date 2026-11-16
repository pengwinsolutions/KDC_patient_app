import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BenefitArea, MembershipRecord, Plan, SavingsEntry } from '../types'
import { planById, plans as bundledPlans, seedMembership } from '../mock-data/membership'
import { services } from '../services'
import { LIVE } from '../services/config'
import { persistStorage } from './storage'

interface MembershipState extends MembershipRecord {
  /** Plan chosen on the offer screen, carried into checkout. */
  pickedPlanId: string
  /** The plans on sale: bundled (demo) or the server's (live). */
  plans: Plan[]
  /** Live: the discount the server applies per area for this membership; null in demo. */
  rates: Record<BenefitArea, number> | null
  /** Live: the membership's code on the server. */
  code: string | null
  pickPlan: (planId: string) => void
  activate: (planId: string, startedOn?: Date) => Promise<void>
  setAutoRenew: (autoRenew: boolean) => void
  expire: () => void
  addSaving: (entry: SavingsEntry) => void
  reset: () => void
}

const EMPTY: MembershipRecord = { status: 'none', planId: '', since: '', renews: '', daysLeft: 0, autoRenew: false, ledger: [] }

const seed = LIVE
  ? { ...EMPTY, pickedPlanId: 'annual', plans: [] as Plan[], rates: null, code: null }
  : { ...seedMembership, pickedPlanId: 'annual', plans: bundledPlans, rates: null, code: null }

const live = () => require('../services/live/membership') as typeof import('../services/live/membership')

export const useMembership = create<MembershipState>()(
  persist(
    (set) => ({
      ...seed,
      pickPlan: (pickedPlanId) => set({ pickedPlanId }),
      /* The savings record belongs to the patient, so it outlives any one plan. */
      activate: async (planId, startedOn = new Date()) => {
        if (LIVE) {
          // Live: a membership starts only when its payment clears on the server; this reloads it.
          await live().loadMembership()
          return
        }
        const record = await services.membership.activate(planById(planId), startedOn)
        set((s) => ({ ...record, ledger: s.ledger }))
      },
      setAutoRenew: (autoRenew) => {
        if (LIVE) {
          const before = useMembership.getState().autoRenew
          set({ autoRenew })
          live()
            .setAutoRenew(autoRenew)
            .catch(() => set({ autoRenew: before }))
          return
        }
        set({ autoRenew })
      },
      expire: () => {
        if (LIVE) {
          live().endMembership().catch(() => undefined)
          return
        }
        set({ status: 'expired', daysLeft: 0, autoRenew: false })
      },
      addSaving: (entry) => set((s) => ({ ledger: [entry, ...s.ledger] })),
      reset: () => set(seed),
    }),
    { name: 'membership', storage: persistStorage, partialize: ({ plans: _plans, ...rest }) => rest },
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
