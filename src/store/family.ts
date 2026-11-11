import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FamilyMember } from '../types'
import { familyMembers } from '../mock-data/mock'
import { services } from '../services'
import type { NewFamilyMember } from '../services/account'
import { ageFromDob } from './profile'
import { persistStorage } from './storage'

interface FamilyState {
  members: FamilyMember[]
  add: (member: NewFamilyMember) => Promise<FamilyMember>
  update: (id: string, changes: NewFamilyMember) => Promise<void>
  remove: (id: string) => Promise<void>
  reset: () => void
}

export const useFamily = create<FamilyState>()(
  persist(
    (set, get) => ({
      members: familyMembers,
      add: async (member) => {
        const added = await services.family.add(member, ageFromDob(member.dob))
        set((s) => ({ members: [...s.members, added] }))
        return added
      },
      update: async (id, changes) => {
        const current = get().members.find((m) => m.id === id)
        if (!current) throw new Error(`Unknown member ${id}`)
        const updated = await services.family.update({ ...current, ...changes, age: ageFromDob(changes.dob) })
        set((s) => ({ members: s.members.map((m) => (m.id === id ? updated : m)) }))
      },
      remove: async (id) => {
        await services.family.remove(id)
        set((s) => ({ members: s.members.filter((m) => m.id !== id) }))
      },
      reset: () => set({ members: familyMembers }),
    }),
    { name: 'family', storage: persistStorage },
  ),
)

/** How a family member is named on a booking. */
export const patientLabel = (m: FamilyMember) => (m.primary ? m.name : `${m.name} (${m.relation})`)
