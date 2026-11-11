import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { services } from '../services'
import type { DoctorQuery } from '../domain/doctorSearch'
import type { MedicineQuery, TestQuery } from '../domain/catalogue'

export const useDoctorSearch = (query: DoctorQuery, enabled = true) =>
  useQuery({
    queryKey: ['doctors', query],
    queryFn: () => services.doctors.search(query),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useMedicineSearch = (query: MedicineQuery) =>
  useQuery({
    queryKey: ['medicines', query],
    queryFn: () => services.pharmacy.searchMedicines(query),
    placeholderData: keepPreviousData,
  })

export const useTestSearch = (query: TestQuery) =>
  useQuery({
    queryKey: ['tests', query],
    queryFn: () => services.diagnostics.searchTests(query),
    placeholderData: keepPreviousData,
  })

export const useHelpSearch = (text: string) =>
  useQuery({
    queryKey: ['help', text],
    queryFn: () => services.help.search(text),
    placeholderData: keepPreviousData,
  })
