import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DiagnosticOrder, PharmacyOrder } from '../types'
import { diagnosticOrders, pharmacyOrders } from '../mock-data/mock'
import { services } from '../services'
import { LIVE } from '../services/config'
import { persistStorage } from './storage'

interface OrdersState {
  pharmacy: PharmacyOrder[]
  diagnostics: DiagnosticOrder[]
  lastDiagnosticId: string | null
  addPharmacy: (order: PharmacyOrder) => void
  addDiagnostic: (order: DiagnosticOrder) => void
  /** Live: everything from the server (newest first), replacing what was loaded. */
  setAll: (pharmacy: PharmacyOrder[], diagnostics: DiagnosticOrder[]) => void
  /** Live: one order or booking, as the server has it now. */
  upsertPharmacy: (order: PharmacyOrder) => void
  upsertDiagnostic: (order: DiagnosticOrder) => void
  cancelDiagnostic: (id: string) => Promise<void>
  reset: () => void
}

/** Live: nothing until the server's orders load. */
const seed = LIVE
  ? { pharmacy: [] as PharmacyOrder[], diagnostics: [] as DiagnosticOrder[], lastDiagnosticId: null }
  : { pharmacy: pharmacyOrders, diagnostics: diagnosticOrders, lastDiagnosticId: null }

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list]

export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      ...seed,
      addPharmacy: (order) => set((s) => ({ pharmacy: [order, ...s.pharmacy] })),
      addDiagnostic: (order) => set((s) => ({ diagnostics: [order, ...s.diagnostics], lastDiagnosticId: order.id })),
      setAll: (pharmacy, diagnostics) => set({ pharmacy, diagnostics }),
      upsertPharmacy: (order) => set((s) => ({ pharmacy: upsert(s.pharmacy, order) })),
      upsertDiagnostic: (order) => set((s) => ({ diagnostics: upsert(s.diagnostics, order), lastDiagnosticId: order.id })),
      cancelDiagnostic: async (id) => {
        if (LIVE) {
          const { cancelLabBooking } = require('../services/live/diagnostics') as typeof import('../services/live/diagnostics')
          const cancelled = await cancelLabBooking(id)
          set((s) => ({ diagnostics: upsert(s.diagnostics, cancelled) }))
          return
        }
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

/** Live: what a tracking screen shows before its order has loaded. Blank, never a demo order. */
export const NO_PHARMACY_ORDER: PharmacyOrder = {
  id: '', kind: 'pharmacy', placedAt: 0, placed: '', eta: '', etaWhen: '', lines: [], amount: 0, address: '', partner: '',
  rider: { name: '', mobile: '' }, fixedStage: 0, payment: '',
}
export const NO_DIAGNOSTIC_ORDER: DiagnosticOrder = {
  id: '', kind: 'diagnostics', placedAt: 0, testId: '', labId: '', method: 'Home Collection', date: '', slot: '', slotCompact: '',
  address: '', technician: { name: '', id: '', mobile: '' }, amount: 0, fixedStage: 0, status: 'active',
}

export function pharmacyOrderById(orders: PharmacyOrder[], id: string | undefined): PharmacyOrder {
  if (LIVE) return orders.find((o) => o.id === id) ?? NO_PHARMACY_ORDER
  return orders.find((o) => o.id === id) ?? orders.find((o) => o.id === 'KDC-PH-99421') ?? orders[0]
}

export function diagnosticOrderById(orders: DiagnosticOrder[], id: string | undefined): DiagnosticOrder {
  if (LIVE) return orders.find((o) => o.id === id) ?? NO_DIAGNOSTIC_ORDER
  return orders.find((o) => o.id === id) ?? orders.find((o) => o.id === 'KDC-DX-77215') ?? orders[0]
}
