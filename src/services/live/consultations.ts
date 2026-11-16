/**
 * The patient's side of a consultation on the backend: the waiting room polls the session,
 * joining marks the patient as present, leaving clears it. There's no video or audio yet:
 * the media provider (decision D5) isn't chosen, so `media` is always null for now.
 */
import { api } from './http'

export interface SessionView {
  code: string
  appointmentCode: string
  mode: 'video' | 'audio' | 'clinic'
  state: 'waiting' | 'live' | 'dropped' | 'ended'
  appointmentStatus: string
  scheduledAt: string
  patientInRoom: boolean
  doctorJoined: boolean
  startedAt: string | null
  endedAt: string | null
  elapsedSeconds: number | null
}

export interface JoinResult {
  session: SessionView
  media: unknown | null
  mediaUnavailableReason: string | null
}

export const getSession = (code: string) => api.get<SessionView>(`patient/consultations/${encodeURIComponent(code)}`)

export const joinSession = (code: string) => api.post<JoinResult>(`patient/consultations/${encodeURIComponent(code)}/join`, {})

export const leaveSession = (code: string) => api.post(`patient/consultations/${encodeURIComponent(code)}/leave`, {})
