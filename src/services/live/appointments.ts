/**
 * The patient's appointments on the backend. Server views are mapped into the app's
 * Appointment type (id = the appointment code). Unpaid holds aren't shown: they become
 * appointments once paid, and lapse otherwise.
 */
import type { Appointment, AppointmentFeedback, ConsultMode } from '../../types'
import { formatAppointmentDate, from24h, fromIso, to24h, toIso, type CalendarDate } from '../../domain/schedule'
import { mergeCatalog, useCatalog } from '../../store/catalog'
import { NO_DOCTOR } from '../../store/catalog'
import { api, qs } from './http'
import { atToDay, atToTime, num } from './map'
import { photoUrl } from './doctors'

export interface AppointmentView {
  code: string
  status: 'pending_payment' | 'requested' | 'confirmed' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  mode: ConsultMode
  date: string
  time: string
  endTime: string
  startsAt: string
  endsAt: string
  durationMin: number
  isFollowUp: boolean
  reason: string | null
  lateMinutes: number | null
  prescriptionCode: string | null
  cancellation: { by: string | null; reason: string | null; at: string | null; lateFee: number | null; refundAmount: number | null } | null
  doctor: { code: string; name: string; specialty: string | null; photoUrl: string | null; clinic: { name: string | null; address: string | null; city: string | null } | null } | null
  member: { id: number; name: string; relation: string } | null
  bill: { fee: number; platformFee: number; memberDiscount: number; discountLabel: string | null; total: number }
  paymentStatus: string
  paidVia: string | null
  holdExpiresAt: string | null
  paymentRequired: boolean
  feedback: { rating: number; tags: string[]; note: string | null } | null
  canCancel: boolean
  canReschedule: boolean
  canGiveFeedback: boolean
}

const STATUS: Record<AppointmentView['status'], Appointment['status']> = {
  pending_payment: 'confirmed',
  requested: 'confirmed',
  confirmed: 'confirmed',
  waiting: 'in-progress',
  in_progress: 'in-progress',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'cancelled',
}

const BY: Record<string, string> = { patient: 'Cancelled by you', doctor: 'Cancelled by the doctor', admin: 'Cancelled by KDC+', system: 'Cancelled by KDC+' }

function cancelReason(v: AppointmentView): string | undefined {
  if (v.status === 'no_show') return 'Marked as not attended'
  if (v.status !== 'cancelled' || !v.cancellation) return undefined
  const who = BY[v.cancellation.by ?? ''] ?? 'Cancelled'
  const refund = num(v.cancellation.refundAmount)
  return refund > 0 ? `${who} · ₹${refund} refunded to source` : v.cancellation.reason ? `${who} · ${v.cancellation.reason}` : who
}

/** A doctor this patient has seen, known to the catalogue even if they've left the directory. */
function rememberDoctor(v: AppointmentView) {
  if (!v.doctor) return
  const existing = useCatalog.getState().doctors.find((d) => d.id === v.doctor!.code)
  if (existing) return
  mergeCatalog('doctors', [
    { ...NO_DOCTOR, id: v.doctor.code, name: v.doctor.name, specialty: v.doctor.specialty ?? '', photo: photoUrl(v.doctor.photoUrl), hospital: v.doctor.clinic?.name ?? '', locality: v.doctor.clinic?.city ?? '' },
  ])
}

