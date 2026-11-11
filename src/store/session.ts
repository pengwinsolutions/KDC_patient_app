import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistStorage } from './storage'

interface SessionData {
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
    { name: 'session', storage: persistStorage },
  ),
)

/** Where a cold start should land for this session. */
export function initialRouteFor(session: Pick<SessionData, 'token' | 'profileComplete'>): 'main' | 'profile-setup' | 'splash' {
  if (!session.token) return 'splash'
  return session.profileComplete ? 'main' : 'profile-setup'
}
