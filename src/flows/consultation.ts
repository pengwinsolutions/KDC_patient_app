import { showToast } from '../store/toast'
import { useAppointments } from '../store/appointments'
import { useCall } from '../store/call'
import { useRecords } from '../store/records'
import { getDoctor } from '../store/catalog'
import { useProfile } from '../store/profile'
import { MODE_LABEL } from './labels'
import type { Appointment, AppointmentFeedback } from '../types'
import { LIVE } from '../services/config'
import { errorMessage } from '../services/errors'

const shortDate = (a: Appointment) => a.date.replace(/^(Today, |\w+, )/, '')

/** Marks the consultation being attended as finished and logs it to the record. */
export async function finishConsultation() {
  const call = useCall.getState()
  call.endCall()
  const id = call.appointmentId
  if (!id) return
  if (LIVE) {
    // The doctor completes the consultation on the server; the patient leaves the room and reloads it.
    const { leaveSession } = require('../services/live/consultations') as typeof import('../services/live/consultations')
    await leaveSession(id).catch(() => undefined)
    await useAppointments.getState().complete(id).catch(() => undefined)
    return
  }
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

/** Live: sent to the server (once, for a completed consultation); resolves false when it couldn't be saved. */
export async function submitConsultationFeedback(feedback: AppointmentFeedback): Promise<boolean> {
  const id = useCall.getState().appointmentId
  try {
    if (id) await useAppointments.getState().saveFeedback(id, feedback)
  } catch (e) {
    showToast(errorMessage(e, 'We could not send your feedback. Please try again.'), 'critical')
    return false
  }
  showToast('Thanks for your feedback', 'success', `${useProfile.getState().profile.firstName}, it stays anonymous to the doctor`)
  return true
}