export function toAppointment(v: AppointmentView): Appointment {
  rememberDoctor(v)
  const day = fromIso(v.date)
  const member = v.member
  const clinic = v.doctor?.clinic
  return {
    id: v.code,
    bookingId: v.code,
    doctorId: v.doctor?.code ?? '',
    mode: v.mode,
    date: formatAppointmentDate(day),
    dateIso: v.date,
    time: from24h(v.time),
    status: STATUS[v.status],
    fee: num(v.bill.fee),
    platformFee: num(v.bill.platformFee),
    discount: num(v.bill.memberDiscount),
    discountLabel: v.bill.discountLabel ?? undefined,
    location: v.mode === 'clinic' && clinic ? [clinic.name, clinic.address].filter(Boolean).join(', ') : undefined,
    for: member ? (member.relation === 'self' ? member.name : `${member.name} (${member.relation.charAt(0).toUpperCase()}${member.relation.slice(1)})`) : '',
    paidVia: v.paidVia ?? undefined,
    reason: cancelReason(v) ?? v.reason ?? undefined,
    cancelledOn: v.cancellation?.at ? `${atToDay(v.cancellation.at)}, ${atToTime(v.cancellation.at)}` : undefined,
    feedback: v.feedback ? { rating: v.feedback.rating, tags: v.feedback.tags, note: v.feedback.note ?? '' } : undefined,
    memberId: member ? String(member.id) : undefined,
    startsAt: v.startsAt,
    paymentStatus: v.paymentStatus,
    refundAmount: v.cancellation?.refundAmount != null ? num(v.cancellation.refundAmount) : undefined,
    lateFee: v.cancellation?.lateFee != null ? num(v.cancellation.lateFee) : undefined,
    lateMinutes: v.lateMinutes ?? undefined,
    canCancel: v.canCancel,
    canReschedule: v.canReschedule,
    canGiveFeedback: v.canGiveFeedback,
    prescriptionCode: v.prescriptionCode ?? undefined,
  }
}

async function scope(name: 'upcoming' | 'completed' | 'cancelled'): Promise<AppointmentView[]> {
  const page = await api.get<{ rows: AppointmentView[] }>(`patient/appointments${qs({ scope: name, limit: 50 })}`)
  return page.rows
}

/** Everything the appointments tab shows: upcoming (paid), completed, cancelled and missed. */
export async function listAppointments(): Promise<Appointment[]> {
  const [upcoming, completed, cancelled] = await Promise.all([scope('upcoming'), scope('completed'), scope('cancelled')])
  return [...upcoming.filter((v) => v.status !== 'pending_payment'), ...completed, ...cancelled].map(toAppointment)
}

export async function getAppointment(code: string): Promise<Appointment> {
  return toAppointment(await api.get<AppointmentView>(`patient/appointments/${encodeURIComponent(code)}`))
}

export interface CancelQuote {
  free: boolean
  freeUntil: string
  lateFee: number
  refundAmount: number | null
}

export async function cancellationQuote(code: string): Promise<CancelQuote> {
  const q = await api.get<CancelQuote>(`patient/appointments/${encodeURIComponent(code)}/cancellation`)
  return { ...q, lateFee: num(q.lateFee), refundAmount: q.refundAmount === null ? null : num(q.refundAmount) }
}

export async function cancelAppointment(code: string, reason?: string): Promise<Appointment> {
  return toAppointment(await api.post<AppointmentView>(`patient/appointments/${encodeURIComponent(code)}/cancel`, reason ? { reason } : {}))
}

export async function rescheduleAppointment(code: string, date: CalendarDate, time: string): Promise<Appointment> {
  return toAppointment(await api.post<AppointmentView>(`patient/appointments/${encodeURIComponent(code)}/reschedule`, { date: toIso(date), time: to24h(time) }))
}

export async function sendFeedback(code: string, f: AppointmentFeedback): Promise<void> {
  await api.post(`patient/appointments/${encodeURIComponent(code)}/feedback`, { rating: f.rating, tags: f.tags, ...(f.note.trim() ? { note: f.note.trim() } : {}) })
}

/** Holds a slot for payment (the consultation hold of checkout). */
export async function holdAppointment(body: { doctorCode: string; memberId: number; mode: ConsultMode; date: CalendarDate; time: string; reason?: string }): Promise<AppointmentView> {
  return api.post<AppointmentView>('patient/appointments', {
    doctorCode: body.doctorCode,
    memberId: body.memberId,
    mode: body.mode,
    date: toIso(body.date),
    time: to24h(body.time),
    ...(body.reason ? { reason: body.reason } : {}),
  })
}
