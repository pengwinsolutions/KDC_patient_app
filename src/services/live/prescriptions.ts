/**
 * The patient's prescriptions (every family member's) on the backend. The list carries the
 * full documents, so opening one needs no second call; they're kept in memory only.
 */
import { create } from 'zustand'
import type { PrescriptionDoc, PrescriptionSummary } from '../../types'
import { mergeCatalog, NO_DOCTOR, useCatalog } from '../../store/catalog'
import { api, qs } from './http'
import { atToDay, atToTime, isoToDay, titleCase } from './map'

export interface PrescriptionView {
  code: string
  status: string
  active: boolean
  appointmentCode: string
  mode: string
  doctor: { code: string; name: string; qualification: string | null; specialty: string | null; regNo: string | null; council: string | null; clinic: string | null }
  patient: { memberId: number | null; name: string | null; age: number | null; gender: string | null }
  vitals: Record<string, string | number | null> | null
  diagnosis: string[]
  items: { medicineId: number | null; name: string; strength: string | null; generic: string; dosage: string; frequency: string; duration: string; food: string | null; instructions: string | null }[]
  advice: string[]
  investigations: string[]
  followUp: { required: boolean; date: string | null; mode: string | null; note: string | null }
  issuedAt: string | null
  validUntil: string | null
}

/** Prescription documents by code, and their doctors' details as the prescription states them. */
export const useRxDocs = create<{ docs: Record<string, PrescriptionDoc>; doctors: Record<string, PrescriptionView['doctor']> }>(() => ({ docs: {}, doctors: {} }))

const vital = (v: PrescriptionView['vitals'], ...keys: string[]) => {
  for (const k of keys) {
    const x = v?.[k]
    if (x !== null && x !== undefined && x !== '') return String(x)
  }
  return '—'
}

function followUpLine(f: PrescriptionView['followUp']): string {
  if (!f?.required) return f?.note ?? ''
  const when = f.date ? `Follow-up on ${isoToDay(f.date)}` : 'Follow-up advised'
  return [when, f.mode ? `(${f.mode})` : '', f.note ? `· ${f.note}` : ''].filter(Boolean).join(' ')
}

export function toDoc(p: PrescriptionView): PrescriptionDoc {
  return {
    id: p.code,
    doctorId: p.doctor.code,
    date: atToDay(p.issuedAt),
    time: atToTime(p.issuedAt),
    patient: { name: p.patient.name ?? '', age: p.patient.age ?? 0, gender: titleCase(p.patient.gender), id: p.patient.memberId ? String(p.patient.memberId) : '' },
    vitals: {
      bp: vital(p.vitals, 'bp', 'bloodPressure'),
      pulse: vital(p.vitals, 'pulse'),
      weight: vital(p.vitals, 'weight', 'weightKg'),
      spo2: vital(p.vitals, 'spo2'),
    },
    diagnosis: p.diagnosis ?? [],
    medicines: p.items.map((i) => ({
      name: i.name,
      generic: i.generic || i.strength || '',
      dosage: i.dosage,
      frequency: i.frequency,
      duration: i.duration,
      note: [i.food, i.instructions].filter(Boolean).join(' · '),
      medicineId: i.medicineId ?? undefined,
    })),
    advice: p.advice ?? [],
    investigations: p.investigations ?? [],
    followUp: followUpLine(p.followUp),
  }
}

export function toSummary(p: PrescriptionView): PrescriptionSummary {
  return {
    id: p.code,
    doctorId: p.doctor.code,
    date: atToDay(p.issuedAt),
    specialty: p.doctor.specialty ?? '',
    items: p.items.length,
    status: p.active ? 'active' : 'completed',
    rxId: p.code,
    appointmentId: p.appointmentCode,
    medicineNames: p.items.map((i) => i.name),
  }
}

export async function loadPrescriptions(): Promise<void> {
  const page = await api.get<{ rows: PrescriptionView[] }>(`patient/prescriptions${qs({ scope: 'all', limit: 100 })}`)
  const rows = page.rows ?? (page as unknown as PrescriptionView[])
  const docs: Record<string, PrescriptionDoc> = {}
  const doctors: Record<string, PrescriptionView['doctor']> = {}
  for (const p of rows) {
    docs[p.code] = toDoc(p)
    doctors[p.doctor.code] = p.doctor
  }
  useRxDocs.setState({ docs, doctors })
  // Doctors who prescribed but aren't in the directory any more are still named on their prescriptions.
  const missing = Object.values(doctors).filter((d) => !useCatalog.getState().doctors.some((x) => x.id === d.code))
  if (missing.length) {
    mergeCatalog('doctors', missing.map((d) => ({ ...NO_DOCTOR, id: d.code, name: d.name, qualification: d.qualification ?? '', specialty: d.specialty ?? '', regNo: d.regNo ?? '', council: d.council ?? undefined, hospital: d.clinic ?? '' })))
  }
  const history = rows.map(toSummary)
  const latest = rows.find((p) => p.active) ?? rows[0]
  useCatalog.setState({ prescriptionHistory: history, ...(latest ? { prescription: docs[latest.code] } : {}) })
}

/** One prescription, fetched when it isn't in the list yet (e.g. just issued). */
export async function loadPrescription(code: string): Promise<PrescriptionDoc> {
  const p = await api.get<PrescriptionView>(`patient/prescriptions/${encodeURIComponent(code)}`)
  const doc = toDoc(p)
  useRxDocs.setState((s) => ({ docs: { ...s.docs, [code]: doc }, doctors: { ...s.doctors, [p.doctor.code]: p.doctor } }))
  return doc
}

export function clearPrescriptions() {
  useRxDocs.setState({ docs: {}, doctors: {} })
}
