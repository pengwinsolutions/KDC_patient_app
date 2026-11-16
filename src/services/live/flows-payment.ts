/**
 * Live checkout. The server decides: the purchase is created first (it holds the slot or the stock
 * and prices it), then paid through Razorpay Checkout, then the stores reload from the server.
 * The amount charged is the hold's own total, never the app's bill.
 *
 * The hold is kept with the payment in flight (flows/payment.ts → useCheckout), so retrying after a
 * cancelled or failed Checkout pays the same purchase instead of holding a second one.
 */
import type { PaymentIntent, PaymentOutcome } from '../../flows/payment'
import { CASH_ON_DELIVERY, usePayments } from '../../store/payments'
import { ServiceError } from '../errors'
import { payFor } from './checkout'
import type { Hold } from './holds'
import { buyHold } from './membership'
import { syncOne } from './sync'

/** Membership: POST /patient/membership {planCode} (or the hold already waiting for that plan). */
export async function holdMembership(intent: Extract<PaymentIntent, { kind: 'membership' }>): Promise<Hold> {
  const held = await buyHold(intent.planId)
  return { purposeCode: held.code, amount: held.total, online: true, screen: 'membership-success', sync: ['membership'] }
}

/** Whether the patient chose to pay now (Razorpay) rather than at the door. */
export const paysOnline = () => usePayments.getState().selectedMethodId !== CASH_ON_DELIVERY.id

/** What identifies one purchase: the same intent and way of paying reuses its hold. */
export function purchaseKey(intent: PaymentIntent, online: boolean): string {
  switch (intent.kind) {
    case 'consultation':
      return JSON.stringify(['c', intent.doctorId, intent.mode, intent.date, intent.time, intent.patientLabel])
    case 'diagnostic':
      return JSON.stringify(['d', intent.testId, intent.labId, intent.method, intent.date, intent.time, intent.address, online])
    case 'pharmacy':
      return JSON.stringify(['p', intent.lines.map((l) => [l.medicineId, l.qty]), intent.address, intent.slot, online])
    case 'membership':
      return JSON.stringify(['m', intent.planId])
  }
}

export function createHold(intent: PaymentIntent, online: boolean): Promise<Hold> {
  switch (intent.kind) {
    case 'consultation':
      return (require('./flows-care') as { holdConsultation: (i: typeof intent) => Promise<Hold> }).holdConsultation(intent)
    case 'diagnostic':
      return (require('./flows-commerce') as { holdDiagnostic: (i: typeof intent, online: boolean) => Promise<Hold> }).holdDiagnostic(intent, online)
    case 'pharmacy':
      return (require('./flows-commerce') as { holdPharmacy: (i: typeof intent, online: boolean) => Promise<Hold> }).holdPharmacy(intent, online)
    case 'membership':
      return holdMembership(intent)
  }
}

export interface Inflight {
  key: string
  hold: Hold
  /** One per purchase, so retries return the same payment and Razorpay order. */
  idempotencyKey: string
}

let serial = 0
const newKey = () => `pay-${Date.now().toString(36)}-${(serial++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const LAPSED = 'This booking’s hold has expired, so nothing was charged. Please choose again.'

/**
 * Runs the live checkout for `intent`. `inflight` is the hold from an earlier attempt at this
 * purchase (if any); `keep` stores the current one (null once it's done or gone).
 */
export async function runLivePayment(
  intent: PaymentIntent,
  inflight: Inflight | null,
  keep: (f: Inflight | null) => void,
): Promise<PaymentOutcome> {
  const online = intent.kind === 'membership' || intent.kind === 'consultation' ? true : paysOnline()
  const key = purchaseKey(intent, online)
  let current = inflight?.key === key ? inflight : null
  try {
    if (!current) {
      current = { key, hold: await createHold(intent, online), idempotencyKey: newKey() }
      keep(current)
    }
    const { hold } = current
    if (hold.online) {
      const paid = await payFor(hold.purposeCode, current.idempotencyKey)
      if (paid.status === 'cancelled') return { ok: false, reason: 'Payment cancelled. Nothing was charged.', cancelled: true }
      if (paid.status === 'failed') return { ok: false, reason: paid.reason }
      if (paid.status === 'pending') {
        return { ok: false, reason: 'Your bank hasn’t confirmed the payment yet. If money was taken, the booking confirms itself or the amount is refunded.', pending: true }
      }
    }
    keep(null)
    await syncOne(...hold.sync, 'payments', 'membership').catch(() => undefined)
    return { ok: true, screen: hold.screen, params: hold.params }
  } catch (e) {
    if (e instanceof ServiceError && e.code === 'conflict' && current) {
      // The hold lapsed (or the purchase changed on the server): start over next time.
      keep(null)
      return { ok: false, reason: e.message.includes('hold') || e.message.includes('expired') ? LAPSED : e.message }
    }
    return { ok: false, reason: e instanceof ServiceError ? e.message : 'The payment didn’t go through. Please try again.' }
  }
}
