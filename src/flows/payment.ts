import { create } from 'zustand'
import { LIVE } from '../services/config'
import type { Inflight } from '../services/live/flows-payment'
import type { BenefitArea, CartLine, CollectionMethod, ConsultMode, PaymentMethod, PaymentRecord } from '../types'
import type { Bill } from '../domain/pricing'
import { services } from '../services'
import { useAppointments } from '../store/appointments'
import { useBooking } from '../store/booking'
import { useDiagnosticsDraft } from '../store/diagnosticsDraft'
import { useCart } from '../store/cart'
import { useMembership } from '../store/membership'
import { useNotifications } from '../store/notifications'
import { useOrders } from '../store/orders'
import { describeMethod, methodById, usePayments } from '../store/payments'
import { useRecords } from '../store/records'
import type { CalendarDate } from '../domain/schedule'
import { MOCK_TODAY, formatShortYear } from '../domain/schedule'
import { plural } from '../domain/plural'

export type PaymentIntent = {
  amount: number
  /** Doctor name, or what is being bought — shown while processing. */
  title: string
  subtitle: string
} & (
  | {
      kind: 'consultation'
      doctorId: string
      mode: ConsultMode
      date: CalendarDate
      time: string
      location?: string
      patientLabel: string
      bill: Bill
      discountLabel?: string
    }
  | {
      kind: 'diagnostic'
      testId: string
      labId: string
      method: CollectionMethod
      date: CalendarDate
      time: string
      address: string
      bill: Bill
      testName: string
    }
  | { kind: 'pharmacy'; lines: CartLine[]; address: string; slot: string; bill: Bill; itemCount: number }
  | { kind: 'membership'; planId: string; planName: string }
)

interface CheckoutState {
  intent: PaymentIntent | null
  /** Live: the purchase the server is holding for this intent, kept so a retry pays the same one. */
  inflight: Inflight | null
  /** Live: why the last attempt didn't complete (the failed screen shows it). */
  lastFailure: Extract<PaymentOutcome, { ok: false }> | null
  start: (intent: PaymentIntent) => void
  clear: () => void
}

/** The payment in flight. Not persisted: a restart should never resume a charge. */
export const useCheckout = create<CheckoutState>((set) => ({
  intent: null,
  inflight: null,
  lastFailure: null,
  // A new intent keeps the hold only when it's the same purchase (flows-payment's purchaseKey decides).
  start: (intent) => set({ intent, lastFailure: null }),
  clear: () => set({ intent: null, inflight: null, lastFailure: null }),
}))

export type PaymentOutcome =
  | { ok: true; screen: string; params?: Record<string, unknown> }
  | { ok: false; reason: string; cancelled?: boolean; pending?: boolean; refunded?: boolean; /** The delivery pincode isn't served: nothing was charged; pick another address. */ notServiceable?: boolean }

const today = () => formatShortYear(MOCK_TODAY).replace(/^\w+, /, '')

const notify = useNotifications.getState

function recordSaving(area: BenefitArea, label: string, bill: Bill) {
  if (bill.discount > 0) {
    useMembership.getState().addSaving({
      id: `sv${Date.now().toString(36)}`,
      area,
      label,
      date: today(),
      listed: bill.base,
      saved: bill.discount,
    })
  }
}

function recordPayment(record: Omit<PaymentRecord, 'id' | 'date' | 'status' | 'method'>, method: PaymentMethod) {
  usePayments.getState().addRecord({ ...record, date: today(), status: 'paid', method: describeMethod(method) })
}

