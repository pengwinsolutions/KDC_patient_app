import type { BenefitArea, MembershipRecord, Plan } from '../types'
import { planById, planConfig } from '../mock-data/membership'

export const PLATFORM_FEE = 49
export const GST_RATE = 0.18

/**
 * Rate for an area: the discount of the plan the patient actually holds, capped
 * by the per-stream ceiling operations set, and nothing unless the plan is active.
 */
export function rateFor(
  membership: Pick<MembershipRecord, 'status' | 'planId'> & { rates?: Partial<Record<BenefitArea, number>> | null },
  area: BenefitArea,
): number {
  if (membership.status !== 'active') return 0
  // Live: the server's own rates for this membership, which its bills use.
  if (membership.rates) return membership.rates[area] ?? 0
  return Math.min(planById(membership.planId).discount, planConfig.discount[area])
}

/**
 * Member price for a listed amount, as the server bills it: the saving is rounded to the
 * rupee (`rupees(amount × pct / 100)` in the backend's commerce-ops) and taken off the amount.
 * Rounding the price instead disagrees on halves: ₹450 at 25% is a ₹113 saving (₹337), not ₹112.
 */
export function memberPrice(amount: number, pct: number): number {
  return pct ? amount - Math.round((amount * pct) / 100) : amount
}

export function memberSaving(amount: number, pct: number): number {
  return amount - memberPrice(amount, pct)
}

/**
 * What the offer would save a non-member, quoted at the headline rate: the best plan's discount
 * (the "25% off" the nudge states), within this area's cap. The cap alone is only the most any
 * plan may give (60% on the live server), so quoting it promised savings no plan delivers.
 */
export function wouldSave(amount: number, area: BenefitArea): number {
  return memberSaving(amount, Math.min(planConfig.headlineDiscount, planConfig.discount[area]))
}

export interface Bill {
  base: number
  platformFee: number
  discount: number
  total: number
}

/** A bill: the member rate reduces the base only, never the platform fee. */
export function buildBill(base: number, pct: number, platformFee = 0): Bill {
  const discount = memberSaving(base, pct)
  return { base, platformFee, discount, total: base + platformFee - discount }
}

export function planTotals(plan: Plan) {
  if (plan.gst !== undefined && plan.total !== undefined) return { price: plan.price, gst: plan.gst, total: plan.total }
  const gst = Math.round(plan.price * GST_RATE)
  return { price: plan.price, gst, total: plan.price + gst }
}

/** A lab charges for a test in proportion to its reference (HbA1c) price. */
const REFERENCE_TEST_PRICE = 549

export function labTestPrice(testPrice: number, labReferencePrice: number): number {
  return Math.round((testPrice * labReferencePrice) / REFERENCE_TEST_PRICE)
}

/**
 * Pharmacy delivery, as the server charges it: `fee` when the order (after any member discount)
 * is below `freeAbove`, otherwise free. Also how much more would make it free.
 */
export function pharmacyDelivery(afterDiscount: number, fee: number, freeAbove: number): { fee: number; toFree: number } {
  if (afterDiscount >= freeAbove) return { fee: 0, toFree: 0 }
  return { fee, toFree: Math.ceil(freeAbove - afterDiscount) }
}
