import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { services } from '../services'
import type { DoctorQuery } from '../domain/doctorSearch'
import type { MedicineQuery, TestQuery } from '../domain/catalogue'
import { LIVE } from '../services/config'
import { loadMedicine, searchMedicines as liveSearchMedicines } from '../services/live/pharmacy'
import { loadLabSlots, loadLabsFor, loadTest, searchTests as liveSearchTests } from '../services/live/diagnostics'

/** Demo: the bundled directory. Live: GET /public/doctors (results merge into the catalogue). */
export const useDoctorSearch = (query: DoctorQuery, enabled = true) =>
  useQuery({
    queryKey: ['doctors', query],
    queryFn: () =>
      LIVE
        ? (require('../services/live/doctors') as typeof import('../services/live/doctors')).searchDoctors(query)
        : services.doctors.search(query),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useMedicineSearch = (query: MedicineQuery) =>
  useQuery({
    queryKey: ['medicines', query],
    queryFn: () => (LIVE ? liveSearchMedicines(query) : services.pharmacy.searchMedicines(query)),
    placeholderData: keepPreviousData,
  })

export const useTestSearch = (query: TestQuery) =>
  useQuery({
    queryKey: ['tests', query],
    queryFn: () => (LIVE ? liveSearchTests(query) : services.diagnostics.searchTests(query)),
    placeholderData: keepPreviousData,
  })

export const useHelpSearch = (text: string) =>
  useQuery({
    queryKey: ['help', text],
    queryFn: () => services.help.search(text),
    placeholderData: keepPreviousData,
  })

/* ---------------------------------------------- Live catalogue details (pharmacy, diagnostics) */

/** Live: loads a medicine's page (price, stock, about, side effects) into the catalogue. */
export const useMedicineDetail = (code: string | undefined) =>
  useQuery({ queryKey: ['medicine', code], queryFn: () => loadMedicine(code!), enabled: LIVE && Boolean(code) })

/** Live: loads a test's page (description, preparation, what it covers) into the catalogue. */
export const useTestDetail = (code: string | null | undefined) =>
  useQuery({ queryKey: ['lab-test', code], queryFn: () => loadTest(code!), enabled: LIVE && Boolean(code) })

/** Live: the labs that offer a test, with their price for it. */
export const useLabsFor = (testCode: string | null | undefined) =>
  useQuery({ queryKey: ['labs', testCode], queryFn: () => loadLabsFor([testCode!]), enabled: LIVE && Boolean(testCode) })

/** Live: collection slots on a day ("2026-11-17"). */
export const useLabSlots = (isoDate: string, enabled = true) =>
  useQuery({ queryKey: ['lab-slots', isoDate], queryFn: () => loadLabSlots(isoDate), enabled: LIVE && enabled, staleTime: 30_000 })
