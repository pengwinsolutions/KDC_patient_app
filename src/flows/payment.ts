import { create } from 'zustand'
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
  start: (intent: PaymentIntent) => void
  clear: () => void
}

/** The payment in flight. Not persisted: a restart should never resume a charge. */
export const useCheckout = create<CheckoutState>((set) => ({
  intent: null,
  start: (intent) => set({ intent }),
  clear: () => set({ intent: null }),
}))

export type PaymentOutcome =
  | { ok: true; screen: string; params?: Record<string, unknown> }
  | { ok: false; reason: string }

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
      recordPayment({ type: 'Pharmacy', title: `Medicine order — ${intent.itemCount} items`, amount: intent.amount, ref: order.id }, method)
      recordSaving('pharmacy', `Medicine order · ${intent.itemCount} items`, intent.bill)
      notify().push({ category: 'Pharmacy', title: 'Order placed', body: `${order.id} · ${order.etaWhen}`, time: 'Just now' })
      useRecords.getState().addEvent({ type: 'pharmacy', title: 'Medicines ordered', meta: `Order ${order.id} · ${intent.itemCount} items`, date: today(), time: '' })
      return { ok: true, screen: 'order-tracking', params: { id: order.id } }
    }
    case 'membership':
      await useMembership.getState().activate(intent.planId)
      recordPayment({ type: 'Membership', title: `KDC+ Plus · ${intent.planName}`, amount: intent.amount, ref: intent.planId }, method)
      notify().push({ category: 'Payments', title: 'KDC+ Plus is active', body: `Your ${intent.planName} membership has started`, time: 'Just now' })
      return { ok: true, screen: 'membership-success' }
  }
}

/** Charges the current intent and, once paid, creates whatever it was for. */
export async function runPayment(): Promise<PaymentOutcome> {
  const { intent, clear } = useCheckout.getState()
  if (!intent) return { ok: false, reason: 'No payment in progress.' }
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
