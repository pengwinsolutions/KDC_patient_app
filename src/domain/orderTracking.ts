import type { DeliveryAttempt, DiagnosticOrder, Order, PharmacyOrder } from '../types'

export const PHARMACY_STAGES = ['Order confirmed', 'Prescription verified', 'Packed at pharmacy', 'Out for delivery', 'Delivered'] as const
export const DIAGNOSTIC_STAGES = ['Booking confirmed', 'Technician assigned', 'Sample collected', 'Processing at lab', 'Report ready'] as const

/** A mock order moves one stage every 45 seconds so tracking can be watched. Live orders carry the server's stage (`fixedStage`). */
export const STAGE_INTERVAL_MS = 45_000

/** Zero-based index of the stage the order is currently in. */
export function currentStage(order: Order, now: number): number {
  if (order.fixedStage !== undefined) return order.fixedStage
  return Math.min(4, Math.max(0, Math.floor((now - order.placedAt) / STAGE_INTERVAL_MS)))
}

export type StageState = 'done' | 'active' | 'pending'

export function stageState(index: number, current: number, finished: boolean): StageState {
  if (index < current || (finished && index === current)) return 'done'
  return index === current ? 'active' : 'pending'
}

export const isDelivered = (order: PharmacyOrder, now: number) => currentStage(order, now) >= 4

/** An order goes out at most this many times; after that it is returned to the pharmacy. */
export const MAX_DELIVERY_ATTEMPTS = 3

/** The server's statuses in the patient's words (the server's own `stage` wins when it has one). */
export const PHARMACY_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Waiting for payment',
  placed: PHARMACY_STAGES[0],
  confirmed: PHARMACY_STAGES[1],
  packed: PHARMACY_STAGES[2],
  out_for_delivery: PHARMACY_STAGES[3],
  delivery_failed: 'Delivery attempt failed',
  delivered: PHARMACY_STAGES[4],
  cancelled: 'Cancelled',
  returned: 'Returned to pharmacy',
}

/** The rider couldn't deliver it; it goes out again or back to the pharmacy. */
export const isDeliveryFailed = (order: PharmacyOrder) => order.status === 'delivery_failed'
export const isReturned = (order: PharmacyOrder) => order.status === 'returned'

/** The latest failed trip out, if any. */
export function lastFailedAttempt(attempts: DeliveryAttempt[] | undefined): DeliveryAttempt | null {
  const failed = (attempts ?? []).filter((a) => a.outcome === 'failed')
  return failed.length ? failed.reduce((a, b) => (b.attempt > a.attempt ? b : a)) : null
}

/** Why a returned order came back, without the server's "Returned to store: " prefix. */
export const returnReason = (reason: string | undefined) => (reason ?? '').replace(/^Returned to store:\s*/i, '').trim() || null

export function isDiagnosticComplete(order: DiagnosticOrder, now: number): boolean {
  return order.status === 'active' && currentStage(order, now) >= 4
}

/** The fields the Orders hub prints for any kind of order. */
export interface OrderRow {
  id: string
  kind: Order['kind']
  title: string
  sub: string
  when: string
  amount: number
  status: string
  tone: 'brand' | 'success' | 'caution' | 'critical' | 'neutral'
  live: boolean
  screen: 'order-tracking' | 'diagnostic-tracking' | 'lab-report'
}

