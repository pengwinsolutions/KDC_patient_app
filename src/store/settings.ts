import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { persistStorage } from './storage'
import { LIVE } from '../services/config'
import { savePreferences } from '../services/live/account'
import { errorMessage } from '../services/errors'
import { showToast } from './toast'

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
  /** Live: the server's preferences. */
  setAll: (values: { language: Language; toggles: Toggles }) => void
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
    (set, get) => {
      const rollback = (state: Partial<SettingsState>, e: unknown) => {
        set(state)
        showToast(errorMessage(e, 'Could not save the setting. Please try again.'), 'critical')
      }
      return {
      ...seed,
      setLanguage: (language) => {
        const before = get().language
        set({ language })
        if (LIVE) savePreferences({ language }).catch((e) => rollback({ language: before }, e))
      },
      toggle: (key) => {
        const before = get().toggles
        const on = !before[key]
        set({ toggles: { ...before, [key]: on } })
        if (!LIVE) return
        // Saved on the server, so the setting follows the patient to another phone.
        const change = key === 'faceIdLock' ? { security: { biometricLock: on } } : { notifications: { [key]: on } }
        savePreferences(change).catch((e) => rollback({ toggles: before }, e))
      },
      setAll: ({ language, toggles }) => set({ language, toggles }),
      reset: () => set(seed),
    }},
    { name: 'settings', storage: persistStorage },
  ),
)
