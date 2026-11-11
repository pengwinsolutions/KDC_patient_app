import { runPayment, useCheckout, type PaymentIntent } from '../../src/flows/payment'
import { finishConsultation, submitConsultationFeedback } from '../../src/flows/consultation'
import { orderPrescription } from '../../src/flows/prescriptions'
import { useAppointments } from '../../src/store/appointments'
import { useBooking } from '../../src/store/booking'
import { useCall } from '../../src/store/call'
import { useCart } from '../../src/store/cart'
import { useMembership, totalSaved } from '../../src/store/membership'
import { useNotifications } from '../../src/store/notifications'
import { useOrders } from '../../src/store/orders'
import { usePayments } from '../../src/store/payments'
import { useRecords } from '../../src/store/records'
import { logout } from '../../src/store/reset'
import { useDiagnosticsDraft } from '../../src/store/diagnosticsDraft'
import { buildBill } from '../../src/domain/pricing'
import { getPrescription } from '../../src/store/catalog'

beforeEach(() => {
  logout()
  useCheckout.getState().clear()
})

const consultation = (): PaymentIntent => ({
  kind: 'consultation',
  amount: 649,
  title: 'Dr. Arjun Mehta',
  subtitle: 'Mon, 6 Oct · 5:30 PM',
  doctorId: 'd1',
  mode: 'video',
  date: { year: 2025, month: 9, day: 6 },
  time: '5:30 PM',
  patientLabel: 'Aarav Sharma',
  bill: buildBill(800, 25, 49),
  discountLabel: 'KDC+ Plus (25% off)',
})

function start(intent: PaymentIntent) {
  useCheckout.getState().start(intent)
}

describe('consultation payment', () => {
  it('creates the appointment, ledger, notification and saving', async () => {
    const savedBefore = totalSaved(useMembership.getState().ledger)
    start(consultation())
    const outcome = await runPayment()
    expect(outcome).toEqual({ ok: true, screen: 'booking-success' })
    const appointments = useAppointments.getState()
    const booked = appointments.items.find((a) => a.id === appointments.lastBookedId)!
    expect(booked).toMatchObject({ doctorId: 'd1', mode: 'video', status: 'confirmed', fee: 800, discount: 200, paidVia: 'UPI · aarav@okhdfcbank' })
    expect(usePayments.getState().ledger[0]).toMatchObject({ type: 'Consultation', amount: 649, status: 'paid' })
    expect(useNotifications.getState().added[0].title).toBe('Appointment confirmed')
    expect(totalSaved(useMembership.getState().ledger)).toBe(savedBefore + 200)
    expect(useCheckout.getState().intent).toBeNull()
    expect(useBooking.getState().time).toBeNull()
  })

  it('declines when the UPI ID starts with fail and keeps the intent for retry', async () => {
    usePayments.getState().addUpi('fail@upi')
    start(consultation())
    const outcome = await runPayment()
    expect(outcome.ok).toBe(false)
    expect(useCheckout.getState().intent).not.toBeNull()
    expect(useAppointments.getState().items).toHaveLength(5)
  })

  it('succeeds on retry after changing the method', async () => {
    usePayments.getState().addUpi('fail@upi')
    start(consultation())
    await runPayment()
    usePayments.getState().select('pm2')
    const outcome = await runPayment()
    expect(outcome).toMatchObject({ ok: true, screen: 'booking-success' })
    expect(useAppointments.getState().items).toHaveLength(6)
  })

  it('reports nothing to pay when no intent is pending', async () => {
    await expect(runPayment()).resolves.toEqual({ ok: false, reason: 'No payment in progress.' })
  })
})