export function pharmacyRow(order: PharmacyOrder, medicineName: (id: string) => string, now: number): OrderRow {
  const delivered = isDelivered(order, now)
  const names = order.lines.map((l) => (l.name ?? medicineName(l.medicineId)).replace(' Tablet', '')).join(', ')
  const count = order.lines.length
  if (order.cancelled) {
    const returned = isReturned(order)
    return {
      id: order.id,
      kind: 'pharmacy',
      title: `${count} ${count === 1 ? 'medicine' : 'medicines'}`,
      sub: names,
      when: returned && order.refundAmount ? `Returned · ₹${order.refundAmount.toLocaleString('en-IN')} refund on its way` : order.placed,
      amount: order.amount,
      status: order.statusLabel ?? (returned ? PHARMACY_STATUS_LABEL.returned : 'Cancelled'),
      tone: returned ? 'critical' : 'neutral',
      live: false,
      screen: 'order-tracking',
    }
  }
  return {
    id: order.id,
    kind: 'pharmacy',
    title: `${count} ${count === 1 ? 'medicine' : 'medicines'}`,
    sub: names,
    when: !delivered && order.status === 'out_for_delivery' && order.deliveryOtp ? `On the way · delivery code ${order.deliveryOtp}` : order.etaWhen,
    amount: order.amount,
    status: delivered ? 'Delivered' : order.statusLabel ?? PHARMACY_STAGES[currentStage(order, now)],
    tone: delivered ? 'success' : isDeliveryFailed(order) ? 'caution' : 'brand',
    live: !delivered,
    screen: 'order-tracking',
  }
}

/** Long test names read poorly in a card title; the short form replaces them. */
export const orderTestTitle = (test: { name: string; short: string }) => (test.name.length <= 24 ? test.name : test.short)

export function diagnosticRow(order: DiagnosticOrder, test: string, lab: string, now: number): OrderRow {
  const complete = isDiagnosticComplete(order, now)
  const cancelled = order.status === 'cancelled'
  const live = !complete && !cancelled
  const reportDone = complete && order.reportedWhen
  return {
    id: order.id,
    kind: 'diagnostics',
    title: test,
    sub: `${lab} · ${order.method === 'Home Collection' ? 'Home collection' : 'Lab visit'}`,
    when: reportDone ? order.reportedWhen! : `${order.date.replace(/ \d{4}$/, '')} · ${order.slotCompact}`,
    amount: order.amount,
    status: cancelled ? 'Cancelled' : complete ? 'Report ready' : order.statusLabel ?? 'Confirmed',
    tone: cancelled ? 'neutral' : complete ? 'success' : 'brand',
    live,
    screen: complete ? 'lab-report' : 'diagnostic-tracking',
  }
}

/* ----------------------------------------------------- returns and proposed changes (Wave 5) */

/**
 * Post-delivery returns and the pharmacy's proposed changes, as the server sends them
 * (docs/pharmacy-wave5-api.md §1–2). Money in these views is integer paise.
 */
export const RETURN_REASONS = [
  { id: 'damaged', label: 'Damaged', hint: 'Broken seal, crushed strip, leaking bottle', photo: true },
  { id: 'expired', label: 'Expired or near expiry', hint: 'Past or close to the date on the pack', photo: false },
  { id: 'wrong_item', label: 'Wrong item', hint: 'Not the medicine, strength or pack you ordered', photo: true },
  { id: 'not_as_described', label: 'Not as described', hint: 'Different from what the listing said', photo: false },
  { id: 'other', label: 'Something else', hint: 'Tell us what went wrong', photo: false },
] as const
export type ReturnReason = (typeof RETURN_REASONS)[number]['id']
export const MAX_RETURN_PHOTOS = 5
export const RETURN_NOTE_MIN = 3
export const RETURN_NOTE_MAX = 500
/**
 * The default return window (Settings → Healthcare → pharmacyMoney.returnWindowDays). The patient's views
 * don't carry the setting, so this only decides whether to offer the button; the server has the last word.
 */
export const RETURN_WINDOW_DAYS = 7

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'cancelled'
export interface ReturnView {
  code: string
  orderCode: string
  pharmacy: { code: string; name: string }
  source: 'patient' | 'admin'
  reason: ReturnReason
  reasonLabel: string
  note: string | null
  status: ReturnStatus
  paymentMethod: 'cod' | 'online'
  lines: { id: number; orderItemId: number; name: string; batchNo: string | null; qty: number; receivedQty: number | null; disposition: string | null }[]
  photoFileIds: number[]
  decision: { at: string; note: string | null } | null
  receivedAt: string | null
  creditNote: { number: string; totalPaise: number; issuedAt: string } | null
  refund: { amountPaise: number; method: 'online' | 'cash'; at: string } | null
  createdAt: string
}

