import { create } from 'zustand'

interface CallState {
  appointmentId: string | null
  muted: boolean
  cameraOff: boolean
  speakerOn: boolean
  /** Epoch ms the live call began; null when no call has been entered. */
  startedAt: number | null
  /** Length of the call that just ended, in seconds. */
  lastDurationSeconds: number | null
  beginWaiting: (appointmentId: string | null) => void
  enterCall: () => void
  endCall: (now?: number) => void
  toggleMute: () => void
  toggleCamera: () => void
  toggleSpeaker: () => void
}

/** Live for the duration of one consultation; deliberately not persisted. */
export const useCall = create<CallState>((set) => ({
  appointmentId: null,
  muted: false,
  cameraOff: false,
  speakerOn: true,
  startedAt: null,
  lastDurationSeconds: null,
  beginWaiting: (appointmentId) =>
    set({ appointmentId, muted: false, cameraOff: false, speakerOn: true, startedAt: null, lastDurationSeconds: null }),
  enterCall: () => set({ startedAt: Date.now() }),
  endCall: (now = Date.now()) =>
    set((s) => ({
      lastDurationSeconds: s.startedAt ? Math.round((now - s.startedAt) / 1000) : s.lastDurationSeconds,
      startedAt: null,
    })),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleCamera: () => set((s) => ({ cameraOff: !s.cameraOff })),
  toggleSpeaker: () => set((s) => ({ speakerOn: !s.speakerOn })),
}))
