import { useCart } from '../store/cart'
import { useCatalog } from '../store/catalog'
import { LIVE } from '../services/config'
import type { Medicine, PrescriptionDoc } from '../types'

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Live: the catalogue entry for a prescribed medicine. Prescriptions name the medicine (the
 * server's item carries a numeric catalogue id the public catalogue doesn't expose), so it's
 * looked up by name; medicines that aren't sold are left out of the cart.
 */
async function findMedicine(name: string): Promise<Medicine | undefined> {
  const known = useCatalog.getState().medicines.find((m) => same(m.name, name))
  if (known) return known
  const { searchMedicines } = require('../services/live/pharmacy') as typeof import('../services/live/pharmacy')
  const found = await searchMedicines({ text: name, filter: 'All' }).catch(() => [] as Medicine[])
  return found.find((m) => same(m.name, name))
}

/** Puts everything on a prescription in the cart, linked to that prescription. */
export async function orderPrescription(doc: PrescriptionDoc, doctorName: string): Promise<void> {
  if (LIVE) {
    const found = await Promise.all(doc.medicines.map((p) => findMedicine(p.name)))
    const ids = found.filter((m): m is Medicine => Boolean(m)).map((m) => m.id)
    useCart.getState().addPrescribed(ids, { source: 'kdc', label: `${doctorName} · ${doc.id}`, code: doc.id })
    return
  }
  const { medicines } = useCatalog.getState()
  const ids = doc.medicines
    .map((p) => medicines.find((m) => m.name === p.name)?.id)
    .filter((id): id is string => Boolean(id))
  useCart.getState().addPrescribed(ids, { source: 'kdc', label: `${doctorName} · ${doc.id}` })
}
