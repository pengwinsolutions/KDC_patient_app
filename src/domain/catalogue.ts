import type { CartLine, CartPrescription, Lab, LabTest, Medicine, PatientReport, PrescribedMedicine, PrescriptionSummary } from '../types'
import { labTestPrice } from './pricing'
import { MOCK_TODAY } from './schedule'

const matches = (values: string[], text: string) => {
  const needle = text.trim().toLowerCase()
  return !needle || values.some((v) => v.toLowerCase().includes(needle))
}

/* --------------------------------------------------------------- Medicines */

export type MedicineFilter = 'All' | 'Prescription' | 'Over the counter' | 'In stock' | 'Under ₹200'

export interface MedicineQuery {
  text: string
  filter: MedicineFilter
  category?: string
}

export function searchMedicines(medicines: Medicine[], q: MedicineQuery): Medicine[] {
  return medicines.filter((m) => {
    if (!matches([m.name, m.generic, m.brand, m.category], q.text)) return false
    if (q.category && !q.category.toLowerCase().startsWith(m.category.toLowerCase().split(' ')[0])) return false
    switch (q.filter) {
      case 'Prescription':
        return m.rx
      case 'Over the counter':
        return !m.rx
      case 'In stock':
        return m.inStock
      case 'Under ₹200':
        return m.price < 200
      default:
        return true
    }
  })
}

/* ------------------------------------------------------------------- Cart */

/** A KDC+ prescription only covers what it lists; an upload is verified whole. */
export function rxCoverage(
  lines: CartLine[],
  medicines: Medicine[],
  prescription: CartPrescription | null,
  prescribed: PrescribedMedicine[],
): { required: boolean; covered: boolean; missing: Medicine[] } {
  const rxInCart = lines
    .map((l) => medicines.find((m) => m.id === l.medicineId))
    .filter((m): m is Medicine => Boolean(m?.rx))
  if (!rxInCart.length) return { required: false, covered: true, missing: [] }
  if (prescription?.source === 'upload') return { required: true, covered: true, missing: [] }
  const missing =
    prescription?.source === 'kdc'
      ? rxInCart.filter((m) => !prescribed.some((p) => p.name === m.name))
      : rxInCart
  return { required: true, covered: missing.length === 0, missing }
}

export const cartSubtotal = (lines: CartLine[], medicines: Medicine[]) =>
  lines.reduce((sum, l) => sum + (medicines.find((m) => m.id === l.medicineId)?.price ?? 0) * l.qty, 0)

/* ------------------------------------------------------------- Diagnostics */

export type TestFilter = 'All' | 'Home collection' | 'No fasting' | 'Under ₹700' | 'Same-day report'

export interface TestQuery {
  text: string
  filter: TestFilter
  category?: string
}

export function searchTests(tests: LabTest[], q: TestQuery): LabTest[] {
  return tests.filter((t) => {
    if (!matches([t.name, t.short, t.category], q.text)) return false
    if (q.category && t.category !== q.category) return false
    switch (q.filter) {
      case 'Home collection':
        return t.homeCollection
      case 'No fasting':
        return t.fasting === 'Not required'
      case 'Under ₹700':
        return t.price < 700
      case 'Same-day report':
        return parseInt(t.reportIn, 10) <= 12
      default:
        return true
    }
  })
}

export type LabSort = 'Nearest' | 'Lowest price' | 'Highest rated' | 'Fastest report'

export function sortLabs(labs: Lab[], sort: LabSort): Lab[] {
  const sorted = [...labs]
  if (sort === 'Nearest') return sorted.sort((a, b) => a.distanceKm - b.distanceKm)
  if (sort === 'Lowest price') return sorted.sort((a, b) => a.price - b.price)
  if (sort === 'Highest rated') return sorted.sort((a, b) => b.rating - a.rating)
  /* More open slots means the sample reaches the bench sooner. */
  return sorted.sort((a, b) => b.slots - a.slots)
}

/**
 * A lab's price for a test. Live: the lab's own price for it (GET /public/labs?tests=), or the
 * test's listed price until the labs have loaded. Demo: proportional to the lab's reference rate.
 */
export function labPriceFor(test: LabTest, lab: Lab): number {
  if (lab.testPrices) return lab.testPrices[test.id] ?? test.price
  return labTestPrice(test.price, lab.price)
}

export function cheapestLabPrice(test: LabTest, labs: Lab[]): number {
  const prices = labs.filter((l) => !l.testPrices || test.id in l.testPrices).map((l) => labPriceFor(test, l))
  return prices.length ? Math.min(...prices) : test.price
}

export type ReportFilter = 'All' | 'Blood tests' | 'Imaging' | 'Needs attention' | 'This year'

export function searchReports(reports: PatientReport[], text: string, filter: ReportFilter): PatientReport[] {
  return reports.filter((r) => {
    if (!matches([r.name, r.lab], text)) return false
    if (filter === 'Blood tests') return r.kind === 'blood'
    if (filter === 'Imaging') return r.kind === 'imaging'
    if (filter === 'Needs attention') return r.flagged > 0
    if (filter === 'This year') return r.month.endsWith(String(MOCK_TODAY.year))
    return true
  })
}

/* ----------------------------------------------------------- Prescriptions */

export function searchPrescriptions(
  items: PrescriptionSummary[],
  doctorName: (id: string) => string,
  text: string,
  segment: 'all' | 'active' | 'past',
): PrescriptionSummary[] {
  return items.filter((p) => {
    if (segment === 'active' && p.status !== 'active') return false
    if (segment === 'past' && p.status === 'active') return false
    return matches([doctorName(p.doctorId), p.specialty, p.date, p.rxId], text)
  })
}
