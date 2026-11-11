import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CollectionMethod } from '../types'
import type { CalendarDate } from '../domain/schedule'
import { persistStorage } from './storage'

interface DiagnosticsDraft {
  /** null until a test is chosen; screens then show their blueprint preview. */
  testId: string | null
  labId: string
  method: CollectionMethod
  date: CalendarDate
  time: string | null
}

interface DiagnosticsDraftState extends DiagnosticsDraft {
  setTest: (testId: string) => void
  setLab: (labId: string) => void
  setMethod: (method: CollectionMethod) => void
  setDay: (day: number) => void
  setTime: (time: string) => void
  reset: () => void
}

const seed: DiagnosticsDraft = {
  testId: null,
  labId: 'l1',
  method: 'Home Collection',
  date: { year: 2025, month: 9, day: 7 },
  time: '7:00 AM',
}

export const useDiagnosticsDraft = create<DiagnosticsDraftState>()(
  persist(
    (set) => ({
      ...seed,
      setTest: (testId) => set({ testId }),
      setLab: (labId) => set({ labId }),
      setMethod: (method) => set({ method }),
      setDay: (day) => set((s) => (s.date.day === day ? s : { date: { ...s.date, day }, time: null })),
      setTime: (time) => set({ time }),
      reset: () => set(seed),
    }),
    { name: 'diagnostics-draft', storage: persistStorage },
  ),
)

/** Test billed when none has been chosen yet. */
export const PREVIEW_BILLED_TEST = 't1'
/** Test described on pre-booking screens when none has been chosen yet. */
export const PREVIEW_DETAIL_TEST = 't2'
