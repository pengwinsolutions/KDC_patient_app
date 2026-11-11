import {
  buildMonth,
  cancellationDeadline,
  clampMonthOffset,
  collectionWindow,
  consultationSlots,
  diagnosticSlots,
  formatAppointmentDate,
  formatDuration,
  formatLong,
  formatShort,
  formatShortYear,
  formatTimer,
  isSlotOpen,
  monthAt,
  MOCK_TODAY,
  type CalendarDate,
} from '../../src/domain/schedule'

const SEED_DATE: CalendarDate = { year: 2025, month: 9, day: 6 }

describe('date formats', () => {
  it('matches the blueprint strings', () => {
    expect(formatLong(SEED_DATE)).toBe('Monday, 6 October 2025')
    expect(formatShort(SEED_DATE)).toBe('Mon, 6 Oct')
    expect(formatShortYear(SEED_DATE)).toBe('Mon, 6 Oct 2025')
    expect(formatAppointmentDate(MOCK_TODAY)).toBe('Today, 5 Oct 2025')
  })

  it('formats call timers and durations', () => {
    expect(formatTimer(522)).toBe('08:42')
    expect(formatDuration(846)).toBe('14 min 06 sec')
  })
})

describe('month view', () => {
  const october = buildMonth(2025, 9)

  it('reproduces the October 2025 availability', () => {
    expect(october.startOffset).toBe(3)
    expect(october.days).toHaveLength(31)
    const available = (n: number) => october.days[n - 1].available
    expect(available(4)).toBe(false)
    expect(available(5)).toBe(true)
    expect(available(8)).toBe(false)
    for (const d of [12, 19, 26]) expect(available(d)).toBe(false)
    expect(available(6)).toBe(true)
    expect(october.days[4].today).toBe(true)
  })

  it('keeps month navigation inside the bookable window', () => {
    expect(clampMonthOffset(-1)).toBe(0)
    expect(clampMonthOffset(5)).toBe(2)
    expect(monthAt(0)).toEqual({ year: 2025, month: 9 })
    expect(monthAt(3)).toEqual({ year: 2026, month: 0 })
  })
})

describe('consultation slots', () => {
  it('matches the blueprint for the first doctor on the seeded date', () => {
    const groups = consultationSlots('d1', SEED_DATE, [], '5:30 PM')
    expect(groups.Morning.filter((s) => s.state === 'booked').map((s) => s.time)).toEqual(['9:00 AM', '10:30 AM'])
    expect(groups.Afternoon.filter((s) => s.state === 'booked').map((s) => s.time)).toEqual(['12:30 PM', '3:00 PM'])
    expect(groups.Evening.filter((s) => s.state === 'booked').map((s) => s.time)).toEqual(['6:30 PM'])
    expect(groups.Evening[1]).toEqual({ time: '5:30 PM', state: 'selected' })
  })

  it('selects exactly one slot across morning, afternoon and evening', () => {
    const groups = consultationSlots('d1', SEED_DATE, [], '10:00 AM')
    const selected = Object.values(groups).flat().filter((s) => s.state === 'selected')
    expect(selected).toEqual([{ time: '10:00 AM', state: 'selected' }])
  })

  it('blocks times the patient already holds', () => {
    const groups = consultationSlots('d1', SEED_DATE, ['2:00 PM'], null)
    expect(groups.Afternoon.find((s) => s.time === '2:00 PM')?.state).toBe('booked')
  })

  it('validates whether a time is still open', () => {
    expect(isSlotOpen('d1', SEED_DATE, [], '5:30 PM')).toBe(true)
    expect(isSlotOpen('d1', SEED_DATE, [], '6:30 PM')).toBe(false)
    expect(isSlotOpen('d1', SEED_DATE, [], null)).toBe(false)
  })
})

describe('diagnostic slots and windows', () => {
  it('matches the blueprint on the seeded day', () => {
    const groups = diagnosticSlots(7, '7:00 AM')
    expect(groups[0].slots.find((s) => s.time === '8:00 AM')?.state).toBe('booked')
    expect(groups[0].slots.find((s) => s.time === '7:00 AM')?.state).toBe('selected')
    expect(groups[1].slots.find((s) => s.time === '1:00 PM')?.state).toBe('booked')
  })

  it('formats a collection window', () => {
    expect(collectionWindow('7:00 AM')).toEqual({
      tight: '7:00–8:00 AM',
      compact: '7:00 – 8:00 AM',
      full: '7:00 AM – 8:00 AM',
    })
    expect(collectionWindow('12:00 PM').full).toBe('12:00 PM – 1:00 PM')
  })

  it('derives the cancellation deadline', () => {
    expect(cancellationDeadline('5:30 PM')).toBe('4:30 PM')
    expect(cancellationDeadline('12:00 PM')).toBe('11:00 AM')
    expect(cancellationDeadline('1:00 PM')).toBe('12:00 PM')
  })
})
