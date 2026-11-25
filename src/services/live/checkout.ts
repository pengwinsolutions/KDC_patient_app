/**
 * Paying for a purchase the server is holding: POST /patient/payments creates (or returns) its
 * Razorpay order, Razorpay Checkout takes the payment in its own native screen (UPI, cards, net
 * banking, wallets; card details never touch KDC+), and POST /patient/payments/:code/verify has the
 * server check the signature and ask Razorpay. Only the server's answer marks it paid.
 */
import { Platform } from 'react-native'
import RazorpayCheckout from 'react-native-razorpay'
import { ServiceError } from '../errors'
import { api, request } from './http'

interface CheckoutFields {
  keyId: string
  orderId: string
  amount: number
  currency: string
  name: string
  description: string
  customerId?: string
  prefill?: { name?: string | null; contact?: string | null; email?: string | null }
  notes?: Record<string, string>
}

interface PaymentView {
  code: string
  amount: number
  status: 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded' | string
  /** After payment: fulfilled (the purchase went through) or refunded (it couldn't, e.g. the slot was taken). */
  fulfilment?: 'pending' | 'fulfilled' | 'refunded' | null
  failureReason: string | null
  checkout?: CheckoutFields
}

export type PayResult =
  | { status: 'paid' }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: string }
  /** Paid, but the purchase couldn't be completed, so the server refunded it. */
  | { status: 'refunded'; reason: string }
  /** Razorpay hasn't said yet (e.g. a UPI collect request not approved): the server keeps checking. */
  | { status: 'pending' }

const BRAND = '#0068C8'
const POLLS = 6
const POLL_MS = 2000
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Razorpay's SDK codes differ by platform: "closed by the patient" is 0 on Android and 2 on iOS,
 * and a network error is the other way round. Reading both as "cancelled" told people whose
 * connection dropped mid-payment that they had cancelled it.
 */
export function sdkOutcome(e: unknown, os: string = Platform.OS): 'cancelled' | 'network' | 'error' {
  const err = e as { code?: number | string; description?: string; error?: { reason?: string } }
  const codes = os === 'ios' ? { cancelled: 2, network: 0 } : { cancelled: 0, network: 2 }
  const text = `${err?.description ?? ''} ${err?.error?.reason ?? ''}`.toLowerCase()
  if (text.includes('cancel')) return 'cancelled'
  const code = err?.code === undefined || err?.code === '' ? NaN : Number(err.code)
  if (code === codes.cancelled) return 'cancelled'
  if (code === codes.network) return 'network'
  return 'error'
}

export const NETWORK_DROPPED = 'Your connection dropped during the payment. If any money was taken, it confirms itself or is refunded automatically. Please check your connection and try again.'
export const REFUNDED = 'We couldn’t complete this purchase, so the full amount is being refunded to your payment method (usually 5–7 working days).'
export const LAPSED = 'The hold on this purchase expired before the payment, so nothing was charged. Please choose again.'

function sdkReason(e: unknown): string {
  const err = e as { description?: string; error?: { description?: string } }
  const raw = err?.error?.description ?? err?.description
  // The SDK sometimes returns a JSON string as the description.
  if (raw && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { error?: { description?: string } }
      if (parsed.error?.description) return parsed.error.description
    } catch {
      /* fall through */
    }
  }
  return raw || 'The payment didn’t go through.'
}

async function poll(code: string): Promise<PayResult> {
  for (let i = 0; i < POLLS; i++) {
    const v = await api.get<PaymentView>(`patient/payments/${code}`)
    // Money taken but the purchase failed (slot gone, out of stock): say so, never "success".
    if (v.fulfilment === 'refunded') return { status: 'refunded', reason: v.failureReason ? `${v.failureReason} ${REFUNDED}` : REFUNDED }
    // Paid and completed; or paid and still completing (the server finishes it), which isn't worth waiting on.
    if (v.status === 'paid' && (v.fulfilment !== 'pending' || i === POLLS - 1)) return { status: 'paid' }
    if (v.status === 'failed') return { status: 'failed', reason: v.failureReason ?? 'The payment didn’t go through.' }
    if (v.status === 'cancelled') return { status: 'failed', reason: LAPSED }
    await sleep(POLL_MS)
  }
  return { status: 'pending' }
}

/**
 * Whether the held purchase was paid after all (a late UPI or bank confirmation, after the app
 * stopped waiting). Asks for the same payment again (same idempotency key: nothing new is
 * created or charged, and Checkout isn't opened).
 */
export async function paidLater(purposeCode: string, idempotencyKey: string): Promise<'paid' | 'refunded' | null> {
  const v = await request<PaymentView>('POST', 'patient/payments', { purposeCode }, { headers: { 'Idempotency-Key': idempotencyKey } }).catch(() => null)
  if (!v) return null
  if (v.fulfilment === 'refunded') return 'refunded'
  return v.status === 'paid' && v.fulfilment !== 'pending' ? 'paid' : null
}

/**
 * Pays the held purchase `purposeCode` through Razorpay Checkout. `idempotencyKey` stays the same
 * across retries of one purchase, so asking again returns the same payment and order.
 */
export async function payFor(purposeCode: string, idempotencyKey: string): Promise<PayResult> {
  const payment = await request<PaymentView>('POST', 'patient/payments', { purposeCode }, { headers: { 'Idempotency-Key': idempotencyKey } })
  if (payment.status === 'paid') return { status: 'paid' }
  const c = payment.checkout
  if (!c) return poll(payment.code)
  let result: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }
  try {
    result = await RazorpayCheckout.open({
      key: c.keyId,
      order_id: c.orderId,
      amount: c.amount,
      currency: c.currency,
      name: c.name,
      description: c.description,
      ...(c.customerId ? { customer_id: c.customerId } : {}),
      prefill: { name: c.prefill?.name ?? '', contact: c.prefill?.contact ?? '', email: c.prefill?.email ?? '' },
      notes: c.notes ?? {},
      theme: { color: BRAND },
    })
  } catch (e) {
    const outcome = sdkOutcome(e)
    if (outcome === 'cancelled') {
      // UPI apps often report "cancelled" when the patient comes back with Back after paying:
      // one quick look at the server, so a payment that went through is never shown as cancelled.
      const v = await api.get<PaymentView>(`patient/payments/${payment.code}`).catch(() => null)
      if (v?.fulfilment === 'refunded') return { status: 'refunded', reason: v.failureReason ? `${v.failureReason} ${REFUNDED}` : REFUNDED }
      if (v?.status === 'paid') return v.fulfilment === 'pending' ? poll(payment.code) : { status: 'paid' }
      return { status: 'cancelled' }
    }
    // A failed attempt: the server may still learn of a later success (webhook), so ask it.
    const checked = await poll(payment.code).catch(() => null)
    if (checked?.status === 'paid' || checked?.status === 'refunded') return checked
    return { status: 'failed', reason: outcome === 'network' ? NETWORK_DROPPED : sdkReason(e) }
  }
  try {
    await api.post(`patient/payments/${payment.code}/verify`, {
      razorpayOrderId: result.razorpay_order_id,
      razorpayPaymentId: result.razorpay_payment_id,
      razorpaySignature: result.razorpay_signature,
    })
  } catch (e) {
    // The signature didn't check out, or the server couldn't reach Razorpay: its own view decides.
    if (e instanceof ServiceError && e.code === 'session_ended') throw e
  }
  return poll(payment.code)
}
