import { Btn, Div, P, Span } from '../primitives/index'
import React from 'react'
import { useLocal } from '../../hooks/useLocal'
import { ChevronLeft, ChevronRight, Sunrise, Sun, Sunset } from '../primitives/icons'
import type { SlotView } from '../../domain/schedule'

/* ------------------------------------------------------- Horizontal strip */

export type DayCell = { date: number; dow: string; slots: number; disabled?: boolean }

/** Compact week strip used inline on doctor profiles and quick re-booking. */
export function DateStrip({
  days,
  selected,
  onSelect,
}: {
  days: DayCell[]
  selected: number
  onSelect?: (d: number) => void
}) {
  const [current, select] = useLocal(selected, onSelect)
  return (
    <Div className=" flex-row gap-2.5 overflow-x-auto px-5">
      {days.map((d) => {
        const on = d.date === current
        return (
          <Btn
            key={d.date}
            disabled={d.disabled}
            onPress={() => select(d.date)}
            className={`tap  w-[62px] shrink-0 flex-col items-center gap-[3px] rounded-tile py-3  ${
              d.disabled
                ? 'bg-ink-50 opacity-45'
                : on
                  ? 'bg-brand-600 shadow-cta'
                  : 'bg-white ring-1 ring-inset  ring-ink-100'
            }`}
          >
            <Span className={`text-caption font-medium ${on ? 'text-white/70' : 'text-ink-400'}`}>{d.dow}</Span>
            <Span className={`text-title-sm tabular-nums ${on ? 'text-white' : 'text-ink-900'}`}>{d.date}</Span>
            <Span className={`text-[10px] font-semibold ${on ? 'text-white/80' : d.slots ? 'text-vital-600' : 'text-ink-300'}`}>
              {d.disabled ? '—' : `${d.slots} slots`}
            </Span>
          </Btn>
        )
      })}
    </Div>
  )
}

/* ------------------------------------------------------------- Month grid */

export type CalendarDay = { date: number; available: boolean; today?: boolean }

export function Calendar({
  month,
  year,
  startOffset,
  days,
  selected,
  onSelect,
  onPrev,
  onNext,
}: {
  month: string
  year: number
  /** Weekday index (0 = Sun) the 1st falls on */
  startOffset: number
  days: CalendarDay[]
  selected?: number
  onSelect?: (d: number) => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const [current, select] = useLocal<number | undefined>(selected, onSelect as (d?: number) => void)
  return (
    <Div className="rounded-card bg-white p-4 shadow-tile">
      <Div className="mb-3 flex-row items-center justify-between">
        <Btn onPress={onPrev} className="tap flex-col h-[32px] w-[32px] items-center justify-center rounded-full bg-ink-50">
          <ChevronLeft className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.4} />
        </Btn>
        <P className="text-title-sm text-ink-900">
          {month} {year}
        </P>
        <Btn onPress={onNext} className="tap flex-col h-[32px] w-[32px] items-center justify-center rounded-full bg-ink-50">
          <ChevronRight className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.4} />
        </Btn>
      </Div>

      <Div className="mb-1.5  grid-cols-7">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Span key={i} className="text-center text-caption font-semibold text-ink-300">
            {d}
          </Span>
        ))}
      </Div>

      <Div className=" grid-cols-7 gap-y-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <Span key={`pad-${i}`} />
        ))}
        {days.map((d) => {
          const on = d.date === current
          return (
            <Div key={d.date} className="flex-row justify-center py-[2px]">
              <Btn
                disabled={!d.available}
                onPress={() => select(d.date)}
                className={`tap relative flex-col h-[38px] w-[38px] items-center justify-center rounded-[13px] text-body-lg tabular-nums  ${
                  on
                    ? 'bg-brand-600 font-bold text-white shadow-cta'
                    : d.available
                      ? 'font-semibold text-ink-900 hover:bg-brand-50'
                      : 'font-normal text-ink-200'
                }`}
              >
                {d.date}
                {d.available && !on && (
                  <Span className="absolute bottom-[5px] h-[3px] w-[3px] rounded-full bg-vital-600" />
                )}
                {d.today && !on && (
                  <Span className="absolute inset-0 rounded-[13px] ring-[1.5px] ring-inset  ring-brand-200" />
                )}
              </Btn>
            </Div>
          )
        })}
      </Div>

      <Div className="mt-3 flex-row items-center gap-4 border-t border-ink-100 pt-3">
        <Span className="flex-row items-center gap-1.5 text-caption text-ink-500">
          <Span className="h-[6px] w-[6px] rounded-full bg-vital-600" /> Available
        </Span>
        <Span className="flex-row items-center gap-1.5 text-caption text-ink-500">
          <Span className="h-[6px] w-[6px] rounded-full bg-ink-200" /> Unavailable
        </Span>
      </Div>
    </Div>
  )
}

/* ------------------------------------------------------------- Time slots */

export type Slot = SlotView

const PERIOD_META = {
  Morning: { Icon: Sunrise, range: '9:00 AM – 12:00 PM' },
  Afternoon: { Icon: Sun, range: '12:00 PM – 4:00 PM' },
  Evening: { Icon: Sunset, range: '4:00 PM – 9:00 PM' },
} as const

export function SlotGroup({
  period,
  slots,
  onSelect,
}: {
  period: keyof typeof PERIOD_META
  slots: Slot[]
  onSelect?: (t: string) => void
}) {
  const { Icon, range } = PERIOD_META[period]
  const free = slots.filter((s) => s.state !== 'booked').length
  return (
    <Div>
      <Div className="mb-3 flex-row items-center gap-2.5">
        <Span className="flex-col h-[28px] w-[28px] items-center justify-center rounded-[9px] bg-brand-50">
          <Icon className="h-[15px] w-[15px] text-brand-600" strokeWidth={2.2} />
        </Span>
        <Div className="flex-1">
          <P className="text-title-sm text-ink-900">{period}</P>
          <P className="text-caption text-ink-400">{range}</P>
        </Div>
        <Span className="text-caption font-semibold text-vital-700">{free} available</Span>
      </Div>
      <Div className=" grid-cols-3 gap-2.5">
        {slots.map((s) => (
          <Btn
            key={s.time}
            disabled={s.state === 'booked'}
            onPress={() => onSelect?.(s.time)}
            className={`tap relative h-[42px] rounded-chip text-body-sm font-semibold tabular-nums  ${
              s.state === 'selected'
                ? 'bg-brand-600 text-white shadow-cta'
                : s.state === 'booked'
                  ? 'bg-ink-50 text-ink-300'
                  : 'bg-white text-ink-800 ring-1 ring-inset  ring-ink-200'
            }`}
          >
            {s.time}
            {s.state === 'booked' && (
              <Span className="absolute left-1/2 top-1/2 h-[1px] w-[34px] -translate-x-1/2 -translate-y-1/2 rotate-[-12deg] bg-ink-200" />
            )}
          </Btn>
        ))}
      </Div>
    </Div>
  )
}
