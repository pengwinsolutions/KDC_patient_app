import { create } from 'zustand'
import type { Clinic, Doctor, Lab, LabTest, Medicine, MedicineDetail, PatientReport, PharmacyCategory, PrescriptionDoc, PrescriptionSummary, Review, Specialty, TestCategory, TestDetail } from '../types'
import {
  clinics,
  doctors,
  generalReviews,
  labReport,
  labReports,
  labTests,
  labs,
  medicineDetails,
  seedCart,
  medicines,
  pharmacyCategories,
  prescription,
  prescriptionDocFor,
  prescriptionHistory,
  reviews,
  specialties,
  testCategories,
  testDetails,
} from '../mock-data/mock'
import { LIVE } from '../services/config'

interface CatalogState {
  doctors: Doctor[]
  specialties: Specialty[]
  clinics: Clinic[]
  medicines: Medicine[]
  pharmacyCategories: PharmacyCategory[]
  labTests: LabTest[]
  testCategories: TestCategory[]
  labs: Lab[]
  labReports: PatientReport[]
  prescription: PrescriptionDoc
  prescriptionHistory: PrescriptionSummary[]
}

/**
 * Live: what a screen shows for something not loaded yet (or gone from the catalogue).
 * Blank, never a demo record.
 */
export const NO_DOCTOR: Doctor = {
  id: '', name: '', qualification: '', specialty: '', experience: 0, rating: 0, reviews: 0, languages: [], hospital: '', locality: '',
  distanceKm: 0, photo: '', fees: { video: 0, audio: 0, clinic: 0 }, nextSlot: '', availableToday: false, gender: 'Male', regNo: '',
  about: '', consults: 0, recommendPct: 0, credentials: [], areas: [],
}
export const NO_MEDICINE: Medicine = { id: '', name: '', generic: '', brand: '', pack: '', mrp: 0, price: 0, rx: false, inStock: false, photo: '', category: '' }
export const NO_TEST: LabTest = { id: '', name: '', short: '', parameters: 0, price: 0, mrp: 0, fasting: '', reportIn: '', homeCollection: false, category: '', description: '', prep: [] }
export const NO_LAB: Lab = { id: '', name: '', rating: 0, reviews: 0, distanceKm: 0, price: 0, homeCollection: false, nabl: false, slots: 0, photo: '', locality: '' }
export const NO_CLINIC: Clinic = { id: '', name: '', address: '', distanceKm: 0, slots: 0, photo: '', timing: '' }
export const NO_PRESCRIPTION: PrescriptionDoc = {
  id: '', doctorId: '', date: '', time: '', patient: { name: '', age: 0, gender: '', id: '' }, vitals: { bp: '', pulse: '', weight: '', spo2: '' },
  diagnosis: [], medicines: [], advice: [], investigations: [], followUp: '',
}

const DEMO_CATALOG: CatalogState = {
  doctors,
  specialties,
  clinics,
  medicines,
  pharmacyCategories,
  labTests,
  testCategories,
  labs,
  labReports,
  prescription,
  prescriptionHistory,
}

const EMPTY_CATALOG: CatalogState = {
  doctors: [],
  specialties: [],
  clinics: [],
  medicines: [],
  pharmacyCategories: [],
  labTests: [],
  testCategories: [],
  labs: [],
  labReports: [],
  prescription: NO_PRESCRIPTION,
  prescriptionHistory: [],
}

/**
 * Reference data, kept synchronous so detail screens render without a loading gate.
 * Demo: the bundled catalogue. Live: starts empty and is filled from the backend's
 * catalogue (search results and details are merged in as they load).
 */
export const useCatalog = create<CatalogState>(() => (LIVE ? EMPTY_CATALOG : DEMO_CATALOG))

type ListKey = Exclude<keyof CatalogState, 'prescription'>

/** Live: adds or replaces records by id, keeping the rest. */
export function mergeCatalog<K extends ListKey>(key: K, items: CatalogState[K]) {
  useCatalog.setState((s) => {
    const list = s[key] as { id: string }[]
    const incoming = items as { id: string }[]
    const ids = new Set(incoming.map((i) => i.id))
    return { [key]: [...list.filter((i) => !ids.has(i.id)), ...incoming] } as Partial<CatalogState>
  })
}

/** Live, on sign-out: forget the patient's own records kept here (reports, prescriptions). */
export function clearPatientCatalog() {
  useCatalog.setState({ labReports: [], prescription: NO_PRESCRIPTION, prescriptionHistory: [] })
}

const catalog = () => useCatalog.getState()

const pick = <T extends { id: string }>(list: T[], id: string, blank: T): T =>
  list.find((x) => x.id === id) ?? (LIVE ? blank : list[0])

export const getDoctor = (id: string) => pick(catalog().doctors, id, NO_DOCTOR)

export const getMedicine = (id: string) => pick(catalog().medicines, id, NO_MEDICINE)

export const getTest = (id: string) => pick(catalog().labTests, id, NO_TEST)

export const getLab = (id: string) => pick(catalog().labs, id, NO_LAB)

export const getClinic = (id: string) => pick(catalog().clinics, id, NO_CLINIC)

/** Live: what the medicine's page loaded from the server (services/live/pharmacy.ts); blank until then. */
export function getMedicineDetail(m: Medicine): MedicineDetail {
  if (LIVE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useMedicineDetails } = require('../services/live/pharmacy') as typeof import('../services/live/pharmacy')
    return useMedicineDetails.getState().byCode[m.id] ?? { about: '', sideEffects: [] }
  }
  return medicineDetails[m.id] ?? { about: `${m.generic}. Take as directed by your doctor.`, sideEffects: [] }
}

/** Live: what the test's page loaded from the server (services/live/diagnostics.ts); blank until then. */
export function getTestDetail(id: string): TestDetail {
  if (LIVE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useTestDetails } = require('../services/live/diagnostics') as typeof import('../services/live/diagnostics')
    return useTestDetails.getState().byCode[id] ?? { covers: [], audience: [] }
  }
  return testDetails[id] ?? { covers: [], audience: [] }
}

/** Demo reviews. Live screens load a doctor's reviews from the server (services/live/doctors.ts). */
export function reviewsFor(doctorId: string): Review[] {
  if (LIVE) return []
  return doctorId === 'd1' ? reviews : generalReviews
}

export function getPrescription(rxId: string | undefined): PrescriptionDoc {
  if (LIVE) {
    // Live: the documents loaded with the prescriptions list; the latest one when none is named.
    const { useRxDocs } = require('../services/live/prescriptions') as typeof import('../services/live/prescriptions')
    return (rxId ? useRxDocs.getState().docs[rxId] : undefined) ?? (rxId ? NO_PRESCRIPTION : catalog().prescription)
  }
  const summary = catalog().prescriptionHistory.find((p) => p.rxId === rxId)
  return summary ? prescriptionDocFor(summary) : catalog().prescription
}

export { labReport }

/**
 * What "Reorder from your prescription" offers. Live: the medicines on the latest KDC+
 * prescription that are in the loaded catalogue (matched by name); none when there isn't one.
 */
export function reorderLines(): { medicineId: string; qty: number }[] {
  if (!LIVE) return seedCart.lines
  const { prescription: rx, medicines: list } = catalog()
  return rx.medicines
    .map((p) => list.find((m) => m.name.toLowerCase() === p.name.toLowerCase())?.id)
    .filter((id): id is string => Boolean(id))
    .map((medicineId) => ({ medicineId, qty: 1 }))
}
