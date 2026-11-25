import React, { useState } from 'react'
import { Platform } from 'react-native'
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Div, P } from '../primitives'
import { SelectField } from './Inputs'
import { Button } from './Button'
import { SheetModal } from './Feedback'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "14 Mar 1991" ↔ a local Date (the forms and the server mapping use this text). */
const parse = (value?: string): Date | null => {
  const [day, month, year] = value?.split(' ') ?? []
  const monthIndex = MONTHS.indexOf(month)
  if (!Number(day) || monthIndex < 0 || !Number(year)) return null
  return new Date(Number(year), monthIndex, Number(day))
}
const format = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`

/** The same calendar day as `d` (local), at UTC midnight; and the day a UTC midnight stands for. */
const utcDay = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
const formatUtc = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`

const LONG_MONTHS =['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** Completed years on `today`. */
const ageOn = (birth: Date, today = new Date()) => {
  const had = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  return today.getFullYear() - birth.getFullYear() - (had ? 0 : 1)
}
const ageText = (birth: Date) => {
  const years = ageOn(birth)
  return years < 1 ? 'Under 1 year old' : `${years} ${years === 1 ? 'year' : 'years'} old`
}

/** KDC+ palette (tailwind.config.js), for the native picker's own colours. */
const BRAND_600 = '#0068C8'
const INK_900 = '#071724'

/** Births run from 120 years ago to today; an empty field opens on 1 Jan, 25 years back. */
const limits = () => {
  const today = new Date()
  return {
    minimumDate: new Date(today.getFullYear() - 120, 0, 1),
    maximumDate: today,
    initial: new Date(today.getFullYear() - 25, 0, 1),
  }
}

/**
 * A date-of-birth field on the platform's own date picker: the system dialog on Android, the
 * native wheel in a sheet (with Done) on iOS. Reports "14 Mar 1991".
 */
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
  const [draft, setDraft] = useState<Date>(() => parse(value) ?? limits().initial)

  const show = () => {
    const { minimumDate, maximumDate, initial } = limits()
    const current = parse(value) ?? initial
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        // Material's picker works on UTC midnights, and the library hands it the local timestamp,
        // so east of UTC it opened a day early (1 Jan showed as 31 Dec in India). Speak UTC both ways.
        value: utcDay(current),
        timeZoneName: 'UTC',
        mode: 'date',
        // Material 3 dialog, coloured by AppTheme (android/app/src/main/res/values/styles.xml).
        design: 'material',
        title: sheetTitle,
        initialInputMode: 'default',
        minimumDate: utcDay(minimumDate),
        maximumDate: utcDay(maximumDate),
        // "set" is OK; "dismissed" (Cancel, back, tap outside) keeps the old value.
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === 'set' && date) onChange(formatUtc(date))
        },
      })
      return
    }
    setDraft(current)
    setOpen(true)
  }

  return (
    <>
      <SelectField value={value} placeholder={placeholder} onClick={show} />
      {Platform.OS !== 'android' && (
        <SheetModal
          visible={open}
          onClose={() => setOpen(false)}
          title={sheetTitle}
          footer={
            <Button
              onClick={() => {
                onChange(format(draft))
                setOpen(false)
              }}
            >
              Done
            </Button>
          }
        >
          <Div className="items-center pb-2">
            {/* The chosen date in full, with the age it gives: updates as the wheel turns. */}
            <Div className="w-full items-center rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4">
              <P className="text-body-sm font-semibold uppercase tracking-[1.2px] text-brand-700">{WEEKDAYS[draft.getDay()]}</P>
              <P className="mt-1 font-display text-title-lg text-ink-900">
                {draft.getDate()} {LONG_MONTHS[draft.getMonth()]} {draft.getFullYear()}
              </P>
              <Div className="mt-2 rounded-full bg-white px-3 py-1">
                <P className="text-body-sm font-semibold text-brand-600">{ageText(draft)}</P>
              </Div>
            </Div>
            <DateTimePicker
              testID="date-of-birth-picker"
              value={draft}
              mode="date"
              display="spinner"
              themeVariant="light"
              accentColor={BRAND_600}
              textColor={INK_900}
              minimumDate={limits().minimumDate}
              maximumDate={limits().maximumDate}
              onChange={(_event: DateTimePickerEvent, date?: Date) => {
                if (date) setDraft(date)
              }}
            />
          </Div>
        </SheetModal>
      )}
    </>
  )
}
