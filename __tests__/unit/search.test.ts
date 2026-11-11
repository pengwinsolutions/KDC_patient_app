import {
  listingTitle,
  NO_FILTERS,
  searchDoctors,
  SHEET_DEFAULTS,
  type DoctorQuery,
} from '../../src/domain/doctorSearch'
import { cartSubtotal, cheapestLabPrice, rxCoverage, searchMedicines, searchPrescriptions, searchReports, searchTests, sortLabs } from '../../src/domain/catalogue'
import { doctors, labReports, labTests, labs, medicines, prescription, prescriptionHistory } from '../../src/mock-data/mock'

const q = (over: Partial<DoctorQuery>): DoctorQuery => ({ text: '', filters: NO_FILTERS, sort: 'Relevance', ...over })
const names = (list: { name: string }[]) => list.map((d) => d.name)

describe('doctor search', () => {
  it('returns every doctor with no query', () => {
    expect(searchDoctors(doctors, q({}))).toHaveLength(8)
  })

  it('matches name, specialty and locality, ignoring filler words', () => {
    expect(names(searchDoctors(doctors, q({ text: 'Sanjay' })))).toEqual(['Dr. Sanjay Iyer'])
    expect(names(searchDoctors(doctors, q({ text: 'Paediatrician near me' })))).toEqual(['Dr. Kavya Nair'])
    expect(searchDoctors(doctors, q({ text: 'Gachibowli' }))).toHaveLength(1)
  })

  it('returns nothing when any word fails to match', () => {
    expect(searchDoctors(doctors, q({ text: 'Cardiologist in Kompally' }))).toHaveLength(0)
  })

  it('filters by browse specialty', () => {
    const list = searchDoctors(doctors, q({ filters: { ...NO_FILTERS, specialty: 'Cardiology' } }))
    expect(names(list)).toEqual(['Dr. Arjun Mehta'])
  })

  it('applies experience, gender, language, distance, availability', () => {
    const f = NO_FILTERS
    expect(searchDoctors(doctors, q({ filters: { ...f, experience: '15+ yrs' } })).every((d) => d.experience >= 15)).toBe(true)
    expect(searchDoctors(doctors, q({ filters: { ...f, gender: 'Female' } })).every((d) => d.gender === 'Female')).toBe(true)
    expect(searchDoctors(doctors, q({ filters: { ...f, languages: ['Telugu', 'Tamil'] } })).map((d) => d.id)).toEqual(['d5', 'd8'])
    expect(searchDoctors(doctors, q({ filters: { ...f, distance: 'Within 5 km' } })).every((d) => d.distanceKm <= 5)).toBe(true)
    expect(searchDoctors(doctors, q({ filters: { ...f, availability: 'Today' } })).every((d) => d.availableToday)).toBe(true)
  })

  it('narrows the fee slider, with no upper limit at its ceiling', () => {
    const low = searchDoctors(doctors, q({ filters: { ...NO_FILTERS, feeMin: 180, feeMax: 500, mode: 'video' } }))
    expect(low.every((d) => d.fees.video <= 500)).toBe(true)
    const all = searchDoctors(doctors, q({ filters: { ...NO_FILTERS, feeMax: 1200, mode: 'clinic' } }))
    expect(all.some((d) => d.fees.clinic >= 1200)).toBe(true)
  })

  it('applies the sheet defaults to a single cardiologist', () => {
    expect(names(searchDoctors(doctors, q({ filters: SHEET_DEFAULTS })))).toEqual(['Dr. Arjun Mehta'])
  })

  it('sorts by rating, experience, fee and distance', () => {
    expect(searchDoctors(doctors, q({ sort: 'Rating' }))[0].rating).toBe(4.9)
    expect(searchDoctors(doctors, q({ sort: 'Experience' }))[0].id).toBe('d7')
    expect(searchDoctors(doctors, q({ sort: 'Fee: low to high' }))[0].id).toBe('d5')
    expect(searchDoctors(doctors, q({ sort: 'Distance' }))[0].id).toBe('d4')
  })

  it('builds a title from what narrowed the list', () => {
    expect(listingTitle(q({ filters: { ...NO_FILTERS, specialty: 'Cardiology' } }))).toBe('Cardiologists')
    expect(listingTitle(q({ text: 'Thyroid' }))).toBe('Results for “Thyroid”')
    expect(listingTitle(q({}))).toBe('All doctors')
  })
})

