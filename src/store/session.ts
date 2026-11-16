import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LIVE } from '../services/config'
import { persistStorage } from './storage'

interface SessionData {
  /** Live: the access token, in memory only (the refresh token is in the Keychain). */
  token: string | null
  mobile: string | null
  /** Set while the patient is on the OTP step. */
  pendingMobile: string | null
  profileComplete: boolean
  onboarded: boolean
}

interface SessionState extends SessionData {
  setPendingMobile: (mobile: string) => void
  signIn: (token: string, mobile: string) => void
  completeProfile: () => void
  markOnboarded: () => void
  clear: () => void
}

const signedOut: Omit<SessionData, 'onboarded'> = {
  token: null,
  mobile: null,
  pendingMobile: null,
  profileComplete: false,
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...signedOut,
      onboarded: false,
      setPendingMobile: (pendingMobile) => set({ pendingMobile }),
      signIn: (token, mobile) => set({ token, mobile, pendingMobile: null }),
      completeProfile: () => set({ profileComplete: true }),
      markOnboarded: () => set({ onboarded: true }),
      clear: () => set(signedOut),
    }),
    {
      name: 'session',
      storage: persistStorage,
      // Live: the session itself is never on disk; whether the profile is complete comes from the server.
      partialize: (s) => (LIVE ? { onboarded: s.onboarded } : s),
    },
  ),
)

/** Where a cold start should land for this session. Live builds always start at the splash, which restores the session. */
export function initialRouteFor(session: Pick<SessionData, 'token' | 'profileComplete'>): 'main' | 'profile-setup' | 'splash' {
  if (LIVE || !session.token) return 'splash'
  return session.profileComplete ? 'main' : 'profile-setup'
}
