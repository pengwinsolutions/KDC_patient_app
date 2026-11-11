/** Dates and slots for booking. `month` is zero-based, as in `Date`. */
export interface CalendarDate {
  year: number
  month: number
  day: number
}

export type Period = 'Morning' | 'Afternoon' | 'Evening'
export type SlotState = 'free' | 'booked' | 'selected'
export interface SlotView {
  time: string
  state: SlotState
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const MONTH_NAMES = MONTHS

/** The prototype's "today": every seeded record is dated relative to it. */
export const MOCK_TODAY: CalendarDate = { year: 2025, month: 9, day: 5 }

/** How far ahead a patient may book, counted in months from today. */
export const BOOKING_MONTHS_AHEAD = 2

const pad = (n: number) => String(n).padStart(2, '0')
const weekday = (d: CalendarDate) => new Date(d.year, d.month, d.day).getDay()

export const toIso = (d: CalendarDate) => `${d.year}-${pad(d.month + 1)}-${pad(d.day)}`
export const sameDate = (a: CalendarDate, b: CalendarDate) => toIso(a) === toIso(b)

/** "Monday, 6 October 2025" */
export const formatLong = (d: CalendarDate) =>
  `${WEEKDAYS[weekday(d)]}, ${d.day} ${MONTHS[d.month]} ${d.year}`

/** "Mon, 6 Oct" */
export const formatShort = (d: CalendarDate) =>
  `${WEEKDAYS[weekday(d)].slice(0, 3)}, ${d.day} ${MONTHS[d.month].slice(0, 3)}`

/** "Mon, 6 Oct 2025" */
export const formatShortYear = (d: CalendarDate) => `${formatShort(d)} ${d.year}`

/** The label an appointment carries in lists, naming today as such. */
export const formatAppointmentDate = (d: CalendarDate) =>
  sameDate(d, MOCK_TODAY) ? `Today, ${d.day} ${MONTHS[d.month].slice(0, 3)} ${d.year}` : formatShortYear(d)

/* ----------------------------------------------------------- Month grid */

export interface MonthView {
  label: string
  year: number
  startOffset: number
  days: { date: number; available: boolean; today: boolean }[]
}

const isClosedDay = (d: CalendarDate) => d.day === 8 || (weekday(d) === 0 && !sameDate(d, MOCK_TODAY))

export function buildMonth(year: number, month: number): MonthView {
  const count = new Date(year, month + 1, 0).getDate()
  const startOffset = new Date(year, month, 1).getDay()
  const todayIso = toIso(MOCK_TODAY)
  const days = Array.from({ length: count }, (_, i) => {
    const d = { year, month, day: i + 1 }
    return { date: i + 1, available: toIso(d) >= todayIso && !isClosedDay(d), today: toIso(d) === todayIso }
  })
  return { label: MONTHS[month], year, startOffset, days }
}

/** Steps a month offset within the bookable window. */
export function clampMonthOffset(offset: number): number {
  return Math.min(Math.max(offset, 0), BOOKING_MONTHS_AHEAD)
}

export function monthAt(offset: number): { year: number; month: number } {
  const total = MOCK_TODAY.month + offset
  return { year: MOCK_TODAY.year + Math.floor(total / 12), month: ((total % 12) + 12) % 12 }
}

/* --------------------------------------------------- Consultation slots */

const CONSULT_SLOTS: Record<Period, string[]> = {
  Morning: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  Afternoon: ['12:00 PM', '12:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM'],
  Evening: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM'],
}

const CONSULT_BOOKED: Record<Period, number[]> = { Morning: [0, 3], Afternoon: [1, 4], Evening: [3] }

/** Which slots are gone varies by doctor and day, deterministically. */
function bookedOffset(doctorId: string, date: CalendarDate): number {
  const doctorNumber = Number(doctorId.replace(/\D/g, '')) || 1
  return (((doctorNumber + date.day - 7) % 6) + 6) % 6
}

function periodSlots(all: string[], bookedIdx: number[], offset: number, taken: string[], selected: string | null): SlotView[] {
  const booked = new Set(bookedIdx.map((i) => (i + offset) % all.length))
  return all.map((time, i) => ({
    time,
    state: booked.has(i) || taken.includes(time) ? 'booked' : time === selected ? 'selected' : 'free',
  }))
}

export function consultationSlots(
  doctorId: string,
  date: CalendarDate,
  taken: string[],
  selected: string | null,
): Record<Period, SlotView[]> {
  const offset = bookedOffset(doctorId, date)
  return {
    Morning: periodSlots(CONSULT_SLOTS.Morning, CONSULT_BOOKED.Morning, offset, taken, selected),
    Afternoon: periodSlots(CONSULT_SLOTS.Afternoon, CONSULT_BOOKED.Afternoon, offset, taken, selected),
    Evening: periodSlots(CONSULT_SLOTS.Evening, CONSULT_BOOKED.Evening, offset, taken, selected),
  }
}

/** Whether a time can still be taken on that date. */
export function isSlotOpen(doctorId: string, date: CalendarDate, taken: string[], time: string | null): boolean {
  if (!time) return false
  const groups = consultationSlots(doctorId, date, taken, null)
  return Object.values(groups).some((slots) => slots.some((s) => s.time === time && s.state === 'free'))
}

/* ---------------------------------------------------- Diagnostic slots */

const DIAGNOSTIC_SLOTS: { period: 'Morning' | 'Afternoon'; times: string[]; booked: number[] }[] = [
  { period: 'Morning', times: ['6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM'], booked: [3] },
  { period: 'Afternoon', times: ['12:00 PM', '1:00 PM', '2:00 PM'], booked: [1] },
]

export function diagnosticSlots(day: number, selected: string | null): { period: 'Morning' | 'Afternoon'; slots: SlotView[] }[] {
  return DIAGNOSTIC_SLOTS.map((g) => ({
    period: g.period,
    slots: periodSlots(g.times, g.booked, (day + g.times.length - 7) % g.times.length, [], selected),
  }))
}

/* ---------------------------------------------------- Time formatting */

function toMinutes(time: string): number {
  const [clock, meridiem] = time.split(' ')
  const [hours, minutes] = clock.split(':').map(Number)
  return ((hours % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + minutes
}

function fromMinutes(total: number): { clock: string; meridiem: 'AM' | 'PM' } {
  const wrapped = ((total % 1440) + 1440) % 1440
  const hours = Math.floor(wrapped / 60)
  const minutes = wrapped % 60
  return { clock: `${hours % 12 || 12}:${pad(minutes)}`, meridiem: hours >= 12 ? 'PM' : 'AM' }
}

/** The free-cancellation cut-off: one hour before the appointment. */
export function cancellationDeadline(time: string): string {
  const { clock, meridiem } = fromMinutes(toMinutes(time) - 60)
  return `${clock} ${meridiem}`
}

/** One-hour collection window, in the three forms the blueprint prints. */
export function collectionWindow(time: string) {
  const start = fromMinutes(toMinutes(time))
  const end = fromMinutes(toMinutes(time) + 60)
  return {
    /** "7:00–8:00 AM" */
    tight: `${start.clock}–${end.clock} ${end.meridiem}`,
    /** "7:00 – 8:00 AM" */
    compact: `${start.clock} – ${end.clock} ${end.meridiem}`,
    /** "7:00 AM – 8:00 AM" */
    full: `${start.clock} ${start.meridiem} – ${end.clock} ${end.meridiem}`,
  }
}

const CONSULT_MINUTES = { video: 15, audio: 12, clinic: 20 } as const

export const consultMinutes = (mode: keyof typeof CONSULT_MINUTES) => CONSULT_MINUTES[mode]

/** "08:42" */
export const formatTimer = (seconds: number) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`

/** "14 min 06 sec" */
export const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)} min ${pad(seconds % 60)} sec`
