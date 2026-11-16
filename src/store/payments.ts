import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PaymentMethod, PaymentRecord } from '../types'
import { paymentMethods, payments as seedPayments, paymentSummarySeed } from '../mock-data/mock'
import { LIVE } from '../services/config'
import { persistStorage } from './storage'

/** Non-saved ways to pay offered next to the saved instruments. */
export const NET_BANKING: PaymentMethod = { id: 'netbanking', kind: 'netbanking', label: 'Net banking', sub: 'All major Indian banks', brand: 'Bank' }
export const WALLET: PaymentMethod = { id: 'wallet', kind: 'wallet', label: 'KDC+ Wallet', sub: 'Balance ₹0', brand: 'Wallet' }
export const CASH_ON_DELIVERY: PaymentMethod = { id: 'cod', kind: 'cod', label: 'Cash on delivery', sub: 'Pay the delivery partner directly', brand: 'Cash' }
/** Live: Razorpay Checkout, where the patient chooses UPI, a card, net banking or a wallet. */
export const PAY_ONLINE: PaymentMethod = { id: 'online', kind: 'online', label: 'Pay online', sub: 'UPI, cards, net banking or wallets · secured by Razorpay', brand: 'Razorpay' }
/** Live, lab tests: pay the technician (or the lab) at collection; the same switch as cash on delivery. */
export const PAY_AT_COLLECTION: PaymentMethod = { ...CASH_ON_DELIVERY, label: 'Pay at collection', sub: 'Cash or UPI to the technician or at the lab' }

/** Live: spend per area from the server (net of refunds). */
export interface SpendSummary {
  consultations: number
  pharmacy: number
  diagnostics: number
  membership: number
  total: number
}

interface PaymentsState {
  methods: PaymentMethod[]
  selectedMethodId: string
  ledger: PaymentRecord[]
  /** Live: the server's summary; null in demo (computed from the ledger). */
  summary: SpendSummary | null
  select: (id: string) => void
  /** Live: saved on the server (resolves once the list has reloaded). */
  addUpi: (upiId: string) => void | Promise<void>
  addCard: (last4: string, expiry: string, name: string) => void
  addRecord: (record: Omit<PaymentRecord, 'id'>) => void
  markRefunded: (ref: string) => void
  /** Live: saved methods on the server. */
  setDefault: (id: string) => Promise<void>
  removeMethod: (id: string) => Promise<void>
  reset: () => void
}

const seed = LIVE
  ? { methods: [] as PaymentMethod[], selectedMethodId: PAY_ONLINE.id, ledger: [] as PaymentRecord[], summary: null }
  : { methods: paymentMethods, selectedMethodId: paymentMethods[0].id, ledger: seedPayments, summary: null }

const live = () => require('../services/live/payments') as typeof import('../services/live/payments')

let serial = 0
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${serial++}`

export const usePayments = create<PaymentsState>()(
  persist(
    (set) => ({
      ...seed,
      select: (selectedMethodId) => set({ selectedMethodId }),
      addUpi: (upiId) => {
        if (LIVE) return live().addUpi(upiId)
        set((s) => {
          const id = uid('pm')
          return { methods: [...s.methods, { id, kind: 'upi', label: upiId, sub: 'Added just now', brand: 'UPI' }], selectedMethodId: id }
        })
      },
      addCard: (last4, expiry, name) =>
        set((s) => {
          const id = uid('pm')
          return {
            methods: [...s.methods, { id, kind: 'card', label: name, sub: `•••• •••• •••• ${last4} · Exp ${expiry}`, brand: 'Card' }],
            selectedMethodId: id,
          }
        }),
      addRecord: (record) => set((s) => ({ ledger: [{ ...record, id: uid('pay') }, ...s.ledger] })),
      setDefault: (id) => live().setDefaultMethod(id),
      removeMethod: (id) => live().removeMethod(id),
      markRefunded: (ref) => {
        // Live: the server records the refund; reload the history rather than guessing it.
        if (LIVE) {
          live().loadPayments().catch(() => undefined)
          return
        }
        set((s) => ({ ledger: s.ledger.map((p) => (p.ref === ref ? { ...p, status: 'refunded', method: 'Refunded to source' } : p)) }))
      },
      reset: () => set(seed),
    }),
    { name: 'payments', storage: persistStorage },
  ),
)

export function methodById(methods: PaymentMethod[], id: string): PaymentMethod {
  return [...methods, NET_BANKING, WALLET, CASH_ON_DELIVERY, PAY_ONLINE].find((m) => m.id === id) ?? methods[0] ?? PAY_ONLINE
}

export function describeMethod(method: PaymentMethod): string {
  if (method.kind === 'upi') return `UPI · ${method.label}`
  if (method.kind === 'card') return `${method.label} ${method.sub.split(' · ')[0].slice(-9)}`
  return method.label
}

/** Spend per stream: the blueprint's baselines plus what was paid in the app. */
export function spendSummary(ledger: PaymentRecord[], server?: SpendSummary | null) {
  if (server) return { consultations: server.consultations, pharmacy: server.pharmacy, diagnostics: server.diagnostics }
  const added = ledger.filter((p) => !seedPayments.some((s) => s.id === p.id) && p.status === 'paid')
  const sum = (type: PaymentRecord['type']) => added.filter((p) => p.type === type).reduce((n, p) => n + p.amount, 0)
  return {
    consultations: paymentSummarySeed.consultations + sum('Consultation'),
    pharmacy: paymentSummarySeed.pharmacy + sum('Pharmacy'),
    diagnostics: paymentSummarySeed.diagnostics + sum('Diagnostics'),
  }
}
