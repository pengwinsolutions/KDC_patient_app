import type { ConsultMode, Doctor } from '../types'

export type SortKey = 'Relevance' | 'Rating' | 'Experience' | 'Fee: low to high' | 'Distance'
export type Availability = 'Available now' | 'Today' | 'Tomorrow' | 'Next 7 days'
export type ExperienceBand = '0–5 yrs' | '5–10 yrs' | '10–15 yrs' | '15+ yrs'
export type GenderFilter = 'Any' | 'Male' | 'Female'
export type DistanceBand = 'Within 5 km' | 'Within 10 km' | 'Anywhere in Hyderabad'

export interface DoctorFilters {
  specialty: string | null
  availability: Availability | null
  mode: ConsultMode | null
  experience: ExperienceBand | null
  feeMin: number
  feeMax: number
  gender: GenderFilter
  languages: string[]
  distance: DistanceBand | null
}

export interface DoctorQuery {
  text: string
  filters: DoctorFilters
  sort: SortKey
}

/** Above this the fee slider reads "₹1,200+" and stops limiting. */
export const FEE_CEILING = 1200
export const FEE_FLOOR = 180

/** Nothing selected: every doctor matches. */
export const NO_FILTERS: DoctorFilters = {
  specialty: null,
  availability: null,
  mode: null,
  experience: null,
  feeMin: FEE_FLOOR,
  feeMax: FEE_CEILING,
  gender: 'Any',
  languages: [],
  distance: null,
}

/** The selection the filter sheet opens with on first view. */
export const SHEET_DEFAULTS: DoctorFilters = {
  specialty: 'Cardiology',
  availability: 'Today',
  mode: 'video',
  experience: '15+ yrs',
  feeMin: 300,
  feeMax: FEE_CEILING,
  gender: 'Any',
  languages: ['English', 'Telugu'],
  distance: 'Within 10 km',
}

/** Browse names on the left, what a doctor's profile records on the right. */
const SPECIALTY_TO_DOCTOR: Record<string, string> = {
  'General Physician': 'General Physician',
  Cardiology: 'Cardiologist',
  Dermatology: 'Dermatologist',
  Paediatrics: 'Paediatrician',
  Orthopaedics: 'Orthopaedic Surgeon',
  Gynaecology: 'Gynaecologist',
  Neurology: 'Neurologist',
  Diabetology: 'Diabetologist',
}

export const doctorSpecialtyName = (browseName: string) => SPECIALTY_TO_DOCTOR[browseName] ?? browseName

/** Everyday concerns routed to the specialty that treats them. */
export const CONCERN_TO_SPECIALTY: Record<string, string> = {
  'Fever & cold': 'General Physician',
  'Diabetes review': 'Diabetology',
  'Back pain': 'Orthopaedics',
  'Child vaccination': 'Paediatrics',
  Thyroid: 'Diabetology',
}

const STOP_WORDS = new Set(['in', 'near', 'me', 'for', 'dr', 'dr.', 'doctor', 'doctors'])

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t))
}

function matchesText(d: Doctor, text: string): boolean {
  const words = tokens(text)
  if (!words.length) return true
  const haystack = [d.name, d.specialty, d.hospital, d.locality, ...d.languages].join(' ').toLowerCase()
  return words.every((w) => haystack.includes(w))
}

const EXPERIENCE: Record<ExperienceBand, [number, number]> = {
  '0–5 yrs': [0, 5],
  '5–10 yrs': [5, 10],
  '10–15 yrs': [10, 15],
  '15+ yrs': [15, Infinity],
}

const DISTANCE: Record<DistanceBand, number> = {
  'Within 5 km': 5,
  'Within 10 km': 10,
  'Anywhere in Hyderabad': Infinity,
}

function isAvailable(d: Doctor, when: Availability): boolean {
  if (when === 'Available now' || when === 'Today') return d.availableToday
  if (when === 'Tomorrow') return d.availableToday || d.nextSlot.startsWith('Tomorrow')
  return true
}

function feeOf(d: Doctor, mode: ConsultMode | null): number {
  return mode ? d.fees[mode] : Math.min(...Object.values(d.fees))
}

export function matchesFilters(d: Doctor, f: DoctorFilters): boolean {
  if (f.specialty && d.specialty !== doctorSpecialtyName(f.specialty)) return false
  if (f.availability && !isAvailable(d, f.availability)) return false
  if (f.experience) {
    const [min, max] = EXPERIENCE[f.experience]
    if (d.experience < min || d.experience > max) return false
  }
  const fee = feeOf(d, f.mode)
  if (fee < f.feeMin) return false
  if (f.feeMax < FEE_CEILING && fee > f.feeMax) return false
  if (f.gender !== 'Any' && d.gender !== f.gender) return false
  if (f.languages.length && !f.languages.every((l) => d.languages.includes(l))) return false
  if (f.distance && d.distanceKm > DISTANCE[f.distance]) return false
  return true
}

function compare(sort: SortKey, a: Doctor, b: Doctor, mode: ConsultMode | null): number {
  switch (sort) {
    case 'Rating':
      return b.rating - a.rating || b.reviews - a.reviews
    case 'Experience':
      return b.experience - a.experience
    case 'Fee: low to high':
      return feeOf(a, mode) - feeOf(b, mode)
    case 'Distance':
      return a.distanceKm - b.distanceKm
    default:
      return 0
  }
}

export function searchDoctors(doctors: Doctor[], q: DoctorQuery): Doctor[] {
  return doctors
    .filter((d) => matchesText(d, q.text) && matchesFilters(d, q.filters))
    .sort((a, b) => compare(q.sort, a, b, q.filters.mode))
}

/** Heading for a results list once the patient has narrowed it. */
export function listingTitle(q: DoctorQuery): string {
  if (q.filters.specialty) {
    const name = doctorSpecialtyName(q.filters.specialty)
    return name === q.filters.specialty && !name.endsWith('Physician') ? name : `${name}s`
  }
  return q.text.trim() ? `Results for “${q.text.trim()}”` : 'All doctors'
}

export { plural } from './plural'
