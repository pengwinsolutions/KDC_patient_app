/**
 * The patient's side of a consultation on the backend: the waiting room polls the session,
 * joining marks the patient as present and returns the call credentials, leaving clears it.
 * The call itself runs on LiveKit (src/call).
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

/** What the app needs to join the call (LiveKit): one person, one consultation's room. */
export interface MediaCredentials {
  provider: string
  url: string
  roomId: string
  token: string
  expiresAt: string
}

export interface JoinResult {
  session: SessionView
  /** null until calls are set up on the server (Admin → Integrations → LiveKit). */
  media: MediaCredentials | null
  mediaUnavailableReason: string | null
}

/** Tells the server the call dropped or came back (shown to the doctor and on the admin monitor). */
export const reportConnection = (code: string, event: 'dropped' | 'reconnected') =>
  api.post(`patient/consultations/${encodeURIComponent(code)}/connection`, { event })

export const getSession = (code: string) => api.get<SessionView>(`patient/consultations/${encodeURIComponent(code)}`)

export const joinSession = (code: string) => api.post<JoinResult>(`patient/consultations/${encodeURIComponent(code)}/join`, {})

export const leaveSession = (code: string) => api.post(`patient/consultations/${encodeURIComponent(code)}/leave`, {})
