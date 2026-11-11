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
 * Read-only reference data, kept synchronous so detail screens render without a
 * loading gate. A backend would refresh this from its catalogue endpoints.
 */
export const useCatalog = create<CatalogState>(() => ({
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
}))

const catalog = () => useCatalog.getState()

export const getDoctor = (id: string) => catalog().doctors.find((d) => d.id === id) ?? catalog().doctors[0]

export const getMedicine = (id: string) => catalog().medicines.find((m) => m.id === id) ?? catalog().medicines[0]

export const getTest = (id: string) => catalog().labTests.find((t) => t.id === id) ?? catalog().labTests[0]

export const getLab = (id: string) => catalog().labs.find((l) => l.id === id) ?? catalog().labs[0]

export const getClinic = (id: string) => catalog().clinics.find((c) => c.id === id) ?? catalog().clinics[0]

export const getMedicineDetail = (m: Medicine): MedicineDetail =>
  medicineDetails[m.id] ?? { about: `${m.generic}. Take as directed by your doctor.`, sideEffects: [] }

export const getTestDetail = (id: string): TestDetail => testDetails[id] ?? { covers: [], audience: [] }

export function reviewsFor(doctorId: string): Review[] {
  return doctorId === 'd1' ? reviews : generalReviews
}

export function getPrescription(rxId: string | undefined): PrescriptionDoc {
  const summary = catalog().prescriptionHistory.find((p) => p.rxId === rxId)
  return summary ? prescriptionDocFor(summary) : catalog().prescription
}

export { labReport }

/** What "Reorder from your prescription" offers. */
export const reorderLines = () => seedCart.lines
