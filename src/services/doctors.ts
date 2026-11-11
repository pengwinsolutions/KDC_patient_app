import type { Doctor } from '../types'
import { searchDoctors, type DoctorQuery } from '../domain/doctorSearch'
import { doctors } from '../mock-data/mock'
import { delay } from './latency'

export interface DoctorsService {
  search(query: DoctorQuery): Promise<Doctor[]>
}

export const mockDoctorsService: DoctorsService = {
  search: (query) => delay(searchDoctors(doctors, query)),
}
