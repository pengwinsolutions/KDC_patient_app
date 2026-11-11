import type { Appointment, ConsultMode } from '../types'
import { formatAppointmentDate, toIso, MOCK_TODAY, type CalendarDate } from '../domain/schedule'
import type { Bill } from '../domain/pricing'
import { delay } from './latency'

export interface BookingRequest {
  doctorId: string
  mode: ConsultMode
  date: CalendarDate
  time: string
  location?: string
  patientLabel: string
  paidVia: string
  bill: Bill
  discountLabel?: string
}

export interface AppointmentsService {
  book(request: BookingRequest): Promise<Appointment>
  cancel(appointment: Appointment): Promise<Appointment>
  reschedule(appointment: Appointment, date: CalendarDate, time: string): Promise<Appointment>
  complete(appointment: Appointment): Promise<Appointment>
}

/** Same shape as the seeded references: KDC, YYMM, A, then four digits. */
function bookingId(date: CalendarDate, serial: number) {
  const yymm = `${String(date.year).slice(2)}${String(date.month + 1).padStart(2, '0')}`
  return `KDC${yymm}A${String(5000 + (serial % 5000)).padStart(4, '0')}`
}

let serial = 0
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(serial++).toString(36)}`

export const mockAppointmentsService: AppointmentsService = {
  book: (r) =>
    delay({
      id: uid('a'),
      bookingId: bookingId(r.date, Date.now() % 5000),
      doctorId: r.doctorId,
      mode: r.mode,
      date: formatAppointmentDate(r.date),
      dateIso: toIso(r.date),
      time: r.time,
      status: 'confirmed',
      fee: r.bill.base,
      platformFee: r.bill.platformFee,
      discount: r.bill.discount,
      discountLabel: r.discountLabel,
      location: r.location,
      for: r.patientLabel,
      paidVia: r.paidVia,
    }),
  cancel: (a) =>
    delay({
      ...a,
      status: 'cancelled',
      reason: 'Cancelled by patient · Refunded to source in 3 days',
      cancelledOn: `${formatAppointmentDate(MOCK_TODAY).replace('Today, ', '')}, 4:12 PM`,
    }),
  reschedule: (a, date, time) =>
    delay({ ...a, date: formatAppointmentDate(date), dateIso: toIso(date), time }),
  complete: (a) => delay({ ...a, status: 'completed' }),
}
