/**
 * Payments on the backend: history (GET /patient/payments), the spend summary, saved methods
 * (UPI ids added here; cards are saved by Razorpay Checkout), and invoices.
 */
import type { PaymentMethod, PaymentRecord } from '../../types'
import { usePayments, type SpendSummary } from '../../store/payments'
import { showToast } from '../../store/toast'
import { errorMessage } from '../errors'
import { api } from './http'
import { atToDay, num } from './map'

interface RecordView {
  id: string
  type: PaymentRecord['type']
  title: string
  date: string
  amount: number
  status: 'paid' | 'refunded' | 'partially_refunded' | 'failed'
  method: string | null
  ref: string
  refundedAmount: number
  invoiceNumber: string | null
}

interface MethodView {
  id: number
  kind: 'card' | 'upi'
  label: string
  sub: string
  brand: string
  isDefault: boolean
}

export interface InvoiceRow {
  number: string
  issuedAt: string
  purpose: string
  ref: string
  total: number
}

export function toRecord(r: RecordView): PaymentRecord {
  const refunded = r.status === 'refunded'
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    date: atToDay(r.date),
    amount: num(r.amount),
    // A partial refund is still a payment; the amount refunded travels alongside.
    status: refunded ? 'refunded' : r.status === 'failed' ? 'failed' : 'paid',
    method: refunded ? 'Refunded to source' : r.method ?? '',
    ref: r.ref,
    refundedAmount: num(r.refundedAmount),
    invoiceNumber: r.invoiceNumber,
  }
}

const toMethod = (m: MethodView): PaymentMethod => ({ id: String(m.id), kind: m.kind, label: m.label, sub: m.sub, brand: m.brand, isDefault: m.isDefault })

export async function loadPayments() {
  const [page, summary] = await Promise.all([
    api.get<{ rows: RecordView[] }>('patient/payments?limit=50'),
    api.get<SpendSummary>('patient/payments/summary'),
  ])
  usePayments.setState({ ledger: page.rows.map(toRecord), summary })
}

export async function loadMethods() {
  const rows = await api.get<MethodView[]>('patient/payment-methods')
  usePayments.setState({ methods: rows.map(toMethod) })
}

async function adoptMethods(rows: MethodView[]) {
  usePayments.setState({ methods: rows.map(toMethod) })
}

export async function addUpi(vpa: string) {
  try {
    await adoptMethods(await api.post<MethodView[]>('patient/payment-methods/upi', { vpa }))
    showToast('UPI ID saved')
  } catch (e) {
    showToast(errorMessage(e, 'We could not save that UPI ID.'), 'critical')
  }
}

export async function setDefaultMethod(id: string) {
  const r = await api.post<MethodView[] | null>(`patient/payment-methods/${id}/default`, {})
  if (Array.isArray(r)) await adoptMethods(r)
  else await loadMethods()
}

export async function removeMethod(id: string) {
  const r = await api.del<MethodView[] | null>(`patient/payment-methods/${id}`)
  if (Array.isArray(r)) await adoptMethods(r)
  else await loadMethods()
}

export const loadInvoices = () => api.get<InvoiceRow[]>('patient/invoices')
