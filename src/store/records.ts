import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimelineEvent } from '../types'
import { healthTimeline } from '../mock-data/mock'
import { persistStorage } from './storage'

interface RecordsState {
  added: TimelineEvent[]
  addEvent: (event: Omit<TimelineEvent, 'id'>) => void
  reset: () => void
}

let serial = 0

export const useRecords = create<RecordsState>()(
  persist(
    (set) => ({
      added: [],
      addEvent: (event) =>
        set((s) => ({ added: [{ ...event, id: `ev${Date.now().toString(36)}${serial++}` }, ...s.added] })),
      reset: () => set({ added: [] }),
    }),
    { name: 'records', storage: persistStorage },
  ),
)

export const timelineEvents = (added: TimelineEvent[]) => [...added, ...healthTimeline]

const TIMELINE_FILTERS: Record<string, TimelineEvent['type'][]> = {
  Consultations: ['consultation', 'followup'],
  Prescriptions: ['prescription'],
  Reports: ['lab', 'report'],
  Pharmacy: ['pharmacy'],
}

export function filterTimeline(events: TimelineEvent[], filter: string): TimelineEvent[] {
  const types = TIMELINE_FILTERS[filter]
  return types ? events.filter((e) => types.includes(e.type)) : events
}

const MONTH_NAMES: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June',
  Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
}

const MONTH_ORDER = Object.keys(MONTH_NAMES)

/** Groups events by month, newest month first. */
export function groupByMonth(events: TimelineEvent[]): { month: string; items: TimelineEvent[] }[] {
  const months = [...new Set(events.map((e) => eventMonth(e.date)))]
  const key = (month: string) => {
    const [name, year] = month.split(' ')
    return Number(year) * 12 + MONTH_ORDER.findIndex((m) => MONTH_NAMES[m] === name)
  }
  return months
    .sort((a, b) => key(b) - key(a))
    .map((month) => ({ month, items: events.filter((e) => eventMonth(e.date) === month) }))
}

/** "October 2025" from an event dated "5 Oct 2025". */
export function eventMonth(date: string): string {
  const [, month, year] = date.split(' ')
  return `${MONTH_NAMES[month]} ${year}`
}
