/**
 * KDC+ Plus on the backend: the plans and caps operations set (GET /public/membership/plans),
 * the patient's membership and savings (GET /patient/membership), auto-renew and ending it.
 * Buying is a payment hold (POST /patient/membership) paid through checkout (flows-payment.ts).
 */
import type { BenefitArea, MembershipRecord, Plan, SavingsEntry } from '../../types'
import { planConfig, plans as sharedPlans } from '../../mock-data/membership'
import { useMembership } from '../../store/membership'
import { api } from './http'
import { atToDay, num } from './map'

type Rates = Record<BenefitArea, number>

interface PlanView {
  code: string
  name: string
  price: number
  months: number
  discountPct: number
  gst: number
  totalWithGst: number
  tag: string | null
  isBest: boolean
}

export interface MembershipView {
  status: 'none' | 'active' | 'expired' | 'cancelled' | 'pending_payment'
  code?: string
  plan?: { code: string; name: string; months: number }
  discountPct?: number
  rates?: Rates
  total?: number
  startedAt?: string | null
  renewsAt?: string | null
  daysLeft?: number
  autoRenew?: boolean
  holdExpiresAt?: string | null
  savings?: { total: number; entries: { area: BenefitArea; label: string; source: string | null; listed: number; saved: number; at: string }[] }
  pendingPayment?: MembershipView | null
}

export function toPlan(p: PlanView): Plan {
  return { id: p.code, name: p.name, price: num(p.price), months: p.months, discount: p.discountPct, tag: p.tag ?? undefined, best: p.isBest, gst: num(p.gst), total: num(p.totalWithGst) }
}

/**
 * The plans and caps, in place of the bundled figures: `plans`, `planById` and `planConfig`
 * (read across the app) and the store (which re-renders the screens).
 */
export async function loadPlans(): Promise<Plan[]> {
  const r = await api.pub<{ plans: PlanView[]; caps: Rates }>('public/membership/plans')
  const list = r.plans.map(toPlan)
  sharedPlans.splice(0, sharedPlans.length, ...list)
  planConfig.discount = { ...r.caps }
  planConfig.headlineDiscount = Math.min(Math.max(0, ...list.map((p) => p.discount)), Math.max(r.caps.consultations, r.caps.pharmacy, r.caps.diagnostics))
  const picked = useMembership.getState().pickedPlanId
  useMembership.setState({ plans: list, pickedPlanId: list.some((p) => p.id === picked) ? picked : (list.find((p) => p.best) ?? list[0])?.id ?? picked })
  return list
}

export function toRecord(m: MembershipView): MembershipRecord & { rates: Rates | null; code: string | null } {
  const entries: SavingsEntry[] = (m.savings?.entries ?? []).map((e, i) => ({
    id: `${e.source ?? 'sv'}-${i}`,
    area: e.area,
    label: e.label,
    date: atToDay(e.at),
    listed: num(e.listed),
    saved: num(e.saved),
  }))
  const status: MembershipRecord['status'] = m.status === 'active' ? 'active' : m.status === 'expired' || m.status === 'cancelled' ? 'expired' : 'none'
  return {
    status,
    planId: m.plan?.code ?? '',
    since: atToDay(m.startedAt),
    renews: atToDay(m.renewsAt),
    daysLeft: m.daysLeft ?? 0,
    autoRenew: Boolean(m.autoRenew),
    ledger: entries,
    rates: status === 'active' ? (m.rates ?? null) : null,
    code: m.code ?? null,
  }
}

/** The patient's membership now; also returns a hold still waiting for payment, if any. */
export async function loadMembership(): Promise<MembershipView> {
  const m = await api.get<MembershipView>('patient/membership')
  // A cancelled or expired membership still has its history; the record's ledger keeps it.
  useMembership.setState(toRecord(m))
  return m
}

export async function setAutoRenew(autoRenew: boolean) {
  await api.patch('patient/membership', { autoRenew })
  await loadMembership()
}

export async function endMembership() {
  await api.post('patient/membership/end', {})
  await loadMembership()
}

/** Buys `planCode`: reuses a hold for the same plan still waiting for payment, else a new hold. */
export async function buyHold(planCode: string): Promise<{ code: string; total: number }> {
  const current = await api.get<MembershipView>('patient/membership')
  const pending = current.pendingPayment
  if (pending?.code && pending.plan?.code === planCode) return { code: pending.code, total: num(pending.total) }
  const held = await api.post<MembershipView>('patient/membership', { planCode })
  return { code: held.code!, total: num(held.total) }
}