describe('pharmacy payment', () => {
  const intent = (): PaymentIntent => ({
    kind: 'pharmacy',
    amount: 245,
    title: 'Medicine order',
    subtitle: '3 items · Today, 5–8 PM',
    lines: useCart.getState().lines,
    address: 'Flat 402, Lotus',
    slot: 'Today, 5–8 PM',
    bill: buildBill(327, 25),
    itemCount: 3,
  })

  it('creates a tracked order and empties the cart', async () => {
    start(intent())
    const outcome = await runPayment()
    expect(outcome).toMatchObject({ ok: true, screen: 'order-tracking', params: { id: expect.stringMatching(/^KDC-PH-/) } })
    expect(useOrders.getState().pharmacy[0]).toMatchObject({ amount: 245, address: 'Flat 402, Lotus', etaWhen: 'Arriving Today · 5–8 PM' })
    expect(useCart.getState().lines).toHaveLength(0)
    expect(useCart.getState().prescription).toBeNull()
  })

  it('accepts cash on delivery', async () => {
    usePayments.getState().select('cod')
    start(intent())
    await expect(runPayment()).resolves.toMatchObject({ ok: true })
    expect(usePayments.getState().ledger[0].method).toBe('Cash on delivery')
  })
})

describe('diagnostic payment', () => {
  it('creates a booking and resets the draft', async () => {
    useDiagnosticsDraft.getState().setTest('t2')
    start({
      kind: 'diagnostic',
      amount: 524,
      title: 'Lipid Profile · Dr. Lal PathLabs',
      subtitle: 'Tue, 7 Oct · 7:00 – 8:00 AM',
      testId: 't2',
      labId: 'l1',
      method: 'Home Collection',
      date: { year: 2025, month: 9, day: 7 },
      time: '7:00 AM',
      address: 'Flat 402',
      bill: buildBill(699, 25),
      testName: 'Lipid Profile — Complete',
    })
    await expect(runPayment()).resolves.toMatchObject({ ok: true, screen: 'diagnostic-confirm' })
    const order = useOrders.getState().diagnostics[0]
    expect(order).toMatchObject({ testId: 't2', amount: 524, listed: 699, slot: '7:00 AM – 8:00 AM' })
    expect(useOrders.getState().lastDiagnosticId).toBe(order.id)
    expect(useDiagnosticsDraft.getState().testId).toBeNull()
  })
})

describe('membership payment', () => {
  it('activates the chosen plan', async () => {
    useMembership.getState().expire()
    start({ kind: 'membership', amount: 1769, title: 'KDC+ Plus · 6 months', subtitle: '', planId: 'half', planName: '6 months' })
    await expect(runPayment()).resolves.toMatchObject({ ok: true, screen: 'membership-success' })
    expect(useMembership.getState()).toMatchObject({ status: 'active', planId: 'half' })
  })
})

describe('consultation close-out', () => {
  it('completes the appointment and logs it once', async () => {
    useCall.getState().beginWaiting('a1')
    useCall.getState().enterCall()
    await finishConsultation()
    await finishConsultation()
    expect(useAppointments.getState().items[0].status).toBe('completed')
    expect(useRecords.getState().added).toHaveLength(1)
    expect(useCall.getState().lastDurationSeconds).toBe(0)
  })

  it('stores feedback on the attended appointment', () => {
    useCall.getState().beginWaiting('a1')
    submitConsultationFeedback({ rating: 3, tags: ['On time'], note: '' })
    expect(useAppointments.getState().items[0].feedback?.rating).toBe(3)
  })

  it('does nothing without an active appointment', async () => {
    useCall.getState().beginWaiting(null)
    await finishConsultation()
    expect(useRecords.getState().added).toHaveLength(0)
  })
})

describe('reorder', () => {
  it('adds a prescription to the cart with its link', () => {
    useCart.getState().clear()
    orderPrescription(getPrescription(undefined), 'Dr. Arjun Mehta')
    expect(useCart.getState().lines.map((l) => l.medicineId)).toEqual(['m1', 'm2', 'm3'])
    expect(useCart.getState().prescription).toEqual({ source: 'kdc', label: 'Dr. Arjun Mehta · KDC-RX-2025-48219' })
  })
})
