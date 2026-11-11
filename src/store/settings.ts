import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistStorage } from './storage'

export const LANGUAGES = [
  { label: 'English', native: 'English' },
  { label: 'Hindi', native: 'हिन्दी' },
  { label: 'Telugu', native: 'తెలుగు' },
] as const

export type Language = (typeof LANGUAGES)[number]['label']

export interface Toggles {
  appointmentReminders: boolean
  prescriptionRefills: boolean
  orderUpdates: boolean
  offers: boolean
  faceIdLock: boolean
}

interface SettingsState {
  language: Language
  toggles: Toggles
  setLanguage: (language: Language) => void
  toggle: (key: keyof Toggles) => void
  reset: () => void
}

const seed = {
  language: 'English' as Language,
  toggles: {
    appointmentReminders: true,
    prescriptionRefills: true,
    orderUpdates: true,
    offers: false,
    faceIdLock: true,
  },
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...seed,
      setLanguage: (language) => set({ language }),
      toggle: (key) => set((s) => ({ toggles: { ...s.toggles, [key]: !s.toggles[key] } })),
      reset: () => set(seed),
    }),
    { name: 'settings', storage: persistStorage },
  ),
)
