/** Shared conversions between the backend's shapes and the app's display types. */
import { istParts, MONTH_NAMES } from '../../domain/schedule'

const SHORT = MONTH_NAMES.map((m) => m.slice(0, 3))

/** "1991-03-14" → "14 Mar 1991" (the app's date-of-birth and record format). */
export function isoToDay(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${SHORT[m - 1]} ${y}`
}

/** "14 Mar 1991" (or "14/03/1991", or ISO) → "1991-03-14"; '' when it can't be read. */
export function dayToIso(day: string): string {
  const t = day.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) return `${slash[3]}-${slash[2].padStart(2, '0')}-${slash[1].padStart(2, '0')}`
  const [d, mon, y] = t.split(/\s+/)
  const m = SHORT.findIndex((s) => s.toLowerCase() === (mon ?? '').slice(0, 3).toLowerCase())
  if (!y || m < 0) return ''
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`
}

/** A server timestamp as "5 Oct 2026" in IST. */
export function atToDay(at: string | null | undefined): string {
  if (!at) return ''
  const { date } = istParts(at)
  return `${date.day} ${SHORT[date.month]} ${date.year}`
}

/** A server timestamp as "5:30 PM" in IST. */
export const atToTime = (at: string | null | undefined) => (at ? istParts(at).time : '')

/** "male" → "Male". */
export const titleCase = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

/** "Male" → "male" (the server's enum). */
export const lower = (s: string | null | undefined) => (s ?? '').toLowerCase()

/** Rupees as a number from the server's decimal strings ("2500.00") or numbers. */
export const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? 0 : Number(v))
