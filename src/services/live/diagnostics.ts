/**
 * Live diagnostics: the test catalogue (/public/lab-tests, /public/test-categories), labs that
 * price the chosen tests (/public/labs?tests=), collection slots (/public/lab-slots) and the
 * patient's lab bookings (/patient/diagnostics/bookings). Test, lab and booking codes are the ids.
 */
import { create } from 'zustand'
import type { CollectionMethod, DiagnosticOrder, Lab, LabTest, TestCategory, TestDetail } from '../../types'
import type { TestFilter, TestQuery } from '../../domain/catalogue'
import { collectionWindow, formatShortYear, from24h, fromIso, type CalendarDate, type Period, type SlotView } from '../../domain/schedule'
import { SCENE } from '../../mock-data/media'
import { mergeCatalog, useCatalog } from '../../store/catalog'
import { api, qs } from './http'
import { atToDay, atToTime, num } from './map'
import { addressLine, type ApiAddressSnapshot } from './pharmacy'

export interface ApiLabTest {
  code: string
  name: string
  shortName: string
  category: { name: string; slug: string } | null
  parameters: number
  mrp: number | string
  price: number | string
  discountPct: number
  fasting: string
  reportHours: number
  homeCollection: boolean
  sampleTypes: string[]
  description?: string | null
  prep?: string[]
  covers?: string[]
  audience?: string[]
}

interface Page<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

const hours = (h: number) => `${h} ${h === 1 ? 'hour' : 'hours'}`

export function toLabTest(t: ApiLabTest): LabTest {
  return {
    id: t.code,
    name: t.name,
    short: t.shortName,
    parameters: t.parameters,
    price: num(t.price),
    mrp: num(t.mrp),
    fasting: t.fasting,
    reportIn: hours(t.reportHours),
    homeCollection: t.homeCollection,
    category: t.category?.name ?? '',
    description: t.description ?? '',
    prep: t.prep ?? [],
  }
}

/** What a test covers and who it's for, loaded when its page opens. */
export const useTestDetails = create<{ byCode: Record<string, TestDetail> }>(() => ({ byCode: {} }))

const FILTER: Record<TestFilter, string> = {
  All: 'all',
  'Home collection': 'home_collection',
  'No fasting': 'no_fasting',
  'Under ₹700': 'under_700',
  'Same-day report': 'same_day',
}

const categorySlug = (name?: string) =>
  name ? useCatalog.getState().testCategories.find((c) => c.name === name || c.id === name)?.id ?? name : undefined

export async function searchTests(q: TestQuery): Promise<LabTest[]> {
  const page = await api.pub<Page<ApiLabTest>>(
    `public/lab-tests${qs({ q: q.text.trim(), category: categorySlug(q.category), filter: FILTER[q.filter], limit: 50 })}`,
  )
  // The list omits descriptions; keep any already loaded from a test's page.
  const known = useCatalog.getState().labTests
  const list = page.rows.map((r) => {
    const t = toLabTest(r)
    const had = known.find((k) => k.id === t.id)
    return had ? { ...t, description: had.description, prep: had.prep } : t
  })
  mergeCatalog('labTests', list)
  return list
}

export async function loadTest(code: string): Promise<LabTest> {
  const t = await api.pub<ApiLabTest>(`public/lab-tests/${encodeURIComponent(code)}`)
  const test = toLabTest(t)
  mergeCatalog('labTests', [test])
  useTestDetails.setState((s) => ({ byCode: { ...s.byCode, [t.code]: { covers: t.covers ?? [], audience: t.audience ?? [] } } }))
  return test
}

export async function loadTestCatalog() {
  const [categories, first] = await Promise.all([
    api.pub<{ name: string; slug: string; tests: number }[]>('public/test-categories'),
    api.pub<Page<ApiLabTest>>('public/lab-tests?limit=50'),
  ])
  const testCategories: TestCategory[] = categories.map((c) => ({ id: c.slug, name: c.name, tests: c.tests }))
  useCatalog.setState({ testCategories })
  mergeCatalog('labTests', first.rows.map(toLabTest))
}

/* -------------------------------------------------------------------- Labs */

interface ApiLab {
  code: string
  name: string
  locality: string
  nabl: { number: string; expiry: string } | null
  rating: number | string
  reviews?: number
  homeCollection: boolean
  price: number | string
  distanceKm: number | null
  reportHours: number
}

/** Labs that price every one of `testCodes`; each lab's price for a single test is remembered on it. */
export async function loadLabsFor(testCodes: string[]): Promise<Lab[]> {
  const rows = await api.pub<ApiLab[]>(`public/labs${qs({ tests: testCodes.join(','), sort: 'price' })}`)
  const known = useCatalog.getState().labs
  const list = rows.map((l, i): Lab => {
    const had = known.find((k) => k.id === l.code)
    const testPrices = { ...had?.testPrices, ...(testCodes.length === 1 ? { [testCodes[0]]: num(l.price) } : {}) }
    return {
      id: l.code,
      name: l.name,
      rating: num(l.rating),
      reviews: l.reviews ?? 0,
      distanceKm: l.distanceKm ?? 0,
      price: num(l.price),
      homeCollection: l.homeCollection,
      nabl: Boolean(l.nabl),
      slots: had?.slots ?? 0,
      photo: i % 2 ? SCENE.labTeam : SCENE.lab,
      locality: l.locality,
      testPrices,
      reportHours: l.reportHours,
    }
  })
  mergeCatalog('labs', list)
  return list
}

/* ------------------------------------------------------------------- Slots */

