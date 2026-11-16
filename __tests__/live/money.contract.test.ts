/// <reference types="node" />
/**
 * Live money: KDC+ Plus plans and buying a membership, Razorpay Checkout (simulated with the
 * stand-in: test-support/live.ts), a cancelled Checkout and its retry, payment history and summary,
 * saved UPI ids, ending the membership; a consultation and a pharmacy order through the same checkout.
 */
import { data, liveSuite, signIn, simulateCheckout, sql } from '../../test-support/live'

liveSuite('the patient app on the live backend: payments and membership', () => {
  jest.setTimeout(180_000)
  /* eslint-disable @typescript-eslint/no-require-imports */
  require('../../src/services')
  const { syncOne } = require('../../src/services/live/sync') as typeof import('../../src/services/live/sync')
  const { useCheckout, runPayment } = require('../../src/flows/payment') as typeof import('../../src/flows/payment')
  const { useMembership } = require('../../src/store/membership') as typeof import('../../src/store/membership')
  const { usePayments, CASH_ON_DELIVERY, PAY_ONLINE } = require('../../src/store/payments') as typeof import('../../src/store/payments')
  const { planById, plans } = require('../../src/mock-data/membership') as typeof import('../../src/mock-data/membership')
  const { rateFor } = require('../../src/domain/pricing') as typeof import('../../src/domain/pricing')
  const { useBooking } = require('../../src/store/booking') as typeof import('../../src/store/booking')
  const { useAddresses } = require('../../src/store/addresses') as typeof import('../../src/store/addresses')
  const { api } = require('../../src/services/live/http') as typeof import('../../src/services/live/http')
  const { istToday } = require('../../src/domain/schedule') as typeof import('../../src/domain/schedule')
  const { buildBill } = require('../../src/domain/pricing') as typeof import('../../src/domain/pricing')
  // A new patient each run (MONEY_MOBILE pins one): 98765985NN.
  const mobile = process.env.MONEY_MOBILE ?? `98765985${String(10 + (Math.floor(Date.now() / 1000) % 90))}`
  let patientId = 0
  let selfMember = 0

  const membershipRows = () => Number(sql(`select count(*) from memberships where patient_id = ${patientId}`))
  const buy = (planId: string) => {
    const plan = planById(planId)
    useCheckout.getState().start({ kind: 'membership', amount: 1, title: `KDC+ Plus · ${plan.name}`, subtitle: '', planId, planName: plan.name })
    return runPayment()
  }

  beforeAll(async () => {
    const me = await signIn(mobile, { name: 'Meera Joshi' })
    patientId = me.patientId
    // Round 2 load: wait here until the runner has expired every access token and stopped a backend.
    const gate = process.env.LOAD_GATE
    if (gate) for (let i = 0; i < 1200 && !require('node:fs').existsSync(gate); i++) await new Promise((r) => setTimeout(r, 100))
    await syncOne('membership', 'payments')
    selfMember = Number((await api.get<{ selfMemberId: number }>('patient/me')).selfMemberId)
  })

  it('loads the server’s plans and caps in place of the bundled ones', () => {
    const st = useMembership.getState()
    expect(st.plans.map((p) => p.id)).toEqual(expect.arrayContaining(['annual', 'half', 'quarter']))
    expect(plans.length).toBe(st.plans.length)
    expect(planById('quarter')).toMatchObject({ price: 849, discount: 10, gst: 153, total: 1002 })
    expect(st.status).toBe('none')
    expect(rateFor(st, 'consultations')).toBe(0)
  })

  it('a cancelled Checkout keeps the hold; the retry pays the same membership', async () => {
    const open = simulateCheckout({ decline: true })
    const first = await buy('quarter')
    expect(first).toMatchObject({ ok: false, cancelled: true })
    expect(useCheckout.getState().inflight?.hold).toMatchObject({ amount: 1002, online: true })
    const held = useCheckout.getState().inflight!.hold.purposeCode
    expect(membershipRows()).toBe(1)
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ key: 'rzp_test_KDCSTUB0000001', amount: 100200, currency: 'INR' }))

    simulateCheckout()
    const second = await runPayment()
    expect(second).toMatchObject({ ok: true, screen: 'membership-success' })
    expect(membershipRows()).toBe(1)
    const st = useMembership.getState()
    expect(st).toMatchObject({ status: 'active', planId: 'quarter', code: held })
    expect(st.daysLeft).toBeGreaterThan(80)
    expect(st.renews).toMatch(/\d+ \w{3} 20\d\d/)
    expect(rateFor(st, 'pharmacy')).toBe(10)
    expect(useCheckout.getState().intent).toBeNull()
  })

  it('shows the payment in the history and the summary', () => {
    const { ledger, summary } = usePayments.getState()
    expect(ledger[0]).toMatchObject({ type: 'Membership', amount: 1002, status: 'paid' })
    expect(ledger[0].invoiceNumber).toBeTruthy()
    expect(summary).toMatchObject({ membership: 1002 })
  })

  it('another plan while one is active: the server says no', async () => {
    simulateCheckout()
    const r = await buy('annual')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toMatch(/already have KDC\+ Plus/)
  })

  it('saves a UPI id and makes it the default', async () => {
    await usePayments.getState().addUpi('meera@okaxis')
    expect(usePayments.getState().methods).toEqual([expect.objectContaining({ kind: 'upi', label: 'meera@okaxis', isDefault: true })])
  })

  it('a consultation: the server holds the slot and the patient pays its total (member rate applied)', async () => {
    const doctor = data.doctors[2]
    const t = istToday(Date.now() + 2 * 86_400_000)
    const iso = `${t.year}-${String(t.month + 1).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
    // A free slot (other tests book this doctor too).
    const day = await api.pub<{ slots: { time: string; available: boolean }[] }>(`public/doctors/${doctor.code}/slots?date=${iso}&mode=video`)
    const free = day.slots.filter((x) => x.available)
    // MONEY_SLOT pins the time (Round 2 gives each concurrent patient their own).
    const hhmm = process.env.MONEY_SLOT ?? free[Math.floor(Math.random() * free.length)].time
    const [h, m] = hhmm.split(':').map(Number)
    const time = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
    useBooking.setState({ doctorId: doctor.code, patientId: String(selfMember), mode: 'video' })
    usePayments.getState().select(PAY_ONLINE.id)
    simulateCheckout()
    useCheckout.getState().start({
      kind: 'consultation', amount: 1, title: doctor.name, subtitle: '', doctorId: doctor.code, mode: 'video', date: t, time,
      patientLabel: 'Meera Joshi', bill: buildBill(500, 10, 49),
    })
    const r = await runPayment()
    expect(r).toEqual({ ok: true, screen: 'booking-success', params: undefined })
    const ledger = usePayments.getState().ledger
    expect(ledger[0]).toMatchObject({ type: 'Consultation', status: 'paid' })
    expect(ledger[0].amount).toBe(500 - 50 + 49)
  })

  it('a pharmacy order: online, then cash on delivery (nothing charged now)', async () => {
    const addr = await api.post<{ id: number }>('patient/addresses', { label: 'home', line: 'Flat 4B, Lake View Apartments', area: 'Banjara Hills', city: 'Hyderabad', pincode: '500034', phone: mobile })
    useAddresses.setState({ items: [{ id: String(addr.id), label: 'Home', line: 'Flat 4B', area: 'Banjara Hills', phone: mobile, isDefault: true }], selectedId: String(addr.id) })
    const dolo = data.medicines.find((m: { rxRequired: boolean }) => !m.rxRequired)
    const order = (qty: number) => {
      useCheckout.getState().start({
        kind: 'pharmacy', amount: 1, title: 'Medicine order', subtitle: '', lines: [{ medicineId: dolo.code, qty }], address: 'Flat 4B', slot: 'Tomorrow, 9–12 PM',
        bill: buildBill(31, 10), itemCount: 1,
      })
      return runPayment()
    }
    usePayments.getState().select(PAY_ONLINE.id)
    const open = simulateCheckout()
    open.mockClear()
    expect(await order(2)).toMatchObject({ ok: true, screen: 'order-tracking' })
    expect(open).toHaveBeenCalledTimes(1)
    expect(usePayments.getState().ledger[0]).toMatchObject({ type: 'Pharmacy', status: 'paid' })

    usePayments.getState().select(CASH_ON_DELIVERY.id)
    open.mockClear()
    expect(await order(1)).toMatchObject({ ok: true, screen: 'order-tracking' })
    expect(open).not.toHaveBeenCalled()
    usePayments.getState().select(PAY_ONLINE.id)
  })

  it('ends the membership: member pricing stops at once', async () => {
    const live = require('../../src/services/live/membership') as typeof import('../../src/services/live/membership')
    await live.endMembership()
    const st = useMembership.getState()
    expect(st.status).toBe('expired')
    expect(rateFor(st, 'consultations')).toBe(0)
    expect(st.planId).toBe('quarter')
  })

  it('sign-out forgets the payments and the membership', () => {
    const { logout } = require('../../src/store/reset') as typeof import('../../src/store/reset')
    logout()
    expect(usePayments.getState()).toMatchObject({ ledger: [], methods: [], summary: null })
    expect(useMembership.getState()).toMatchObject({ status: 'none', ledger: [], rates: null })
  })
})
