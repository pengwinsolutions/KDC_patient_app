import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine, CartPrescription } from '../types'
import { seedCart } from '../mock-data/mock'
import { persistStorage } from './storage'

interface CartState {
  lines: CartLine[]
  prescription: CartPrescription | null
  add: (medicineId: string, qty?: number) => void
  setQty: (medicineId: string, qty: number) => void
  remove: (medicineId: string) => void
  /** Ensures each medicine is present, keeping quantities already chosen. */
  addPrescribed: (medicineIds: string[], prescription: CartPrescription) => void
  attachPrescription: (prescription: CartPrescription) => void
  clearPrescriptionIf: (uploadId: string) => void
  clear: () => void
  reset: () => void
}

const seed = {
  lines: seedCart.lines,
  prescription: { source: 'kdc', label: seedCart.prescriptionLabel } as CartPrescription,
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      ...seed,
      add: (medicineId, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.medicineId === medicineId)
          return {
            lines: existing
              ? s.lines.map((l) => (l.medicineId === medicineId ? { medicineId, qty: l.qty + qty } : l))
              : [...s.lines, { medicineId, qty }],
          }
        }),
      setQty: (medicineId, qty) =>
        set((s) => ({
          lines:
            qty <= 0
              ? s.lines.filter((l) => l.medicineId !== medicineId)
              : s.lines.map((l) => (l.medicineId === medicineId ? { medicineId, qty } : l)),
        })),
      remove: (medicineId) => set((s) => ({ lines: s.lines.filter((l) => l.medicineId !== medicineId) })),
      addPrescribed: (medicineIds, prescription) =>
        set((s) => ({
          prescription,
          lines: [
            ...s.lines,
            ...medicineIds.filter((id) => !s.lines.some((l) => l.medicineId === id)).map((medicineId) => ({ medicineId, qty: 1 })),
          ],
        })),
      attachPrescription: (prescription) => set({ prescription }),
      clearPrescriptionIf: (uploadId) =>
        set((s) =>
          s.prescription?.source === 'upload' && s.prescription.uploadId === uploadId ? { prescription: null } : s,
        ),
      clear: () => set({ lines: [], prescription: null }),
      reset: () => set(seed),
    }),
    { name: 'cart', storage: persistStorage },
  ),
)

/** Quantity to show on list cards; a first-launch line keeps its Add button. */
export const useListQty = (medicineId: string) =>
  useCart((s) => {
    const line = s.lines.find((l) => l.medicineId === medicineId)
    return line && !line.seeded ? line.qty : undefined
  })