describe('medicine search', () => {
  it('matches all eight tablets for "tab"', () => {
    expect(searchMedicines(medicines, { text: 'tab', filter: 'All' })).toHaveLength(8)
  })

  it('filters by prescription, OTC, stock and price', () => {
    expect(searchMedicines(medicines, { text: '', filter: 'Prescription' }).every((m) => m.rx)).toBe(true)
    expect(searchMedicines(medicines, { text: '', filter: 'Over the counter' }).every((m) => !m.rx)).toBe(true)
    expect(searchMedicines(medicines, { text: '', filter: 'In stock' })).toHaveLength(7)
    expect(searchMedicines(medicines, { text: '', filter: 'Under ₹200' }).every((m) => m.price < 200)).toBe(true)
  })

  it('narrows by category', () => {
    const list = searchMedicines(medicines, { text: '', filter: 'All', category: 'Vitamins & Supplements' })
    expect(list.map((m) => m.id)).toEqual(['m6', 'm7'])
  })

  it('finds nothing for a nonsense query', () => {
    expect(searchMedicines(medicines, { text: 'zzzz', filter: 'All' })).toHaveLength(0)
  })
})

describe('Rx coverage', () => {
  const seed = [
    { medicineId: 'm1', qty: 1 },
    { medicineId: 'm2', qty: 1 },
    { medicineId: 'm3', qty: 2 },
  ]
  const kdc = { source: 'kdc' as const, label: 'x' }

  it('passes the seeded cart against its KDC prescription', () => {
    expect(rxCoverage(seed, medicines, kdc, prescription.medicines)).toEqual({ required: true, covered: true, missing: [] })
  })

  it('needs nothing for an OTC-only cart', () => {
    expect(rxCoverage([{ medicineId: 'm4', qty: 1 }], medicines, null, []).required).toBe(false)
  })

  it('flags an Rx item with no prescription', () => {
    const r = rxCoverage([{ medicineId: 'm1', qty: 1 }], medicines, null, prescription.medicines)
    expect(r.covered).toBe(false)
    expect(r.missing.map((m) => m.id)).toEqual(['m1'])
  })

  it('flags Rx items a KDC prescription does not list', () => {
    const r = rxCoverage([{ medicineId: 'm5', qty: 1 }], medicines, kdc, prescription.medicines)
    expect(r.missing.map((m) => m.id)).toEqual(['m5'])
  })

  it('accepts an upload for anything', () => {
    const r = rxCoverage([{ medicineId: 'm5', qty: 1 }], medicines, { source: 'upload', label: 'f', uploadId: 'u' }, [])
    expect(r.covered).toBe(true)
  })

  it('totals the cart', () => {
    expect(cartSubtotal(seed, medicines)).toBe(327)
  })
})

describe('test search', () => {
  it('filters by text and chips', () => {
    expect(searchTests(labTests, { text: 'profile', filter: 'All' }).map((t) => t.id)).toEqual(['t2', 't4'])
    expect(searchTests(labTests, { text: '', filter: 'No fasting' }).every((t) => t.fasting === 'Not required')).toBe(true)
    expect(searchTests(labTests, { text: '', filter: 'Under ₹700' }).every((t) => t.price < 700)).toBe(true)
  })

  it('narrows by category', () => {
    expect(searchTests(labTests, { text: '', filter: 'All', category: 'Thyroid' }).map((t) => t.id)).toEqual(['t4'])
  })

  it('finds the cheapest lab price for a test', () => {
    expect(cheapestLabPrice(labTests[1], labs)).toBe(611)
  })
})

describe('lab sort', () => {
  it('sorts by distance, price and rating', () => {
    expect(sortLabs(labs, 'Nearest').map((l) => l.id)).toEqual(['l1', 'l2', 'l3', 'l4'])
    expect(sortLabs(labs, 'Lowest price')[0].id).toBe('l4')
    expect(sortLabs(labs, 'Highest rated')[0].id).toBe('l1')
  })
})

describe('reports and prescriptions', () => {
  it('filters reports', () => {
    expect(searchReports(labReports, 'lipid', 'All')).toHaveLength(1)
    expect(searchReports(labReports, '', 'Imaging').every((r) => r.kind === 'imaging')).toBe(true)
    expect(searchReports(labReports, '', 'Needs attention').every((r) => r.flagged > 0)).toBe(true)
  })

  it('searches and segments prescriptions', () => {
    const name = () => 'Dr. Arjun Mehta'
    expect(searchPrescriptions(prescriptionHistory, name, '', 'active')).toHaveLength(1)
    expect(searchPrescriptions(prescriptionHistory, name, '', 'past')).toHaveLength(3)
    expect(searchPrescriptions(prescriptionHistory, name, 'mehta', 'all')).toHaveLength(4)
    expect(searchPrescriptions(prescriptionHistory, name, 'nothing', 'all')).toHaveLength(0)
  })
})