async function fulfil(intent: PaymentIntent, method: PaymentMethod): Promise<Extract<PaymentOutcome, { ok: true }>> {
  const paidVia = describeMethod(method)
  switch (intent.kind) {
    case 'consultation': {
      const appointment = await useAppointments.getState().book({
        doctorId: intent.doctorId,
        mode: intent.mode,
        date: intent.date,
        time: intent.time,
        location: intent.location,
        patientLabel: intent.patientLabel,
        paidVia,
        bill: intent.bill,
        discountLabel: intent.discountLabel,
      })
      useBooking.getState().clearSlot()
      recordPayment({ type: 'Consultation', title: intent.title, amount: intent.amount, ref: appointment.bookingId }, method)
      recordSaving('consultations', intent.title, intent.bill)
      notify().push({
        category: 'Appointments',
        title: 'Appointment confirmed',
        body: `${intent.title} · ${appointment.date}, ${appointment.time}`,
        time: 'Just now',
      })
      useRecords.getState().addEvent({
        type: 'followup',
        title: 'Consultation booked',
        meta: intent.title,
        date: today(),
        time: appointment.time,
      })
      return { ok: true, screen: 'booking-success' }
    }
    case 'diagnostic': {
      const order = await services.diagnostics.book({
        testId: intent.testId,
        labId: intent.labId,
        method: intent.method,
        date: intent.date,
        time: intent.time,
        address: intent.address,
        amount: intent.amount,
        listed: intent.bill.base,
      })
      useOrders.getState().addDiagnostic(order)
      useDiagnosticsDraft.getState().reset()
      recordPayment({ type: 'Diagnostics', title: intent.title, amount: intent.amount, ref: order.id }, method)
      recordSaving('diagnostics', intent.testName, intent.bill)
      notify().push({ category: 'Diagnostics', title: 'Test booked', body: `${intent.testName} · ${intent.subtitle}`, time: 'Just now' })
      useRecords.getState().addEvent({ type: 'lab', title: `${intent.testName} — booked`, meta: intent.title, date: today(), time: '' })
      return { ok: true, screen: 'diagnostic-confirm' }
    }
    case 'pharmacy': {
      const order = await services.pharmacy.placeOrder({
        lines: intent.lines,
        address: intent.address,
        slot: intent.slot,
        amount: intent.amount,
        payment: paidVia,
      })
      useOrders.getState().addPharmacy(order)
      useCart.getState().clear()
      recordPayment({ type: 'Pharmacy', title: `Medicine order — ${plural(intent.itemCount, 'item')}`, amount: intent.amount, ref: order.id }, method)
      recordSaving('pharmacy', `Medicine order · ${plural(intent.itemCount, 'item')}`, intent.bill)
      notify().push({ category: 'Pharmacy', title: 'Order placed', body: `${order.id} · ${order.etaWhen}`, time: 'Just now' })
      useRecords.getState().addEvent({ type: 'pharmacy', title: 'Medicines ordered', meta: `Order ${order.id} · ${plural(intent.itemCount, 'item')}`, date: today(), time: '' })
      return { ok: true, screen: 'order-tracking', params: { id: order.id } }
    }
    case 'membership':
      await useMembership.getState().activate(intent.planId)
      recordPayment({ type: 'Membership', title: `KDC+ Plus · ${intent.planName}`, amount: intent.amount, ref: intent.planId }, method)
      notify().push({ category: 'Payments', title: 'KDC+ Plus is active', body: `Your ${intent.planName} subscription has started`, time: 'Just now' })
      return { ok: true, screen: 'membership-success' }
  }
}

/** What was bought is gone from the drafts, as in the demo's checkout. */
function clearDrafts(intent: PaymentIntent) {
  if (intent.kind === 'pharmacy') useCart.getState().clear()
  else if (intent.kind === 'diagnostic') useDiagnosticsDraft.getState().reset()
  else if (intent.kind === 'consultation') useBooking.getState().clearSlot()
}

/**
 * Live: a payment that went through after the app stopped waiting (a late UPI or bank
 * confirmation). Returns the success outcome once the server has it, else null.
 */
export async function checkLatePayment(): Promise<PaymentOutcome | null> {
  const { intent, inflight, clear } = useCheckout.getState()
  if (!LIVE || !intent || !inflight) return null
  const live = require('../services/live/flows-payment') as typeof import('../services/live/flows-payment')
  const outcome = await live.confirmIfPaid(inflight, (f) => useCheckout.setState({ inflight: f }))
  if (outcome?.ok) {
    clearDrafts(intent)
    clear()
  }
  return outcome
}

/** Charges the current intent and, once paid, creates whatever it was for. */
export async function runPayment(): Promise<PaymentOutcome> {
  const { intent, clear } = useCheckout.getState()
  if (!intent) return { ok: false, reason: 'No payment in progress.' }
  if (LIVE) {
    const live = require('../services/live/flows-payment') as typeof import('../services/live/flows-payment')
    const outcome = await live.runLivePayment(intent, useCheckout.getState().inflight, (inflight) => useCheckout.setState({ inflight }))
    if (outcome.ok) {
      clearDrafts(intent)
      clear()
    } else useCheckout.setState({ lastFailure: outcome })
    return outcome
  }
  const payments = usePayments.getState()
  const method = methodById(payments.methods, payments.selectedMethodId)
  const result =
    method.kind === 'cod'
      ? ({ ok: true, reference: 'COD' } as const)
      : await services.payments.charge({ amount: intent.amount, method })
  if (!result.ok) return { ok: false, reason: result.reason }
  const outcome = await fulfil(intent, method)
  clear()
  return outcome
}
