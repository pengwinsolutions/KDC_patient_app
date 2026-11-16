/**
 * Paying for a purchase the server is holding: POST /patient/payments creates (or returns) its
 * Razorpay order, Razorpay Checkout takes the payment in its own native screen (UPI, cards, net
 * banking, wallets; card details never touch KDC+), and POST /patient/payments/:code/verify has the
 * server check the signature and ask Razorpay. Only the server's answer marks it paid.
 */
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
  status: 'created' | 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded' | string
  failureReason: string | null
  checkout?: CheckoutFields
}

export type PayResult =
  | { status: 'paid' }
  | { status: 'cancelled' }
  | { status: 'failed'; reason: string }
  /** Razorpay hasn't said yet (e.g. a UPI collect request not approved): the server keeps checking. */
  | { status: 'pending' }

const BRAND = '#0068C8'
const POLLS = 6
const POLL_MS = 2000
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** The SDK's "closed by the patient" (Razorpay's PAYMENT_CANCELLED, code 0 on Android, 2 on iOS). */
function isCancel(e: unknown): boolean {
  const err = e as { code?: number | string; description?: string; error?: { reason?: string } }
  const text = `${err?.description ?? ''} ${err?.error?.reason ?? ''}`.toLowerCase()
  return err?.code === 0 || err?.code === 2 || err?.code === '0' || err?.code === '2' || text.includes('cancel')
}

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
    if (v.status === 'paid') return { status: 'paid' }
    if (v.status === 'failed') return { status: 'failed', reason: v.failureReason ?? 'The payment didn’t go through.' }
    await sleep(POLL_MS)
  }
  return { status: 'pending' }
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
    if (isCancel(e)) return { status: 'cancelled' }
    // A failed attempt: the server may still learn of a later success (webhook), so ask it.
    const checked = await poll(payment.code).catch(() => null)
    if (checked?.status === 'paid') return checked
    return { status: 'failed', reason: sdkReason(e) }
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
