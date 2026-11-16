/**
 * The doctor directory on the backend (public: no session needed), saved doctors, and the
 * booking rules patients see (platform fee, free-cancellation window). Directory rows are
 * merged into the catalogue store so `getDoctor(code)` works everywhere.
 */
import type { ConsultMode, Doctor, Review, Specialty } from '../../types'
import type { DoctorQuery, ExperienceBand, SortKey } from '../../domain/doctorSearch'
import { FEE_CEILING, FEE_FLOOR } from '../../domain/doctorSearch'
import { formatShort, from24h, fromIso, MOCK_TODAY, sameDate, toIso, type CalendarDate, type Period, type SlotView } from '../../domain/schedule'
import { mergeCatalog, useCatalog } from '../../store/catalog'
import { API_CONFIG } from '../config'
import { api, qs } from './http'
import { titleCase } from './map'

/* ------------------------------------------------------------------ Rules */

export interface CareRules {
  platformFee: number
  freeCancelMinutes: number
  lateCancelFeePercent: number
  bookingHorizonDays: number
  waitingRoomOpensMinutes: number
}

/** The server's booking rules (GET /config/public?app=patient); the defaults until loaded. */
export const careRules: CareRules = { platformFee: 49, freeCancelMinutes: 60, lateCancelFeePercent: 50, bookingHorizonDays: 60, waitingRoomOpensMinutes: 10 }

export async function loadCareRules() {
  const cfg = await api.pub<{ rules?: Partial<CareRules> }>('config/public?app=patient')
  for (const k of Object.keys(careRules) as (keyof CareRules)[]) {
    const v = cfg.rules?.[k]
    if (typeof v === 'number') careRules[k] = v
  }
}

/* ---------------------------------------------------------------- Mapping */

interface DirectoryRow {
  code: string
  name: string
  title: string | null
  gender: string | null
  photoUrl: string | null
  qualification: string | null
  specialty: { name: string; slug: string; practitionerTitle: string | null } | null
  subSpecialty: string | null
  experienceYears: number | null
  languages: string[]
  hospital: string | null
  locality: string | null
  city: string | null
  fees: Record<ConsultMode, number | null>
  modes: ConsultMode[]
  rating: number
  reviews: number
  consults: number
  distanceKm: number | null
  onLeave: boolean
  availableToday: boolean
  availableNow: boolean
  nextSlot?: { date: string; time: string; startsAt: string } | null
}

interface DirectoryDetail extends DirectoryRow {
  about: string | null
  regNo: string | null
  council: string | null
  qualifications: { degree: string; institution: string; yearFrom: number | null; yearTo: number | null }[]
  clinic: { name: string | null; address: string | null; city: string | null; pincode: string | null } | null
}

/** A server photo path as a URL the image component can load. */
export function photoUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const origin = API_CONFIG.baseUrl.replace(/\/api\/v\d+\/?$/, '')
  return path.startsWith('/api/') ? `${origin}${path}` : `${API_CONFIG.baseUrl}/${path.replace(/^\/+/, '')}`
}

/** "Today, 12:00 PM", "Tomorrow, 9:00 AM" or "Wed, 18 Nov". */
export function slotLabel(date: string, time: string): string {
  const d = fromIso(date)
  const tomorrow = fromIso(new Date(Date.UTC(MOCK_TODAY.year, MOCK_TODAY.month, MOCK_TODAY.day + 1)).toISOString())
  const day = sameDate(d, MOCK_TODAY) ? 'Today' : sameDate(d, tomorrow) ? 'Tomorrow' : formatShort(d)
  return `${day}, ${from24h(time)}`
}

export function toDoctor(r: DirectoryRow, detail?: DirectoryDetail, previous?: Doctor): Doctor {
  const base: Doctor = {
    id: r.code,
    name: r.name,
    qualification: r.qualification ?? '',
    specialty: r.specialty?.practitionerTitle ?? r.specialty?.name ?? '',
    specialtySlug: r.specialty?.slug,
    experience: r.experienceYears ?? 0,
    rating: Number(r.rating) || 0,
    reviews: r.reviews ?? 0,
    languages: r.languages ?? [],
    hospital: r.hospital ?? detail?.clinic?.name ?? previous?.hospital ?? '',
    locality: r.locality ?? r.city ?? '',
    distanceKm: r.distanceKm ?? 0,
    photo: photoUrl(r.photoUrl),
    fees: { video: r.fees?.video ?? 0, audio: r.fees?.audio ?? 0, clinic: r.fees?.clinic ?? 0 },
    modes: r.modes,
    nextSlot: r.onLeave ? 'On leave' : r.nextSlot ? slotLabel(r.nextSlot.date, r.nextSlot.time) : 'No slots soon',
    availableToday: r.availableToday,
    onLeave: r.onLeave,
    gender: titleCase(r.gender) === 'Female' ? 'Female' : 'Male',
    regNo: detail?.regNo ?? previous?.regNo ?? '',
    council: detail?.council ?? previous?.council,
    about: detail?.about ?? previous?.about ?? '',
    consults: r.consults ?? 0,
    recommendPct: previous?.recommendPct ?? 0,
    credentials: detail
      ? detail.qualifications.map((q) => ({
          title: q.degree,
          org: q.institution,
          years: q.yearFrom ? `${q.yearFrom} – ${q.yearTo ?? 'present'}` : '',
        }))
      : previous?.credentials ?? [],
    areas: r.subSpecialty ? [r.subSpecialty] : previous?.areas ?? [],
    clinicAddress: detail?.clinic
      ? [detail.clinic.name, detail.clinic.address, detail.clinic.city].filter(Boolean).join(', ')
      : previous?.clinicAddress,
  }
  return base
}