interface ApiLabSlot {
  time: string
  startsAt: string
  endsAt: string
  period: Period
  available: boolean
}

export interface LabSlotGroup {
  period: 'Morning' | 'Afternoon'
  slots: SlotView[]
}

export async function loadLabSlots(isoDate: string): Promise<ApiLabSlot[]> {
  return api.pub<ApiLabSlot[]>(`public/lab-slots${qs({ date: isoDate })}`)
}

/** The server's slots in the app's groups (times as "6:30 AM"). */
export function slotGroups(slots: ApiLabSlot[], selected: string | null): LabSlotGroup[] {
  const groups: LabSlotGroup[] = []
  for (const s of slots) {
    const period = s.period === 'Morning' ? 'Morning' : 'Afternoon'
    let g = groups.find((x) => x.period === period)
    if (!g) groups.push((g = { period, slots: [] }))
    const time = from24h(s.time)
    g.slots.push({ time, state: !s.available ? 'booked' : time === selected ? 'selected' : 'free' })
  }
  return groups
}

/* ---------------------------------------------------------------- Bookings */

export interface ApiLabBooking {
  code: string
  status: string
  stage: string
  method: 'home_collection' | 'lab_visit'
  lab: { code: string; name: string; locality?: string | null }
  slot: { date: string; window: string; startsAt: string; endsAt: string }
  address: ApiAddressSnapshot | null
  people: { id: number; memberId: number | null; name: string; tests: { code: string; name: string; price: number | string }[]; report: { code: string; status: string } | null }[]
  bill: { subtotal: number | string; visitDiscount: number | string; memberSaving: number | string; homeFee: number | string; total: number | string }
  paymentType: 'online' | 'cash'
  paymentStatus: string
  paymentRequired: boolean
  technician: { name: string; id: string | number } | null
  collectionCode: string | null
  canCancel: boolean
  cancellation: { reason?: string | null; at?: string | null } | null
  createdAt: string
  history?: { from: string | null; to: string; at: string }[]
}

/** The server's statuses on the app's five tracking steps. */
const LAB_STEP: Record<string, number> = {
  pending_payment: 0,
  scheduled: 0,
  agent_assigned: 1,
  agent_on_the_way: 1,
  collecting: 1,
  sample_collected: 2,
  processing: 3,
  report_ready: 4,
}

export const methodLabel = (m: ApiLabBooking['method']): CollectionMethod => (m === 'lab_visit' ? 'Lab Visit' : 'Home Collection')

const when = (at: string) => `${atToDay(at)}, ${atToTime(at)}`

export function toDiagnosticOrder(b: ApiLabBooking): DiagnosticOrder {
  const date: CalendarDate = fromIso(b.slot.date)
  const window = collectionWindow(from24h(b.slot.window.split('–')[0].trim()))
  const tests = b.people.flatMap((p) => p.tests)
  const testNames = [...new Set(tests.map((t) => t.name))]
  const stageTimes: string[] = []
  for (const h of b.history ?? []) {
    const step = LAB_STEP[h.to]
    if (step !== undefined && !stageTimes[step]) stageTimes[step] = when(h.at)
  }
  if (!stageTimes[0]) stageTimes[0] = when(b.createdAt)
  const reportedAt = (b.history ?? []).find((h) => h.to === 'report_ready')?.at
  return {
    id: b.code,
    kind: 'diagnostics',
    placedAt: Date.parse(b.createdAt),
    testId: tests[0]?.code ?? '',
    labId: b.lab.code,
    method: methodLabel(b.method),
    date: formatShortYear(date),
    slot: window.full,
    slotCompact: window.compact,
    address: b.method === 'lab_visit' ? [b.lab.name, b.lab.locality].filter(Boolean).join(', ') : addressLine(b.address),
    technician: b.technician ? { name: b.technician.name, id: String(b.technician.id), mobile: '' } : { name: '', id: '', mobile: '' },
    amount: num(b.bill.total),
    listed: num(b.bill.subtotal),
    fixedStage: LAB_STEP[b.status] ?? 0,
    stageTimes,
    status: b.status === 'cancelled' ? 'cancelled' : 'active',
    reportedWhen: b.status === 'report_ready' ? (reportedAt ? `Report ready · ${atToDay(reportedAt)}` : 'Report ready') : undefined,
    title: testNames.length > 1 ? `${testNames.length} tests` : testNames[0] ?? '',
    testNames,
    labName: b.lab.name,
    statusLabel: b.stage,
    canCancel: b.canCancel,
    collectionCode: b.collectionCode ?? undefined,
    reportCodes: b.people.map((p) => p.report?.code).filter((c): c is string => Boolean(c)),
    paymentRequired: b.paymentRequired,
    paymentType: b.paymentType,
  }
}

export async function listLabBookings(): Promise<DiagnosticOrder[]> {
  const page = await api.get<Page<ApiLabBooking>>('patient/diagnostics/bookings?scope=all&limit=50')
  return page.rows.map(toDiagnosticOrder)
}

export async function loadLabBooking(code: string): Promise<DiagnosticOrder> {
  return toDiagnosticOrder(await api.get<ApiLabBooking>(`patient/diagnostics/bookings/${encodeURIComponent(code)}`))
}

export async function cancelLabBooking(code: string, reason?: string): Promise<DiagnosticOrder> {
  return toDiagnosticOrder(await api.post<ApiLabBooking>(`patient/diagnostics/bookings/${encodeURIComponent(code)}/cancel`, reason ? { reason } : {}))
}
