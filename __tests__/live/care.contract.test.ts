/// <reference types="node" />
/**
 * Live care: the doctor directory, booking (hold, pay through the Razorpay stand-in), the
 * appointments tab (reschedule, cancel with the server's quote), the waiting room, feedback and
 * prescriptions, through the app's own stores and live services. See test-support/live.ts.
 */
import { data, liveSuite, signIn, sql } from '../../test-support/live'

liveSuite('the patient app on the live backend: care', () => {
  jest.setTimeout(180_000)
  /* eslint-disable @typescript-eslint/no-require-imports */
  const doctors = require('../../src/services/live/doctors') as typeof import('../../src/services/live/doctors')
  const appts = require('../../src/services/live/appointments') as typeof import('../../src/services/live/appointments')
  const consult = require('../../src/services/live/consultations') as typeof import('../../src/services/live/consultations')
  const { holdConsultation } = require('../../src/services/live/flows-care') as typeof import('../../src/services/live/flows-care')
  const { api } = require('../../src/services/live/http') as typeof import('../../src/services/live/http')
  const { syncOne } = require('../../src/services/live/sync') as typeof import('../../src/services/live/sync')
  require('../../src/services') // registers the sync domains
  const { useCatalog, getDoctor, getPrescription } = require('../../src/store/catalog') as typeof import('../../src/store/catalog')
  const { useDiscovery } = require('../../src/store/discovery') as typeof import('../../src/store/discovery')
  const { useBooking } = require('../../src/store/booking') as typeof import('../../src/store/booking')
  const { useAppointments } = require('../../src/store/appointments') as typeof import('../../src/store/appointments')
  const { useCall } = require('../../src/store/call') as typeof import('../../src/store/call')
  const { useCart } = require('../../src/store/cart') as typeof import('../../src/store/cart')
  const { finishConsultation, submitConsultationFeedback } = require('../../src/flows/consultation') as typeof import('../../src/flows/consultation')
  const { orderPrescription } = require('../../src/flows/prescriptions') as typeof import('../../src/flows/prescriptions')
  const { MOCK_TODAY, from24h } = require('../../src/domain/schedule') as typeof import('../../src/domain/schedule')
  const { NO_FILTERS } = require('../../src/domain/doctorSearch') as typeof import('../../src/domain/doctorSearch')

  const mobile = `98765982${String(Number(process.env.PATIENT_INDEX ?? 0)).padStart(2, '0')}`
  const arjun = data?.doctors[0]
  const day = (offset: number) => {
    const d = new Date(Date.UTC(MOCK_TODAY.year, MOCK_TODAY.month, MOCK_TODAY.day + offset))
    return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
  }
  const base = process.env.PATIENT_LIVE_URL!
  const asDoctor = async (method: string, path: string, body?: unknown) => {
    const r = await fetch(`${base}/${path}`, { method, headers: { Authorization: `Bearer ${data.doctorTokens[0]}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const json = await r.json()
    if (r.status >= 300) throw new Error(`${path}: ${r.status} ${JSON.stringify(json).slice(0, 300)}`)
    return json.data
  }

  /** An open slot on that day, after the given index (so repeated runs pick fresh times). */
  async function openSlot(date: ReturnType<typeof day>, skip = 0) {
    const slots = await doctors.loadSlots(arjun.code, 'video', date)
    return slots.filter((s) => s.available)[skip].time
  }

  /** Holds the slot through the app's checkout contract, then pays it as Razorpay Checkout would. */
  async function bookAndPay(date: ReturnType<typeof day>, time: string) {
    useBooking.getState().selectDoctor(arjun.code)
    useBooking.getState().setMode('video')
    useBooking.getState().setSlot(date, time)
    const intent = { kind: 'consultation', amount: 0, title: arjun.name, subtitle: '', doctorId: arjun.code, mode: 'video', date, time, patientLabel: '', bill: { base: 500, platformFee: 49, discount: 0, total: 549 } } as const
    const hold = await holdConsultation(intent as never)
    expect(hold).toMatchObject({ online: true, screen: 'booking-success', sync: ['appointments'] })
    expect(hold.amount).toBe(549)
    const pay = await api.post<{ code: string; checkout: { orderId: string; amount: number } }>('patient/payments', { purposeCode: hold.purposeCode })
    expect(pay.checkout.amount).toBe(54900)
    const cb = await (await fetch(`${data.rzpControl}/pay`, { method: 'POST', body: JSON.stringify({ orderId: pay.checkout.orderId }) })).json()
    await api.post(`patient/payments/${pay.code}/verify`, cb)
    await syncOne('appointments')
    return hold.purposeCode
  }

  it('signs in and loads the directory, specialties and booking rules', async () => {
    await signIn(mobile, { name: 'Rahul Verma', gender: 'Male' })
    // An earlier run's unpaid hold (the server allows 3 at a time) is let go.
    const open = await api.get<{ rows: { code: string; status: string }[] }>('patient/appointments?scope=upcoming&limit=50')
    for (const h of open.rows.filter((r) => r.status === 'pending_payment')) await api.post(`patient/appointments/${h.code}/cancel`, {})
    await syncOne('doctors', 'appointments', 'prescriptions')
    const { specialties, doctors: list } = useCatalog.getState()
    expect(specialties.find((s) => s.id === 'cardiology')).toMatchObject({ name: 'Cardiology' })
    expect(list.map((d) => d.id)).toEqual(expect.arrayContaining(data.doctors.map((d: { code: string }) => d.code)))
    expect(doctors.careRules.platformFee).toBe(49)
  })

  it('searches by specialty, by name and with filters', async () => {
    const cardio = await doctors.searchDoctors({ text: '', filters: { ...NO_FILTERS, specialty: 'Cardiology' }, sort: 'Relevance' })
    expect(cardio.map((d) => d.name)).toContain('Dr. Arjun Mehta')
    expect(cardio.every((d) => d.specialty === 'Cardiologist')).toBe(true)
    const byName = await doctors.searchDoctors({ text: 'Kavya', filters: NO_FILTERS, sort: 'Rating' })
    expect(byName.map((d) => d.name)).toEqual(['Dr. Kavya Nair'])
    const typed = await doctors.searchDoctors({ text: 'Cardiology', filters: NO_FILTERS, sort: 'Relevance' })
    expect(typed.map((d) => d.id)).toContain(arjun.code)
    const cheap = await doctors.searchDoctors({ text: '', filters: { ...NO_FILTERS, mode: 'video', feeMax: 300 }, sort: 'Fee: low to high' })
    expect(cheap.map((d) => d.id)).not.toContain(arjun.code)
  })

  it('opens a doctor: profile, reviews, availability and slots', async () => {
    const d = await doctors.loadDoctor(arjun.code)
    expect(d).toMatchObject({ id: arjun.code, name: 'Dr. Arjun Mehta', fees: { video: 500, audio: 400, clinic: 700 }, modes: ['video', 'audio', 'clinic'] })
    expect(d.regNo).toBe('TSMC/P11D/8001')
    expect(d.credentials.length).toBeGreaterThan(0)
    expect(getDoctor(arjun.code).regNo).toBe('TSMC/P11D/8001')
    const r = await doctors.loadReviews(arjun.code)
    expect(r.distribution).toHaveLength(5)
    const week = await doctors.loadAvailability(arjun.code, 'video', day(0), 7)
    expect(week.days).toHaveLength(7)
    expect(week.days[1].freeSlots).toBeGreaterThan(0)
    const slots = await doctors.loadSlots(arjun.code, 'video', day(1))
    expect(slots[0]).toMatchObject({ time: '6:00 AM', period: 'Morning', available: true })
    const groups = doctors.groupSlots(slots, '6:15 AM')
    expect(groups.Morning.find((s) => s.time === '6:15 AM')?.state).toBe('selected')
  })

  it('saves and unsaves a doctor on the server', async () => {
    useDiscovery.getState().toggleSaved(arjun.code)
    await new Promise((r) => setTimeout(r, 600))
    expect(useDiscovery.getState().savedDoctorIds).toEqual([arjun.code])
    expect(await doctors.loadSaved()).toEqual([arjun.code])
    useDiscovery.getState().toggleSaved(arjun.code)
    await new Promise((r) => setTimeout(r, 600))
    expect(await doctors.loadSaved()).toEqual([])
  })

  let code = ''
  it('books: the slot is held and priced by the server, then paid; the appointment appears', async () => {
    const time = await openSlot(day(1), 4)
    code = await bookAndPay(day(1), time)
    const a = useAppointments.getState().items.find((x) => x.id === code)
    expect(a).toMatchObject({ doctorId: arjun.code, mode: 'video', time, status: 'confirmed', fee: 500, platformFee: 49, paymentStatus: 'paid', canCancel: true, canReschedule: true, for: 'Rahul Verma' })
    expect(useAppointments.getState().lastBookedId).toBe(code)
    // The slot is gone for everyone.
    const slots = await doctors.loadSlots(arjun.code, 'video', day(1))
    expect(slots.find((s) => s.time === time)?.available).toBe(false)
  })

  it('reschedules to an open slot, then cancels with the server’s quote (free, full refund)', async () => {
    const to = await openSlot(day(2), 2)
    const moved = await useAppointments.getState().reschedule(code, day(2), to)
    expect(moved).toMatchObject({ time: to })
    expect(useAppointments.getState().items.find((x) => x.id === code)?.dateIso).toBe(moved.dateIso)
    const quote = await appts.cancellationQuote(code)
    expect(quote).toMatchObject({ free: true, lateFee: 0, refundAmount: 549 })
    const cancelled = await useAppointments.getState().cancel(code)
    expect(cancelled).toMatchObject({ status: 'cancelled', refundAmount: 549, canCancel: false })
    expect(cancelled.reason).toContain('Cancelled by you')
    expect(useAppointments.getState().lastCancelledId).toBe(code)
  })

  it('the waiting room, the doctor’s consultation and prescription, then feedback and reorder', async () => {
    // A paid appointment made due now, as the doctor app tests do.
    const due = await bookAndPay(day(1), await openSlot(day(1)))
    sql(`update appointments set starts_at = utc_timestamp(3) + interval 2 minute, ends_at = utc_timestamp(3) + interval 17 minute where code = '${due}'`)
    const joined = await consult.joinSession(due)
    expect(joined.media).toBeNull()
    expect((await consult.getSession(due)).patientInRoom).toBe(true)
    await asDoctor('POST', `doctor/consultations/${due}/start`, {})
    expect((await consult.getSession(due)).state).toBe('live')
    const med = data.medicines.find((m: { rxRequired: boolean }) => !m.rxRequired)
    await asDoctor('PUT', `doctor/consultations/${due}/prescription`, {
      diagnosis: ['Viral fever'],
      items: [{ medicineCode: med.code, name: med.name, generic: 'Paracetamol 650 mg', dosage: '1 tablet', frequency: 'Twice a day', duration: '3 days' }],
      advice: ['Rest and fluids'],
      investigations: [],
    })
    await asDoctor('POST', `doctor/consultations/${due}/prescription/issue`, {})

    useCall.getState().beginWaiting(due)
    await finishConsultation()
    const a = useAppointments.getState().items.find((x) => x.id === due)!
    expect(a).toMatchObject({ status: 'completed', canGiveFeedback: true })
    expect(a.prescriptionCode).toBeTruthy()

    await syncOne('prescriptions')
    const summary = useCatalog.getState().prescriptionHistory.find((p) => p.rxId === a.prescriptionCode)
    expect(summary).toMatchObject({ doctorId: arjun.code, items: 1, status: 'active', appointmentId: due })
    const doc = getPrescription(a.prescriptionCode)
    expect(doc).toMatchObject({ id: a.prescriptionCode, diagnosis: ['Viral fever'], advice: ['Rest and fluids'] })
    expect(doc.medicines[0]).toMatchObject({ name: med.name, dosage: '1 tablet', frequency: 'Twice a day' })

    expect(await submitConsultationFeedback({ rating: 5, tags: ['Explained clearly', 'Would recommend'], note: 'Very clear' })).toBe(true)
    expect(useAppointments.getState().items.find((x) => x.id === due)?.feedback?.rating).toBe(5)
    const reviews = await doctors.loadReviews(arjun.code)
    expect(reviews.recommendPct).toBe(100)
    expect(reviews.reviews[0]).toMatchObject({ name: 'Verified patient', rating: 5, text: 'Very clear' })

    useCart.getState().clear()
    await orderPrescription(doc, 'Dr. Arjun Mehta')
    const cart = useCart.getState()
    expect(cart.lines.map((l) => l.medicineId)).toEqual([med.code])
    expect(cart.prescription).toMatchObject({ source: 'kdc', code: a.prescriptionCode })
  })

  it('lists upcoming, completed and cancelled together; unpaid holds are not shown', async () => {
    useBooking.getState().setMode('audio')
    const hold = await holdConsultation({ kind: 'consultation', doctorId: arjun.code, mode: 'audio', date: day(3), time: await openSlot(day(3), 6) } as never)
    await syncOne('appointments')
    const items = useAppointments.getState().items
    expect(items.find((x) => x.id === hold.purposeCode)).toBeUndefined()
    expect(items.find((x) => x.id === code)?.status).toBe('cancelled')
    expect(items.some((x) => x.status === 'completed')).toBe(true)
    await api.post(`patient/appointments/${hold.purposeCode}/cancel`, {})
    expect(from24h('19:00')).toBe('7:00 PM')
  })
})