const known = (code: string) => useCatalog.getState().doctors.find((d) => d.id === code)

function mergeRows(rows: DirectoryRow[]): Doctor[] {
  const doctors = rows.map((r) => toDoctor(r, undefined, known(r.code)))
  mergeCatalog('doctors', doctors)
  return doctors
}

/* ---------------------------------------------------------------- Search */

const EXPERIENCE: Record<ExperienceBand, [number, number | undefined]> = {
  '0–5 yrs': [0, 5],
  '5–10 yrs': [5, 10],
  '10–15 yrs': [10, 15],
  '15+ yrs': [15, undefined],
}

/* Sorting by distance needs the patient's location, which the app doesn't ask for yet. */
const SORT: Record<SortKey, string> = { Relevance: 'relevance', Rating: 'rating', Experience: 'experience', 'Fee: low to high': 'fee', Distance: 'relevance' }

/** The directory slug for a browse name ("Cardiology", "General Physician", "Diabetology"). */
export function specialtySlug(name: string): string | undefined {
  const n = name.trim().toLowerCase()
  const list = useCatalog.getState().specialties
  const hit = list.find((s) => s.name.toLowerCase() === n || s.id === n)
  if (hit) return hit.id
  return specialtyTitles[n]
}

/** practitionerTitle → slug, filled when specialties load ("general physician" → general-medicine). */
const specialtyTitles: Record<string, string> = {}

export async function searchDoctors(q: DoctorQuery): Promise<Doctor[]> {
  const f = q.filters
  const exp = f.experience ? EXPERIENCE[f.experience] : null
  let text = q.text.trim()
  let specialty = f.specialty ? specialtySlug(f.specialty) : undefined
  // A specialty the directory doesn't list (e.g. Diabetology) is searched as words.
  if (f.specialty && !specialty) text = [text, f.specialty].filter(Boolean).join(' ')
  if (!f.specialty && text) {
    const asSpecialty = specialtySlug(text)
    if (asSpecialty) {
      specialty = asSpecialty
      text = ''
    }
  }
  const page = await api.pub<{ rows: DirectoryRow[] }>(
    `public/doctors${qs({
      q: text,
      specialty,
      mode: f.mode ?? undefined,
      experienceMin: exp?.[0] || undefined,
      experienceMax: exp?.[1],
      feeMin: f.feeMin > FEE_FLOOR ? f.feeMin : undefined,
      feeMax: f.feeMax < FEE_CEILING ? f.feeMax : undefined,
      gender: f.gender !== 'Any' ? f.gender.toLowerCase() : undefined,
      languages: f.languages.length ? f.languages.join(',') : undefined,
      availability: f.availability === 'Available now' ? 'now' : f.availability === 'Today' ? 'today' : undefined,
      sort: SORT[q.sort],
      limit: 50,
    })}`,
  )
  const doctors = mergeRows(page.rows)
  // "Tomorrow" and "Next 7 days" have no server filter: next-slot labels decide.
  if (f.availability === 'Tomorrow') return doctors.filter((d) => d.availableToday || d.nextSlot.startsWith('Tomorrow'))
  return doctors
}

/** The first page of the directory, for the home and search screens. */
export async function loadFeatured(): Promise<void> {
  const page = await api.pub<{ rows: DirectoryRow[] }>('public/doctors?sort=rating&limit=20')
  mergeRows(page.rows)
}

export async function loadDoctor(code: string): Promise<Doctor> {
  const d = await api.pub<DirectoryDetail>(`public/doctors/${encodeURIComponent(code)}`)
  const doctor = toDoctor(d, d, known(code))
  mergeCatalog('doctors', [doctor])
  return doctor
}

