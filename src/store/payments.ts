import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PaymentMethod, PaymentRecord } from '../types'
import { paymentMethods, payments as seedPayments, paymentSummarySeed } from '../mock-data/mock'
import { persistStorage } from './storage'

/** Non-saved ways to pay offered next to the saved instruments. */
export const NET_BANKING: PaymentMethod = { id: 'netbanking', kind: 'netbanking', label: 'Net banking', sub: 'All major Indian banks', brand: 'Bank' }
export const WALLET: PaymentMethod = { id: 'wallet', kind: 'wallet', label: 'KDC+ Wallet', sub: 'Balance ₹0', brand: 'Wallet' }
export const CASH_ON_DELIVERY: PaymentMethod = { id: 'cod', kind: 'cod', label: 'Cash on delivery', sub: 'Pay the delivery partner directly', brand: 'Cash' }

interface PaymentsState {
  methods: PaymentMethod[]
  selectedMethodId: string
  ledger: PaymentRecord[]
  select: (id: string) => void
  addUpi: (upiId: string) => void
  addCard: (last4: string, expiry: string, name: string) => void
  addRecord: (record: Omit<PaymentRecord, 'id'>) => void
  markRefunded: (ref: string) => void
  reset: () => void
}

const seed = { methods: paymentMethods, selectedMethodId: paymentMethods[0].id, ledger: seedPayments }

let serial = 0
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${serial++}`

export const usePayments = create<PaymentsState>()(
  persist(
    (set) => ({
      ...seed,
      select: (selectedMethodId) => set({ selectedMethodId }),
      addUpi: (upiId) =>
        set((s) => {
          const id = uid('pm')
          return { methods: [...s.methods, { id, kind: 'upi', label: upiId, sub: 'Added just now', brand: 'UPI' }], selectedMethodId: id }
        }),
      addCard: (last4, expiry, name) =>
        set((s) => {
          const id = uid('pm')
          return {
            methods: [...s.methods, { id, kind: 'card', label: name, sub: `•••• •••• •••• ${last4} · Exp ${expiry}`, brand: 'Card' }],
            selectedMethodId: id,
          }
        }),
      addRecord: (record) => set((s) => ({ ledger: [{ ...record, id: uid('pay') }, ...s.ledger] })),
      markRefunded: (ref) =>
        set((s) => ({ ledger: s.ledger.map((p) => (p.ref === ref ? { ...p, status: 'refunded', method: 'Refunded to source' } : p)) })),
      reset: () => set(seed),
    }),
    { name: 'payments', storage: persistStorage },
  ),
)

export function methodById(methods: PaymentMethod[], id: string): PaymentMethod {
  return [...methods, NET_BANKING, WALLET, CASH_ON_DELIVERY].find((m) => m.id === id) ?? methods[0]
}

export function describeMethod(method: PaymentMethod): string {
  if (method.kind === 'upi') return `UPI · ${method.label}`
  if (method.kind === 'card') return `${method.label} ${method.sub.split(' · ')[0].slice(-9)}`
  return method.label
}

/** Spend per stream: the blueprint's baselines plus what was paid in the app. */
export function spendSummary(ledger: PaymentRecord[]) {
  const added = ledger.filter((p) => !seedPayments.some((s) => s.id === p.id) && p.status === 'paid')
  const sum = (type: PaymentRecord['type']) => added.filter((p) => p.type === type).reduce((n, p) => n + p.amount, 0)
  return {
    consultations: paymentSummarySeed.consultations + sum('Consultation'),
    pharmacy: paymentSummarySeed.pharmacy + sum('Pharmacy'),
    diagnostics: paymentSummarySeed.diagnostics + sum('Diagnostics'),
  }
}
