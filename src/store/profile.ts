import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MedicalInfo, Profile } from '../types'
import { medicalInfo, patient } from '../mock-data/mock'
import { persistStorage } from './storage'

interface ProfileState {
  profile: Profile
  medical: MedicalInfo
  setProfile: (profile: Profile) => void
  setMedical: (medical: MedicalInfo) => void
  reset: () => void
}

const seed = { profile: patient, medical: medicalInfo }

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      ...seed,
      setProfile: (profile) => set({ profile }),
      setMedical: (medical) => set({ medical }),
      reset: () => set(seed),
    }),
    { name: 'profile', storage: persistStorage },
  ),
)

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Whole years between a "14 Mar 1991" style date and `now`. */
export function ageFromDob(dob: string, now = new Date()): number {
  const [day, month, year] = dob.split(' ')
  const monthIndex = SHORT_MONTHS.indexOf(month)
  const hadBirthday =
    now.getMonth() > monthIndex || (now.getMonth() === monthIndex && now.getDate() >= Number(day))
  return now.getFullYear() - Number(year) - (hadBirthday ? 0 : 1)
}