/* ------------------------------------------------------------ Specialties */

export async function loadSpecialties(): Promise<void> {
  const rows = await api.pub<{ id: number; name: string; slug: string; practitionerTitle: string | null; icon: string | null; doctorCount: number }[]>('public/specialties')
  for (const r of rows) if (r.practitionerTitle) specialtyTitles[r.practitionerTitle.toLowerCase()] = r.slug
  const list: Specialty[] = rows.map((r) => ({ id: r.slug, name: r.name, count: r.doctorCount, icon: r.icon ?? 'stethoscope' }))
  useCatalog.setState({ specialties: list })
}

/* ---------------------------------------------------------------- Reviews */

interface ReviewsView {
  rating: number
  reviews: number
  rows: { rating: number; tags: string[]; note: string | null; createdAt: string }[]
}

function ago(at: string): string {
  const days = Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months < 12 ? `${months} month${months > 1 ? 's' : ''} ago` : `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''} ago`
}

export interface DoctorReviews {
  reviews: Review[]
  /** Share of ratings at 5…1 stars, in percent. */
  distribution: { n: number; pct: number }[]
  /** Percent of reviews tagged "Would recommend"; null with no reviews. */
  recommendPct: number | null
}

/** Reviews are anonymous: the patient's name is never shown. */
export async function loadReviews(code: string): Promise<DoctorReviews> {
  const v = await api.pub<ReviewsView>(`public/doctors/${encodeURIComponent(code)}/reviews?limit=50`)
  const rows = v.rows ?? []
  const reviews = rows.map((r, i) => ({
    id: `${code}-${i}`,
    name: 'Verified patient',
    rating: r.rating,
    when: ago(r.createdAt),
    mode: r.tags.slice(0, 2).join(' · '),
    text: r.note ?? r.tags.join(', '),
  }))
  const distribution = [5, 4, 3, 2, 1].map((n) => ({ n, pct: rows.length ? Math.round((rows.filter((r) => r.rating === n).length / rows.length) * 100) : 0 }))
  const recommendPct = rows.length ? Math.round((rows.filter((r) => r.tags.includes('Would recommend')).length / rows.length) * 100) : null
  return { reviews, distribution, recommendPct }
}

/* ------------------------------------------------------------ Saved doctors */

export async function loadSaved(): Promise<string[]> {
  const rows = await api.get<DirectoryRow[]>('patient/saved-doctors')
  mergeRows(rows)
  return rows.map((r) => r.code)
}

export async function setSaved(code: string, saved: boolean): Promise<string[]> {
  const rows = saved
    ? await api.put<DirectoryRow[]>(`patient/saved-doctors/${encodeURIComponent(code)}`)
    : await api.del<DirectoryRow[]>(`patient/saved-doctors/${encodeURIComponent(code)}`)
  mergeRows(rows)
  return rows.map((r) => r.code)
}

/* ------------------------------------------------------- Availability, slots */

export interface DayAvailability {
  date: CalendarDate
  iso: string
  freeSlots: number
  closed: boolean
}

export async function loadAvailability(code: string, mode: ConsultMode, from: CalendarDate, days: number): Promise<{ onLeave: boolean; days: DayAvailability[] }> {
  const v = await api.pub<{ onLeave: boolean; days: { date: string; freeSlots: number; closed: boolean }[] }>(
    `public/doctors/${encodeURIComponent(code)}/availability${qs({ from: toIso(from), days: Math.min(31, Math.max(1, days)), mode })}`,
  )
  return { onLeave: v.onLeave, days: v.days.map((d) => ({ date: fromIso(d.date), iso: d.date, freeSlots: d.freeSlots, closed: d.closed })) }
}

export interface LiveSlot {
  time: string
  period: Period
  available: boolean
}

export async function loadSlots(code: string, mode: ConsultMode, date: CalendarDate): Promise<LiveSlot[]> {
  const v = await api.pub<{ slots: { time: string; period: Period; available: boolean }[] }>(
    `public/doctors/${encodeURIComponent(code)}/slots${qs({ date: toIso(date), mode })}`,
  )
  return v.slots.map((s) => ({ time: from24h(s.time), period: s.period, available: s.available }))
}

/** Slots grouped as the slot screen shows them. */
export function groupSlots(slots: LiveSlot[], selected: string | null): Record<Period, SlotView[]> {
  const groups: Record<Period, SlotView[]> = { Morning: [], Afternoon: [], Evening: [] }
  for (const s of slots) {
    groups[s.period]?.push({ time: s.time, state: !s.available ? 'booked' : s.time === selected ? 'selected' : 'free' })
  }
  return groups
}
