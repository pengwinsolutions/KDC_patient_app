import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CollectionMethod } from '../types'
import type { CalendarDate } from '../domain/schedule'
import { LIVE } from '../services/config'
import { MOCK_TODAY } from '../domain/schedule'
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
  /** Live: a date in the next days, which may fall in the next month. */
  setDate: (date: CalendarDate) => void
  setTime: (time: string) => void
  reset: () => void
}

/** Live: nothing chosen; the slot screen starts on tomorrow. */
const tomorrow = (): CalendarDate => {
  const d = new Date(Date.UTC(MOCK_TODAY.year, MOCK_TODAY.month, MOCK_TODAY.day + 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() }
}

const seed: DiagnosticsDraft = LIVE
  ? { testId: null, labId: '', method: 'Home Collection', date: tomorrow(), time: null }
  : {
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
      // Live: a different test can't keep the lab (it may not offer it) or its slot.
      setTest: (testId) => set((s) => (LIVE && s.testId !== testId ? { testId, labId: '', time: null } : { testId })),
      setLab: (labId) => set({ labId }),
      setMethod: (method) => set({ method }),
      setDay: (day) => set((s) => (s.date.day === day ? s : { date: { ...s.date, day }, time: null })),
      setDate: (date) =>
        set((s) => (s.date.year === date.year && s.date.month === date.month && s.date.day === date.day ? s : { date, time: null })),
      setTime: (time) => set({ time }),
      reset: () => set(LIVE ? { ...seed, date: tomorrow() } : seed),
    }),
    { name: 'diagnostics-draft', storage: persistStorage },
  ),
)

/** Test billed when none has been chosen yet. */
export const PREVIEW_BILLED_TEST = 't1'
/** Test described on pre-booking screens when none has been chosen yet. */
export const PREVIEW_DETAIL_TEST = 't2'
