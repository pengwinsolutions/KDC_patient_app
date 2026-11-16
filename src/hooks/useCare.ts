/**
 * Live-mode data for the care screens (doctor profile, booking calendar and slots, the
 * waiting room, prescriptions). Each hook is idle in demo builds, which keep their
 * bundled data.
 */
import { useQuery } from '@tanstack/react-query'
import type { ConsultMode } from '../types'
import { LIVE } from '../services/config'
import { MOCK_TODAY, toIso, type CalendarDate } from '../domain/schedule'
import * as doctors from '../services/live/doctors'
import { getSession } from '../services/live/consultations'
import { loadPrescription, useRxDocs } from '../services/live/prescriptions'

/** Loads a doctor's full profile (about, qualifications, clinic) into the catalogue. */
export const useDoctorDetail = (code: string) =>
  useQuery({ queryKey: ['doctor', code], queryFn: () => doctors.loadDoctor(code), enabled: LIVE && Boolean(code) })

export const useDoctorReviews = (code: string) =>
  useQuery({ queryKey: ['doctor-reviews', code], queryFn: () => doctors.loadReviews(code), enabled: LIVE && Boolean(code) })

export const useAvailability = (code: string, mode: ConsultMode, from: CalendarDate, days: number, enabled = true) =>
  useQuery({
    queryKey: ['availability', code, mode, toIso(from), days],
    queryFn: () => doctors.loadAvailability(code, mode, from, days),
    enabled: LIVE && enabled && Boolean(code) && days > 0,
  })

/** The bookable days of one month (from today when it's the current month). */
export function useMonthAvailability(code: string, mode: ConsultMode, year: number, month: number) {
  const first: CalendarDate = { year, month, day: 1 }
  const from = toIso(first) < toIso(MOCK_TODAY) ? MOCK_TODAY : first
  const last = new Date(year, month + 1, 0).getDate()
  const sameMonth = from.year === year && from.month === month
  return useAvailability(code, mode, from, sameMonth ? last - from.day + 1 : 0)
}

export const useSlots = (code: string, mode: ConsultMode, date: CalendarDate) =>
  useQuery({
    queryKey: ['slots', code, mode, toIso(date)],
    queryFn: () => doctors.loadSlots(code, mode, date),
    enabled: LIVE && Boolean(code),
  })

/** The first two open slots in the coming week. */
export const useEarliestSlots = (code: string, mode: ConsultMode) =>
  useQuery({
    queryKey: ['earliest', code, mode, toIso(MOCK_TODAY)],
    enabled: LIVE && Boolean(code),
    queryFn: async () => {
      const week = await doctors.loadAvailability(code, mode, MOCK_TODAY, 7)
      const found: { date: CalendarDate; time: string }[] = []
      for (const day of week.days.filter((d) => !d.closed && d.freeSlots > 0)) {
        const slots = await doctors.loadSlots(code, mode, day.date)
        for (const s of slots.filter((x) => x.available)) {
          found.push({ date: day.date, time: s.time })
          if (found.length === 2) return found
        }
      }
      return found
    },
  })

/** The waiting room's view of the consultation, refreshed every few seconds. */
export const useConsultationSession = (code: string | undefined) =>
  useQuery({
    queryKey: ['consultation', code],
    queryFn: () => getSession(code!),
    enabled: LIVE && Boolean(code),
    refetchInterval: 5000,
  })

/** A prescription document; fetched when it wasn't in the list (e.g. just issued). */
export function usePrescriptionDoc(code: string | undefined) {
  const cached = useRxDocs((s) => (code ? s.docs[code] : undefined))
  useQuery({ queryKey: ['prescription', code], queryFn: () => loadPrescription(code!), enabled: LIVE && Boolean(code) && !cached })
  return cached
}
