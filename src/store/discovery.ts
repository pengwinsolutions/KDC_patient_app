import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  NO_FILTERS,
  SHEET_DEFAULTS,
  type DoctorFilters,
  type DoctorQuery,
  type SortKey,
} from '../domain/doctorSearch'
import { persistStorage } from './storage'

export interface RecentSearch {
  label: string
  /** Recents that open a doctor directly rather than a results list. */
  doctorId?: string
}

const SEED_RECENTS: RecentSearch[] = [
  { label: 'Cardiologist' },
  { label: 'Dr. Sanjay Iyer', doctorId: 'd5' },
  { label: 'Cardiologist in Kompally' },
  { label: 'Paediatrician near me' },
]

interface DiscoveryState {
  recents: RecentSearch[]
  savedDoctorIds: string[]
  /** True until the patient narrows the list: only then does it show real counts. */
  pristine: boolean
  query: DoctorQuery
  setText: (text: string) => void
  applySearch: (text: string) => void
  applySpecialty: (specialty: string) => void
  applyFilters: (filters: DoctorFilters) => void
  applySort: (sort: SortKey) => void
  showAll: () => void
  removeRecent: (label: string) => void
  clearRecents: () => void
  toggleSaved: (doctorId: string) => void
  reset: () => void
}

const initialQuery: DoctorQuery = { text: '', filters: NO_FILTERS, sort: 'Relevance' }

/** The filters the sheet should open with for this list. */
export function sheetFiltersFor(state: Pick<DiscoveryState, 'pristine' | 'query'>): DoctorFilters {
  return state.pristine ? SHEET_DEFAULTS : state.query.filters
}

export const useDiscovery = create<DiscoveryState>()(
  persist(
    (set) => ({
      recents: SEED_RECENTS,
      savedDoctorIds: [],
      pristine: true,
      query: initialQuery,
      setText: (text) => set((s) => ({ query: { ...s.query, text }, pristine: false })),
      applySearch: (text) =>
        set((s) => {
          const label = text.trim()
          return {
            pristine: false,
            query: { text: label, filters: NO_FILTERS, sort: s.query.sort },
            recents: label ? [{ label }, ...s.recents.filter((r) => r.label !== label)].slice(0, 6) : s.recents,
          }
        }),
      applySpecialty: (specialty) =>
        set((s) => ({ pristine: false, query: { text: '', filters: { ...NO_FILTERS, specialty }, sort: s.query.sort } })),
      applyFilters: (filters) => set((s) => ({ pristine: false, query: { ...s.query, filters } })),
      applySort: (sort) => set((s) => ({ pristine: false, query: { ...s.query, sort } })),
      showAll: () => set((s) => ({ pristine: false, query: { ...initialQuery, sort: s.query.sort } })),
      removeRecent: (label) => set((s) => ({ recents: s.recents.filter((r) => r.label !== label) })),
      clearRecents: () => set({ recents: [] }),
      toggleSaved: (doctorId) =>
        set((s) => ({
          savedDoctorIds: s.savedDoctorIds.includes(doctorId)
            ? s.savedDoctorIds.filter((id) => id !== doctorId)
            : [...s.savedDoctorIds, doctorId],
        })),
      reset: () => set({ recents: SEED_RECENTS, savedDoctorIds: [], pristine: true, query: initialQuery }),
    }),
    {
      name: 'discovery',
      storage: persistStorage,
      partialize: (s) => ({ recents: s.recents, savedDoctorIds: s.savedDoctorIds }),
    },
  ),
)
