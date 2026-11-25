/// <reference types="node" />
/**
 * Live pharmacy and diagnostics: the app's catalogue search, labs and slots, placing orders and lab
 * bookings through the checkout holds, the Orders tab's sync and tracking stages, cancelling, and lab
 * reports. See test-support/live.ts. Operations' steps (advancing an order, publishing a report) use
 * the admin API directly, as the admin panel would.
 *
 * Under Jest the app's upload (XMLHttpRequest with a file URI) can't run, so the prescription file is
 * uploaded with fetch + FormData (same POST /files, purpose prescription_upload) and handed to the
 * uploads store as a finished upload, which is what the app does once its upload completes.
 */
import { data, liveSuite, signIn } from '../../test-support/live'

const URL = process.env.PATIENT_LIVE_URL ?? ''

async function admin<T = any>(method: string, path: string, token: string, body?: unknown): Promise<{ status: number; data: T }> {
  const r = await fetch(`${URL}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await r.json().catch(() => null)
  return { status: r.status, data: json?.data }
}

async function uploadFile(token: string, purpose: string, name: string, type: string, bytes: Buffer): Promise<number> {
  const form = new FormData()
  form.append('purpose', purpose)
  // Node's FormData and Blob (React Native's types describe the app's own FormData).
  ;(form as unknown as { append: (k: string, v: unknown, n: string) => void }).append('file', new (Blob as unknown as new (parts: unknown[], o: { type: string }) => Blob)([new Uint8Array(bytes)], { type }), name)
  const r = await fetch(`${URL}/files`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
  const json = await r.json()
  if (r.status !== 201) throw new Error(`upload ${r.status} ${JSON.stringify(json)}`)
  return json.data.id
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(3000, 3)])
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(20_000, 7), Buffer.from('\n%%EOF\n')])

liveSuite('the patient app on the live backend: pharmacy, diagnostics, reports', () => {
  jest.setTimeout(180_000)
  const pharmacy = require('../../src/services/live/pharmacy') as typeof import('../../src/services/live/pharmacy')
  const dx = require('../../src/services/live/diagnostics') as typeof import('../../src/services/live/diagnostics')
  const flows = require('../../src/services/live/flows-commerce') as typeof import('../../src/services/live/flows-commerce')
  const sync = require('../../src/services/live/sync') as typeof import('../../src/services/live/sync')
  require('../../src/services/live/sync-commerce')
  const { api } = require('../../src/services/live/http') as typeof import('../../src/services/live/http')
  const { useSession } = require('../../src/store/session') as typeof import('../../src/store/session')
  const { useCatalog, getMedicineDetail } = require('../../src/store/catalog') as typeof import('../../src/store/catalog')
  const { useCart } = require('../../src/store/cart') as typeof import('../../src/store/cart')
  const { useUploads } = require('../../src/store/uploads') as typeof import('../../src/store/uploads')
  const { useOrders } = require('../../src/store/orders') as typeof import('../../src/store/orders')
  const { useAddresses } = require('../../src/store/addresses') as typeof import('../../src/store/addresses')
  const schedule = require('../../src/domain/schedule') as typeof import('../../src/domain/schedule')
  const { currentStage } = require('../../src/domain/orderTracking') as typeof import('../../src/domain/orderTracking')

  // Sign-in codes are capped at 5 an hour per number; COMMERCE_PATIENT picks another 98765983NN.
  const mobile = `98765983${process.env.COMMERCE_PATIENT ?? '01'}`
  const bill = { base: 0, platformFee: 0, discount: 0, total: 0 }
  let T = ''
  let pharmacyCode = ''
  let codOrder = ''
  let homeBooking = ''
  let visitBooking = ''
  let slot: { date: import('../../src/domain/schedule').CalendarDate; time: string }

  beforeAll(async () => {
    await signIn(mobile, { name: 'Meena Rao' })
    // Operations' token (the admin panel's account).
    const login = await fetch(`${URL}/auth/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'ops@kdcplus.in', password: 'R4-admin-password-1' }) })
    T = (await login.json()).data.accessToken
    pharmacyCode = (await admin<{ rows: { code: string }[] }>('GET', 'admin/pharmacies', T)).data.rows[0].code
    // A delivery address (fork C's address store owns the form; the server id is what checkout sends).
    const addresses = await api.get<{ id: number }[]>('patient/addresses')
    const a = addresses[0] ?? (await api.post<{ id: number }>('patient/addresses', { label: 'home', line: '12-2-831, Road No. 3', area: 'Banjara Hills', city: 'Hyderabad', pincode: '500034', phone: mobile }))
    useAddresses.setState({ items: [{ id: String(a.id), label: 'Home', line: '12-2-831, Road No. 3', area: 'Banjara Hills', phone: mobile, isDefault: true }], selectedId: String(a.id) })
  })

  it('loads the catalogues: categories, medicines and tests', async () => {
    await sync.syncOne('commerce-catalog')
    const c = useCatalog.getState()
    expect(c.pharmacyCategories.map((x) => x.id)).toContain('pain-relief')
    expect(c.testCategories.length).toBeGreaterThan(0)
    expect(c.medicines.length).toBeGreaterThanOrEqual(data.medicines.length)
    expect(c.labTests.length).toBeGreaterThanOrEqual(data.tests.length)
    expect(c.medicines.every((m) => /^KDC-MD-/.test(m.id))).toBe(true)
  })

  it('searches medicines by text, filter and category, and opens one', async () => {
    const dolo = await pharmacy.searchMedicines({ text: 'paracetamol', filter: 'All' })
    expect(dolo.map((m) => m.name)).toContain('Dolo 650 Tablet')
    const rx = await pharmacy.searchMedicines({ text: '', filter: 'Prescription' })
    expect(rx.length).toBeGreaterThan(0)
    expect(rx.every((m) => m.rx)).toBe(true)
    const cardiac = await pharmacy.searchMedicines({ text: '', filter: 'All', category: 'Cardiac Care' })
    expect(cardiac.every((m) => m.category === 'Cardiac Care')).toBe(true)
    const m = await pharmacy.loadMedicine(dolo[0].id)
    expect(m).toMatchObject({ name: 'Dolo 650 Tablet', price: 31, mrp: 34, rx: false, inStock: true })
    expect(getMedicineDetail(m).about).toMatch(/Paracetamol/)
  })

  it('searches tests, lists the labs that price one, and the day’s slots', async () => {
    const found = await dx.searchTests({ text: 'hba1c', filter: 'All' })
    expect(found[0]).toMatchObject({ short: 'HbA1c', reportIn: '12 hours' })
    const t = await dx.loadTest(found[0].id)
    expect(t.prep.length).toBeGreaterThan(0)
    const labs = await dx.loadLabsFor([t.id])
    expect(labs.length).toBe(data.labs.length)
    expect(labs.every((l) => (l.testPrices?.[t.id] ?? 0) > 0)).toBe(true)
    const tomorrow = schedule.fromIso(new Date(Date.now() + 5.5 * 3600e3 + 86400e3).toISOString())
    const slots = await dx.loadLabSlots(schedule.toIso(tomorrow))
    const groups = dx.slotGroups(slots, null)
    expect(groups.map((g) => g.period)).toEqual(['Morning', 'Afternoon'])
    const free = groups.flatMap((g) => g.slots).find((x) => x.state === 'free')!
    expect(free.time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/)
    slot = { date: tomorrow, time: free.time }
  })

  it('places a cash-on-delivery order for an OTC medicine', async () => {
    const otc = useCatalog.getState().medicines.find((m) => !m.rx && m.inStock)!
    useCart.getState().add(otc.id, 2)
    const lines = useCart.getState().lines
    const hold = await flows.holdPharmacy({ kind: 'pharmacy', amount: 0, title: 'Medicine order', subtitle: '', lines, address: '', slot: 'Tomorrow, 9–12 PM', bill, itemCount: lines.length }, false)
    expect(hold).toMatchObject({ online: false, screen: 'order-tracking', sync: ['orders'] })
    expect(hold.purposeCode).toMatch(/^KDC-PH-/)
    expect(hold.amount).toBeGreaterThanOrEqual(otc.price * 2)
    codOrder = hold.purposeCode
    useCart.getState().clear()
  })

  it('refuses a prescription medicine without a prescription, then takes it with an uploaded one', async () => {
    const rx = useCatalog.getState().medicines.find((m) => m.rx && m.inStock)!
    useCart.getState().add(rx.id, 1)
    const intent = { kind: 'pharmacy' as const, amount: 0, title: 'Medicine order', subtitle: '', lines: useCart.getState().lines, address: '', slot: 'Tomorrow, 9–12 PM', bill, itemCount: 1 }
    await expect(flows.holdPharmacy(intent, false)).rejects.toMatchObject({ code: 'invalid', field: 'prescription' })

    const fileId = await uploadFile(useSession.getState().token!, 'prescription_upload', 'prescription.png', 'image/png', PNG)
    useUploads.setState({ items: [{ id: 'up-test', name: 'prescription.png', size: '3 KB', kind: 'image', progress: 100, status: 'done', fileId }] })
    useCart.getState().attachPrescription({ source: 'upload', label: 'prescription.png', uploadId: 'up-test' })
    const hold = await flows.holdPharmacy(intent, false)
    const order = await pharmacy.loadPharmacyOrder(hold.purposeCode)
    expect(order).toMatchObject({ rxRequired: true, payment: 'Cash on delivery', statusLabel: 'Order confirmed' })
    useCart.getState().clear()
  })

  it('books a home collection paid in cash, and cancels it', async () => {
    const test = useCatalog.getState().labTests.find((t) => t.short === 'HbA1c')!
    const hold = await flows.holdDiagnostic({ kind: 'diagnostic', amount: 0, title: 'Lab', subtitle: '', testId: test.id, labId: data.labs[0].code, method: 'Home Collection', date: slot.date, time: slot.time, address: '', bill, testName: test.name }, false)
    expect(hold).toMatchObject({ online: false, screen: 'diagnostic-confirm' })
    homeBooking = hold.purposeCode
    const booked = useOrders.getState().diagnostics.find((o) => o.id === homeBooking)!
    expect(booked).toMatchObject({ method: 'Home Collection', paymentType: 'cash', canCancel: true, status: 'active', labName: data.labs[0].name, testNames: [test.name] })
    expect(booked.slot).toMatch(new RegExp(`^${slot.time} – `))
    expect(booked.collectionCode).toMatch(/^\d{4}$/)
    expect(useOrders.getState().lastDiagnosticId).toBe(homeBooking)

    await useOrders.getState().cancelDiagnostic(homeBooking)
    const cancelled = useOrders.getState().diagnostics.find((o) => o.id === homeBooking)!
    expect(cancelled.status).toBe('cancelled')
  })

  it('the Orders tab loads both kinds with the server’s stages; an advanced order moves on', async () => {
    await sync.syncOne('orders')
    const { pharmacy: ph, diagnostics } = useOrders.getState()
    expect(ph.map((o) => o.id)).toContain(codOrder)
    expect(diagnostics.map((o) => o.id)).toContain(homeBooking)
    const cod = ph.find((o) => o.id === codOrder)!
    expect(currentStage(cod, Date.now())).toBe(0)
    expect(cod.lines[0].name).toBeTruthy()

    const r = await admin('POST', `admin/pharmacy/orders/${codOrder}/advance`, T, { pharmacyCode })
    expect([200, 201]).toContain(r.status)
    await sync.syncOne('orders')
    const moved = useOrders.getState().pharmacy.find((o) => o.id === codOrder)!
    expect(currentStage(moved, Date.now())).toBe(1)
    expect(moved.statusLabel).toBe('Prescription verified')
    const detail = await pharmacy.loadPharmacyOrder(codOrder)
    expect(detail.stageTimes?.[1]).toBeTruthy()
  })

  it('a paid lab visit goes to processing, and its published report reaches Lab reports', async () => {
    const test = useCatalog.getState().labTests.find((t) => t.short === 'Lipid Profile') ?? useCatalog.getState().labTests[0]
    const hold = await flows.holdDiagnostic({ kind: 'diagnostic', amount: 0, title: 'Lab', subtitle: '', testId: test.id, labId: data.labs[1].code, method: 'Lab Visit', date: slot.date, time: slot.time, address: '', bill, testName: test.name }, true)
    expect(hold.online).toBe(true)
    visitBooking = hold.purposeCode
    // Paid through the Razorpay stand-in (checkout itself is fork D's flow).
    const started = await api.post<{ code: string; checkout: { orderId: string } }>('patient/payments', { purposeCode: visitBooking })
    const cb = await (await fetch(`${data.rzpControl}/pay`, { method: 'POST', body: JSON.stringify({ orderId: started.checkout.orderId }) })).json()
    await api.post(`patient/payments/${started.code}/verify`, cb)

    for (let i = 0; i < 2; i++) expect([200, 201]).toContain((await admin('POST', `admin/lab-bookings/${visitBooking}/advance`, T, {})).status)
    const booking = await dx.loadLabBooking(visitBooking)
    expect(currentStage(booking, Date.now())).toBe(3)

    const raw = await admin<{ people: { id: number }[] }>('GET', `admin/lab-bookings/${visitBooking}`, T)
    const fileId = await uploadFile(T, 'lab_report', 'report.pdf', 'application/pdf', PDF)
    const pub = await admin('POST', `admin/lab-bookings/${visitBooking}/reports`, T, {
      patientId: raw.data.people[0].id,
      category: 'blood',
      pathologist: 'Dr. S. Venkatesh, MD (Pathology)',
      summary: 'Mildly raised LDL.',
      results: [
        { name: 'LDL Cholesterol', value: '134', unit: 'mg/dL', range: '< 130', flag: 'borderline' },
        { name: 'HDL Cholesterol', value: '46', unit: 'mg/dL', range: '> 40', flag: 'normal' },
      ],
      files: [{ fileId, pages: 2 }],
    })
    expect([200, 201]).toContain(pub.status)

    await sync.syncOne('reports', 'orders')
    const report = useCatalog.getState().labReports[0]
    expect(report).toMatchObject({ status: 'ready', kind: 'blood', flagged: 1, pages: 2, lab: data.labs[1].name })
    expect(report.month).toMatch(/^[A-Z][a-z]+ \d{4}$/)
    const done = useOrders.getState().diagnostics.find((o) => o.id === visitBooking)!
    expect(currentStage(done, Date.now())).toBe(4)
    expect(done.reportCodes).toEqual([report.id])
    const { loadReport } = require('../../src/services/live/reports') as typeof import('../../src/services/live/reports')
    const detail = await loadReport(report.id)
    expect(detail.results.map((x) => x.flag)).toEqual(['borderline', 'normal'])
    expect(detail.pathologist).toMatch(/Venkatesh/)
  })

  it('signing out empties orders, cart, uploads and reports', async () => {
    useCart.getState().add(useCatalog.getState().medicines[0].id)
    sync.clearAll()
    expect(useOrders.getState().pharmacy).toEqual([])
    expect(useOrders.getState().diagnostics).toEqual([])
    expect(useCart.getState().lines).toEqual([])
    expect(useUploads.getState().items).toEqual([])
    expect(useCatalog.getState().labReports).toEqual([])
  })
})
