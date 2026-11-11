import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConsultMode } from '../types'
import { sameDate, type CalendarDate } from '../domain/schedule'
import { getDoctor } from './catalog'
import { persistStorage } from './storage'

interface BookingDraft {
  doctorId: string
  mode: ConsultMode
  clinicId: string
  date: CalendarDate
  time: string | null
  patientId: string
  /** Set when the date and slot steps are changing an existing appointment. */
  reschedulingId: string | null
}

interface BookingState extends BookingDraft {
  selectDoctor: (doctorId: string) => void
  setMode: (mode: ConsultMode) => void
  setClinic: (clinicId: string) => void
  setDate: (date: CalendarDate) => void
  setSlot: (date: CalendarDate, time: string) => void
  setTime: (time: string) => void
  setPatient: (patientId: string) => void
  startReschedule: (appointmentId: string, doctorId: string, mode: ConsultMode) => void
  finishReschedule: () => void
  /** The slot is gone once paid for; a repeat booking must choose again. */
  clearSlot: () => void
  reset: () => void
}

const seed: BookingDraft = {
  doctorId: 'd1',
  mode: 'video',
  clinicId: 'c1',
  date: { year: 2025, month: 9, day: 6 },
  time: '5:30 PM',
  patientId: 'f1',
  reschedulingId: null,
}

export const useBooking = create<BookingState>()(
  persist(
    (set) => ({
      ...seed,
      selectDoctor: (doctorId) => set({ doctorId, reschedulingId: null }),
      setMode: (mode) => set({ mode }),
      setClinic: (clinicId) => set({ clinicId }),
      setDate: (date) => set((s) => (sameDate(s.date, date) ? s : { date, time: null })),
      setSlot: (date, time) => set({ date, time }),
      setTime: (time) => set({ time }),
      setPatient: (patientId) => set({ patientId }),
      startReschedule: (reschedulingId, doctorId, mode) => set({ reschedulingId, doctorId, mode, time: null }),
      finishReschedule: () => set({ reschedulingId: null }),
      clearSlot: () => set({ time: null }),
      reset: () => set(seed),
    }),
    { name: 'booking-draft', storage: persistStorage },
  ),
)

/** The doctor the booking and consultation screens are about. */
export const useSelectedDoctor = () => getDoctor(useBooking((s) => s.doctorId))
