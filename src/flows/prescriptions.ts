import { useCart } from '../store/cart'
import { useCatalog } from '../store/catalog'
import type { PrescriptionDoc } from '../types'

/** Puts everything on a prescription in the cart, linked to that prescription. */
export function orderPrescription(doc: PrescriptionDoc, doctorName: string) {
  const { medicines } = useCatalog.getState()
  const ids = doc.medicines
    .map((p) => medicines.find((m) => m.name === p.name)?.id)
    .filter((id): id is string => Boolean(id))
  useCart.getState().addPrescribed(ids, { source: 'kdc', label: `${doctorName} · ${doc.id}` })
}