export type ChangeStatus = 'proposed' | 'accepted' | 'rejected' | 'expired' | 'withdrawn'
export interface ChangeLine {
  orderItemId: number
  action: 'substitute' | 'reduce' | 'remove'
  from: { name: string; qty: number; unitPaise: number; amountPaise: number }
  to: { medicineCode: string | null; name: string; qty: number; unitPaise: number; amountPaise: number } | null
  differencePaise: number
}
export interface OrderChange {
  code: string
  orderCode: string | null
  status: ChangeStatus
  note: string | null
  lines: ChangeLine[]
  oldTotalPaise: number
  newTotalPaise: number
  differencePaise: number
  refundPaise: number
  expiresAt: string
  decidedAt: string | null
  decisionNote: string | null
  createdAt: string
}

export const paise = (p: number | null | undefined) => (Number(p ?? 0) || 0) / 100

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Not accepted',
  received: 'Received',
  refunded: 'Refunded',
  cancelled: 'Withdrawn',
}
export const RETURN_STATUS_TONE: Record<ReturnStatus, OrderRow['tone']> = { requested: 'brand', approved: 'brand', rejected: 'critical', received: 'brand', refunded: 'success', cancelled: 'neutral' }

/** Still holding packs (rejected and withdrawn returns don't). */
export const isLiveReturn = (r: Pick<ReturnView, 'status'>) => r.status !== 'rejected' && r.status !== 'cancelled'

/** Whether to offer a return: delivered, and within the return window of delivery. */
export function canRequestReturn(status: string | undefined, deliveredAt: string | null | undefined, now: number, days = RETURN_WINDOW_DAYS) {
  if (status !== 'delivered' || !deliveredAt) return false
  const at = Date.parse(deliveredAt)
  return Number.isFinite(at) && now <= at + days * 86_400_000
}

/**
 * Packs still returnable per order line (matched by name: the patient's order lines don't carry their id, and
 * each return line names its order line): delivered less live returns; a received return holds what was accepted.
 */
export function returnableQty(lines: { name?: string; qty: number }[], returns: Pick<ReturnView, 'status' | 'lines'>[]): number[] {
  const held = new Map<string, number>()
  for (const r of returns.filter(isLiveReturn))
    for (const l of r.lines) {
      const q = r.status === 'received' || r.status === 'refunded' ? (l.receivedQty ?? l.qty) : l.qty
      held.set(l.name, (held.get(l.name) ?? 0) + q)
    }
  return lines.map((l) => Math.max(0, l.qty - (l.name ? (held.get(l.name) ?? 0) : 0)))
}

export interface ReturnDraft {
  qty: number[]
  reason: ReturnReason | null
  note: string
  photos: number
  uploading?: number
}

/** What's missing before each step of the return can go on (0 medicines, 1 what happened). Empty: fine. */
export function returnDraftErrors(d: ReturnDraft, step: 0 | 1): Record<string, string> {
  const e: Record<string, string> = {}
  if (!d.qty.some((q) => q > 0)) e.lines = 'Choose at least one medicine and how many packs.'
  if (step < 1) return e
  const note = d.note.trim()
  const meta = RETURN_REASONS.find((r) => r.id === d.reason)
  if (!meta) e.reason = 'Choose what went wrong.'
  if (d.reason === 'other' && note.length < RETURN_NOTE_MIN) e.note = 'Tell us briefly what went wrong.'
  else if (note && note.length < RETURN_NOTE_MIN) e.note = `Write at least ${RETURN_NOTE_MIN} characters, or leave it empty.`
  if (meta?.photo && !d.photos) e.photos = 'Add a photo of the medicine so the pharmacy can see the problem.'
  if (d.uploading) e.photos = 'Wait for the photos to finish uploading.'
  return e
}

