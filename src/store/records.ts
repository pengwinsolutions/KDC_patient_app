import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimelineEvent } from '../types'
import { healthTimeline } from '../mock-data/mock'
import { persistStorage } from './storage'
import { LIVE } from '../services/config'
import { loadTimeline, type RecordCounts } from '../services/live/records'

interface RecordsState {
  /** Demo: events the app added on top of the blueprint's. Live: the server's timeline, newest first. */
  added: TimelineEvent[]
  /** Live: the timeline's member, how many events it has in all, and the pages loaded. */
  memberId: string
  total: number
  page: number
  /** Live: the records screen's counts, per member id. */
  counts: Record<string, RecordCounts>
  addEvent: (event: Omit<TimelineEvent, 'id'>) => void
  setTimeline: (memberId: string, events: TimelineEvent[], total: number) => void
  /** Live: the next page of the timeline. */
  loadMore: () => Promise<void>
  setCounts: (memberId: string, counts: RecordCounts) => void
  reset: () => void
}

const empty = { added: [] as TimelineEvent[], memberId: '', total: 0, page: 1, counts: {} as Record<string, RecordCounts> }

let serial = 0

export const useRecords = create<RecordsState>()(
  persist(
    (set, get) => ({
      ...empty,
      addEvent: (event) =>
        set((s) => ({ added: [{ ...event, id: `ev${Date.now().toString(36)}${serial++}` }, ...s.added] })),
      setTimeline: (memberId, added, total) => set({ memberId, added, total, page: 1 }),
      loadMore: async () => {
        const { memberId, page, added } = get()
        if (!LIVE || !memberId) return
        const next = await loadTimeline(memberId, page + 1)
        const seen = new Set(added.map((e) => e.id))
        set({ added: [...added, ...next.events.filter((e) => !seen.has(e.id))], total: next.total, page: page + 1 })
      },
      setCounts: (memberId, counts) => set((s) => ({ counts: { ...s.counts, [memberId]: counts } })),
      reset: () => set(empty),
    }),
    { name: 'records', storage: persistStorage, partialize: (s) => ({ added: s.added }) },
  ),
)

export const timelineEvents = (added: TimelineEvent[]) => (LIVE ? added : [...added, ...healthTimeline])

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
