/**
 * KDC+ Plus — the paid membership.
 *
 * A patient buys a plan once; from that moment every consultation, medicine
 * order and diagnostic test is billed at the member rate. The rate itself is
 * not a product decision made here — operations set it in the admin panel, and
 * the app only ever reflects what it is told. That is why nothing below is
 * hardcoded into a screen: change `planConfig.discount` and every price, bill
 * line and savings figure in the app follows.
 */

import type { BenefitArea, MembershipRecord, Plan, SavingsEntry } from '../types'

/** Mirrors the admin panel. Percentages, not amounts — so it scales with price. */
export const planConfig = {
  /** Set per category so operations can discount one stream harder than another. */
  discount: {
    consultations: 25,
    pharmacy: 25,
    diagnostics: 25,
  } as Record<BenefitArea, number>,
  /** Shown wherever the member rate is explained. */
  headlineDiscount: 25,
}

export const plans: Plan[] = [
  { id: 'annual', name: '12 months', price: 2500, months: 12, discount: 25, tag: 'Best value', best: true },
  { id: 'half', name: '6 months', price: 1499, months: 6, discount: 15 },
  { id: 'quarter', name: '3 months', price: 849, months: 3, discount: 10 },
]

export const planById = (id: string) => plans.find((p) => p.id === id) ?? plans[0]

/** Per-month equivalent, for comparing plans honestly. */
export const perMonth = (p: Plan) => Math.round(p.price / p.months)

export const benefits: { area: BenefitArea; label: string; detail: string }[] = [
  { area: 'consultations', label: 'Consultations', detail: 'Every video, audio and in-person visit' },
  { area: 'pharmacy', label: 'Pharmacy', detail: 'On medicine orders, over the regular price' },
  { area: 'diagnostics', label: 'Diagnostics', detail: 'Lab tests and home sample collection' },
]

/** Every discount the membership has already applied — the savings ledger. */
const LEDGER_RATE = 0.25

const BILLS: Omit<SavingsEntry, 'saved'>[] = [
  { id: 'sv01', area: 'consultations', label: 'Video consultation — Dr. Arjun Mehta', date: '28 Sep 2026', listed: 800 },
  { id: 'sv02', area: 'pharmacy', label: 'Medicine order · 3 items', date: '24 Sep 2026', listed: 351 },
  { id: 'sv03', area: 'diagnostics', label: 'Lipid Profile — Complete', date: '22 Sep 2026', listed: 699 },
  { id: 'sv04', area: 'consultations', label: 'In-person visit — Dr. Kavya Nair', date: '14 Sep 2026', listed: 900 },
  { id: 'sv05', area: 'pharmacy', label: 'Medicine order · 5 items', date: '08 Sep 2026', listed: 1240 },
  { id: 'sv06', area: 'diagnostics', label: 'HbA1c · Home collection', date: '02 Sep 2026', listed: 549 },
  { id: 'sv07', area: 'consultations', label: 'Video consultation — Dr. Sanjay Iyer', date: '27 Aug 2026', listed: 500 },
  { id: 'sv08', area: 'consultations', label: 'Video consultation — Dr. Arjun Mehta', date: '11 Aug 2026', listed: 800 },
  { id: 'sv09', area: 'pharmacy', label: 'Medicine order · 4 items', date: '29 Jul 2026', listed: 980 },
  { id: 'sv10', area: 'diagnostics', label: 'Full Body Checkup — Advanced', date: '18 Jul 2026', listed: 1200 },
  { id: 'sv11', area: 'consultations', label: 'In-person visit — Dr. Rohan Desai', date: '02 Jul 2026', listed: 1100 },
  { id: 'sv12', area: 'pharmacy', label: 'Medicine order · 7 items', date: '16 Jun 2026', listed: 1560 },
  { id: 'sv13', area: 'diagnostics', label: 'Thyroid Profile (T3, T4, TSH)', date: '30 May 2026', listed: 860 },
  { id: 'sv14', area: 'consultations', label: 'Audio consultation — Dr. Meera Nair', date: '12 May 2026', listed: 800 },
  { id: 'sv15', area: 'pharmacy', label: 'Medicine order · 2 items', date: '21 Apr 2026', listed: 740 },
  { id: 'sv16', area: 'diagnostics', label: 'Vitamin D & B12 panel', date: '09 Mar 2026', listed: 420 },
]

export const savingsLedger: SavingsEntry[] = BILLS.map((r) => ({ ...r, saved: Math.round(r.listed * LEDGER_RATE) }))

/**
 * The patient's own membership at first launch. `status: 'none'` shows the
 * offer instead of the benefit; `'expired'` shows the renewal path.
 */
export const seedMembership: MembershipRecord = {
  status: 'active',
  planId: 'annual',
  since: '12 Jan 2026',
  renews: '12 Jan 2027',
  daysLeft: 96,
  autoRenew: true,
  ledger: savingsLedger,
}
