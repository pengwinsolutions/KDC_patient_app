/**
 * Rules for a person's medical information, shared by the screens and the server mapping.
 * The server's limits (KDC_backend patients DTO) are mirrored here so a value is never
 * rejected only after Save: height 30–250 cm, weight 1–300 kg, up to 30 entries of
 * 1–120 characters per list.
 */
import type { MedicalInfo } from '../types'

/* ------------------------------------------------------------ Blood group */

/** As the server stores them (ASCII hyphen). */
export const API_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const
/** "Don't know" in the picker: saved as no blood group. */
export const BLOOD_UNKNOWN = 'Don’t know'

/** Any spelling (−, –, -, any case) → the server's form, or null when it isn't a blood group. */
export function toApiBlood(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().replace(/[−–]/g, '-').toUpperCase()
  return (API_BLOOD_GROUPS as readonly string[]).includes(v) ? v : null
}

/** For display and the picker: the typographic minus (A−), as the designs show it. */
export function toDisplayBlood(value: string | null | undefined): string {
  const api = toApiBlood(value)
  return api ? api.replace('-', '−') : ''
}

/* ------------------------------------------------------------ Measurements */

export const HEIGHT_CM = { min: 30, max: 250 }
export const WEIGHT_KG = { min: 1, max: 300 }

/** "172", "172 cm", "172.5cm" → 172.5; null when blank or not a number. One decimal at most. */
export function parseMeasure(value: string): number | null {
  const m = /^\s*(\d{1,3}(?:\.\d)?)\s*(cm|kg)?\s*$/i.exec(value ?? '')
  return m ? Number(m[1]) : null
}

export function measureError(value: string, range: { min: number; max: number }, unit: 'cm' | 'kg'): string | null {
  if (!value.trim()) return null
  const n = parseMeasure(value)
  if (n === null) return `Enter a number in ${unit}`
  if (n < range.min || n > range.max) return `Between ${range.min} and ${range.max} ${unit}`
  return null
}

/** For display: "172 cm" / "68.5 kg"; '' when unknown. */
export const withUnit = (n: number | null, unit: 'cm' | 'kg') => (n === null ? '' : `${n} ${unit}`)

export type BmiBand = 'Underweight' | 'Healthy' | 'Overweight' | 'Obese'

/**
 * Body-mass index with the Asian adult cut-offs India's guidelines use (overweight from 23,
 * obesity from 25), not the general WHO ones (25 / 30). Null without both measurements, and
 * for children (the bands are for adults).
 */
export function bmi(heightCm: number | null, weightKg: number | null, ageYears?: number): { value: number; band: BmiBand } | null {
  if (!heightCm || !weightKg || (ageYears !== undefined && ageYears < 18)) return null
  const value = Math.round((weightKg / (heightCm / 100) ** 2) * 10) / 10
  const band: BmiBand = value < 18.5 ? 'Underweight' : value < 23 ? 'Healthy' : value < 25 ? 'Overweight' : 'Obese'
  return { value, band }
}

/* ------------------------------------------------------------ Lists */

export const LIST_MAX_ITEMS = 30
export const ITEM_MAX_LENGTH = 120

export type MedicalListKey = 'allergies' | 'conditions' | 'medications' | 'surgeries'

/**
 * Adds an entry: trimmed, inner spaces collapsed, no duplicates (case-insensitive), within the
 * server's limits. Returns the list unchanged and why, when it can't be added.
 */
export function addEntry(list: string[], raw: string): { list: string[]; error: string | null } {
  const value = raw.trim().replace(/\s+/g, ' ')
  if (!value) return { list, error: null }
  if (value.length > ITEM_MAX_LENGTH) return { list, error: `Keep each entry under ${ITEM_MAX_LENGTH} characters` }
  if (list.some((v) => v.toLowerCase() === value.toLowerCase())) return { list, error: `${value} is already added` }
  if (list.length >= LIST_MAX_ITEMS) return { list, error: `Up to ${LIST_MAX_ITEMS} entries` }
  return { list: [...list, value], error: null }
}

/** One-tap suggestions: the most common entries in Indian primary care. */
export const SUGGESTIONS: Record<MedicalListKey, string[]> = {
  allergies: ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Ibuprofen', 'Peanuts', 'Shellfish', 'Eggs', 'Milk (lactose)', 'Latex', 'Dust mites', 'Pollen'],
  conditions: ['Type 2 diabetes', 'High blood pressure', 'Thyroid (hypothyroidism)', 'Asthma', 'High cholesterol', 'Heart disease', 'Kidney disease', 'PCOS', 'Arthritis', 'Migraine'],
  medications: ['Metformin', 'Telmisartan', 'Amlodipine', 'Atorvastatin', 'Thyroxine', 'Aspirin (low dose)', 'Insulin', 'Salbutamol inhaler'],
  surgeries: ['Appendectomy', 'Caesarean section', 'Gallbladder removal', 'Hernia repair', 'Cataract surgery', 'Knee replacement', 'Angioplasty / stent'],
}

/** Suggestions not already on the list. */
export const openSuggestions = (key: MedicalListKey, list: string[]) =>
  SUGGESTIONS[key].filter((s) => !list.some((v) => v.toLowerCase() === s.toLowerCase()))

/* ------------------------------------------------------------ Completeness */

/** The essentials a doctor (or an emergency) needs; lists can legitimately be empty. */
export function essentials(m: MedicalInfo): { label: string; done: boolean }[] {
  return [
    { label: 'Blood group', done: Boolean(toApiBlood(m.bloodGroup)) },
    { label: 'Height and weight', done: parseMeasure(m.height) !== null && parseMeasure(m.weight) !== null },
    { label: 'Emergency contact', done: Boolean(m.emergency.name && m.emergency.mobile) },
  ]
}

/** Relationship choices for the emergency contact. */
export const EMERGENCY_RELATIONS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Other']
