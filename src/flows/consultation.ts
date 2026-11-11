import { showToast } from '../store/toast'
import { useAppointments } from '../store/appointments'
import { useCall } from '../store/call'
import { useRecords } from '../store/records'
import { getDoctor } from '../store/catalog'
import { useProfile } from '../store/profile'
import { MODE_LABEL } from './labels'
import type { Appointment, AppointmentFeedback } from '../types'

const shortDate = (a: Appointment) => a.date.replace(/^(Today, |\w+, )/, '')

/** Marks the consultation being attended as finished and logs it to the record. */
export async function finishConsultation() {
  const call = useCall.getState()
  call.endCall()
  const id = call.appointmentId
  if (!id) return
  const appointments = useAppointments.getState()
  const appointment = appointments.items.find((a) => a.id === id)
  if (!appointment || appointment.status === 'completed') return
  await appointments.complete(id)
  const doctor = getDoctor(appointment.doctorId)
  useRecords.getState().addEvent({
    type: 'consultation',
    title: `${MODE_LABEL[appointment.mode]} consultation — ${doctor.name}`,
    meta: `${doctor.specialty} · ${doctor.hospital}`,
    date: shortDate(appointment),
    time: appointment.time,
  })
}

export function submitConsultationFeedback(feedback: AppointmentFeedback) {
  const id = useCall.getState().appointmentId
  if (id) useAppointments.getState().saveFeedback(id, feedback)
  showToast('Thanks for your feedback', 'success', `${useProfile.getState().profile.firstName}, it stays anonymous to the doctor`)
}
