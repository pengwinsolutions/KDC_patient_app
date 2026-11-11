import React, { useState } from 'react'
import { Div, P } from '../primitives'
import { SelectField } from './Inputs'
import { FilterChip } from './Display'
import { Button } from './Button'
import { SheetModal } from './Feedback'
import { HScroll } from './Nav'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)
const YEAR_CHIP_WIDTH = 76

interface Parts {
  day: number | null
  month: number | null
  year: number | null
}

const parse = (value?: string): Parts => {
  const [day, month, year] = value?.split(' ') ?? []
  const monthIndex = MONTHS.indexOf(month)
  return { day: Number(day) || null, month: monthIndex >= 0 ? monthIndex : null, year: Number(year) || null }
}

const daysIn = (month: number | null, year: number | null) =>
  month === null ? 31 : new Date(year ?? 2000, month + 1, 0).getDate()

/** A date-of-birth field: opens a bottom sheet and reports "14 Mar 1991". */
export function DateField({
  value,
  placeholder,
  sheetTitle,
  onChange,
}: {
  value?: string
  placeholder?: string
  sheetTitle: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [parts, setParts] = useState<Parts>(() => parse(value))
  const update = (changes: Partial<Parts>) =>
    setParts((p) => {
      const next = { ...p, ...changes }
      const max = daysIn(next.month, next.year)
      return next.day && next.day > max ? { ...next, day: max } : next
    })

  const complete = parts.day && parts.month !== null && parts.year
  const yearOffset = Math.max(0, YEARS.indexOf(parts.year ?? YEARS[0]) - 1) * YEAR_CHIP_WIDTH

  return (
    <>
      <SelectField
        value={value}
        placeholder={placeholder}
        onClick={() => {
          setParts(parse(value))
          setOpen(true)
        }}
      />
      <SheetModal
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle}
        footer={
          <Button
            disabled={!complete}
            onClick={() => {
              onChange(`${String(parts.day).padStart(2, '0')} ${MONTHS[parts.month!]} ${parts.year}`)
              setOpen(false)
            }}
          >
            Done
          </Button>
        }
      >
        <Div className="gap-4 pb-2">
          <Div>
            <P className="mb-2.5 text-title-sm text-ink-900">Year</P>
            <HScroll gap={8} padX={0} contentOffset={{ x: yearOffset, y: 0 }}>
              {YEARS.map((y) => (
                <FilterChip key={y} active={y === parts.year} onClick={() => update({ year: y })}>
                  {y}
                </FilterChip>
              ))}
            </HScroll>
          </Div>
          <Div>
            <P className="mb-2.5 text-title-sm text-ink-900">Month</P>
            <Div className="flex-row flex-wrap gap-2">
              {MONTHS.map((m, i) => (
                <FilterChip key={m} active={i === parts.month} onClick={() => update({ month: i })}>
                  {m}
                </FilterChip>
              ))}
            </Div>
          </Div>
          <Div>
            <P className="mb-2.5 text-title-sm text-ink-900">Day</P>
            <Div className="flex-row flex-wrap gap-2">
              {Array.from({ length: daysIn(parts.month, parts.year) }, (_, i) => i + 1).map((d) => (
                <FilterChip key={d} active={d === parts.day} onClick={() => update({ day: d })}>
                  {d}
                </FilterChip>
              ))}
            </Div>
          </Div>
        </Div>
      </SheetModal>
    </>
  )
}
