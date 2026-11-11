import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DiagnosticOrder, PharmacyOrder } from '../types'
import { diagnosticOrders, pharmacyOrders } from '../mock-data/mock'
import { services } from '../services'
import { persistStorage } from './storage'

interface OrdersState {
  pharmacy: PharmacyOrder[]
  diagnostics: DiagnosticOrder[]
  lastDiagnosticId: string | null
  addPharmacy: (order: PharmacyOrder) => void
  addDiagnostic: (order: DiagnosticOrder) => void
  cancelDiagnostic: (id: string) => Promise<void>
  reset: () => void
}

const seed = { pharmacy: pharmacyOrders, diagnostics: diagnosticOrders, lastDiagnosticId: null }

export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      ...seed,
      addPharmacy: (order) => set((s) => ({ pharmacy: [order, ...s.pharmacy] })),
      addDiagnostic: (order) => set((s) => ({ diagnostics: [order, ...s.diagnostics], lastDiagnosticId: order.id })),
      cancelDiagnostic: async (id) => {
        const order = get().diagnostics.find((o) => o.id === id)
        if (!order) throw new Error(`Unknown order ${id}`)
        const cancelled = await services.diagnostics.cancel(order)
        set((s) => ({ diagnostics: s.diagnostics.map((o) => (o.id === id ? cancelled : o)) }))
      },
      reset: () => set(seed),
    }),
    { name: 'orders', storage: persistStorage },
  ),
)

export function pharmacyOrderById(orders: PharmacyOrder[], id: string | undefined): PharmacyOrder {
  return orders.find((o) => o.id === id) ?? orders.find((o) => o.id === 'KDC-PH-99421') ?? orders[0]
}

export function diagnosticOrderById(orders: DiagnosticOrder[], id: string | undefined): DiagnosticOrder {
  return orders.find((o) => o.id === id) ?? orders.find((o) => o.id === 'KDC-DX-77215') ?? orders[0]
}
