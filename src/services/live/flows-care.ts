/**
 * Live booking: checkout (flows-payment.ts) asks this area to hold the slot first.
 * The server checks the slot is open, prices it (fee, member discount, platform fee) and
 * holds it for payment; the amount charged is the server's total.
 */
import type { PaymentIntent } from '../../flows/payment'
import { useAppointments } from '../../store/appointments'
import { useBooking } from '../../store/booking'
import { ServiceError } from '../errors'
import { holdAppointment } from './appointments'
import type { Hold } from './holds'
import { selfMemberId } from './me'
import { num } from './map'

export async function holdConsultation(intent: Extract<PaymentIntent, { kind: 'consultation' }>): Promise<Hold> {
  const memberId = Number(useBooking.getState().patientId || selfMemberId)
  if (!memberId) throw new ServiceError('invalid', 'Choose who the consultation is for.', 'memberId')
  const v = await holdAppointment({ doctorCode: intent.doctorId, memberId, mode: intent.mode, date: intent.date, time: intent.time })
  useAppointments.setState({ lastBookedId: v.code })
  return {
    purposeCode: v.code,
    amount: num(v.bill.total),
    online: v.paymentRequired,
    screen: 'booking-success',
    sync: ['appointments'],
  }
}