const rs = (p: number) => `₹${paise(p).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** Where a return stands, as the tracking timeline's steps. `when` formats a server timestamp. */
export function returnSteps(r: ReturnView, when: (at: string) => string): { title: string; body?: string; time?: string; state: 'done' | 'active' | 'pending' | 'failed' }[] {
  const first = { title: 'Return requested', body: `${r.reasonLabel}${r.source === 'admin' ? ' · opened by KDC+ support' : ''}`, time: when(r.createdAt), state: 'done' as const }
  if (r.status === 'cancelled') return [first, { title: 'Withdrawn', body: 'You withdrew this return.', time: r.decision?.at ? when(r.decision.at) : undefined, state: 'done' }]
  if (r.status === 'rejected')
    return [first, { title: 'Not accepted', body: r.decision?.note ? `The pharmacy said: “${r.decision.note}”` : 'The pharmacy didn’t accept this return.', time: r.decision?.at ? when(r.decision.at) : undefined, state: 'failed' }]
  const decided = r.status !== 'requested'
  const received = r.status === 'received' || r.status === 'refunded'
  const refunded = r.status === 'refunded'
  const credit = r.creditNote?.totalPaise ?? null
  const where = r.paymentMethod === 'online' ? 'to your original payment method (usually 5–7 working days)' : 'in cash by the pharmacy'
  return [
    first,
    {
      title: decided ? 'Approved' : 'Pharmacy reviewing',
      body: decided ? [r.decision?.note ? `“${r.decision.note}”` : null, received ? null : 'Keep the packs ready; the pharmacy arranges to collect them.'].filter(Boolean).join(' · ') || undefined : `${r.pharmacy.name} reviews it, usually within a day.`,
      time: decided && r.decision?.at ? when(r.decision.at) : undefined,
      state: decided ? 'done' : 'active',
    },
    {
      title: 'Received by the pharmacy',
      body: received && r.creditNote ? `Credit note ${r.creditNote.number} for ${rs(r.creditNote.totalPaise)}` : undefined,
      time: received && r.receivedAt ? when(r.receivedAt) : undefined,
      state: received ? 'done' : decided ? 'active' : 'pending',
    },
    {
      title: 'Refunded',
      body: refunded && r.refund ? `${rs(r.refund.amountPaise)} ${r.refund.method === 'cash' ? 'returned in cash' : 'refunded to your original payment method'}` : received && credit !== null ? `${rs(credit)} will be refunded ${where}.` : undefined,
      time: refunded && r.refund?.at ? when(r.refund.at) : undefined,
      state: refunded ? 'done' : received ? 'active' : 'pending',
    },
  ]
}

/** The open proposal (at most one is open). */
export const openChange = (changes: OrderChange[]) => changes.find((c) => c.status === 'proposed') ?? null

/** "1 h 05 min", "4 min 10 s", or null once it has expired. */
export function changeTimeLeft(expiresAt: string, now: number): string | null {
  const ms = Date.parse(expiresAt) - now
  if (!(ms > 0)) return null
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h) return `${h} h ${String(m).padStart(2, '0')} min`
  return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s % 60} s`
}

/** One changed line in words. */
export function changeLineText(l: ChangeLine): string {
  if (l.action === 'remove' || !l.to) return `${l.from.name} × ${l.from.qty} won’t be sent`
  if (l.action === 'reduce') return `${l.from.name}: ${l.from.qty} → ${l.to.qty} ${l.to.qty === 1 ? 'pack' : 'packs'}`
  return `${l.from.name} × ${l.from.qty} → ${l.to.name} × ${l.to.qty} (same composition)`
}
export const CHANGE_ACTION_LABEL: Record<ChangeLine['action'], string> = { substitute: 'Substitute', reduce: 'Fewer packs', remove: 'Removed' }

/** "−₹18", "+₹25", "No change" for a paise difference. */
export const signedRupees = (p: number) => (p === 0 ? 'No change' : `${p < 0 ? '−' : '+'}${rs(Math.abs(p))}`)
export const paiseRupees = rs
