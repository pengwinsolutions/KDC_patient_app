import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Appointment, AppointmentFeedback } from '../types'
import { appointments as seedAppointments } from '../mock-data/mock'
import { services } from '../services'
import type { BookingRequest } from '../services/appointments'
import type { CalendarDate } from '../domain/schedule'
import { persistStorage } from './storage'

interface AppointmentsState {
  items: Appointment[]
  lastBookedId: string | null
  lastCancelledId: string | null
  book: (request: BookingRequest) => Promise<Appointment>
  cancel: (id: string) => Promise<Appointment>
  reschedule: (id: string, date: CalendarDate, time: string) => Promise<Appointment>
  complete: (id: string) => Promise<void>
  saveFeedback: (id: string, feedback: AppointmentFeedback) => void
  reset: () => void
}

const seed = { items: seedAppointments, lastBookedId: null, lastCancelledId: null }

const replace = (items: Appointment[], next: Appointment) => items.map((a) => (a.id === next.id ? next : a))

export const useAppointments = create<AppointmentsState>()(
  persist(
    (set, get) => {
      const find = (id: string) => {
        const appointment = get().items.find((a) => a.id === id)
        if (!appointment) throw new Error(`Unknown appointment ${id}`)
        return appointment
      }
      return {
        ...seed,
        book: async (request) => {
          const appointment = await services.appointments.book(request)
          set((s) => ({ items: [appointment, ...s.items], lastBookedId: appointment.id }))
          return appointment
        },
        cancel: async (id) => {
          const cancelled = await services.appointments.cancel(find(id))
          set((s) => ({ items: replace(s.items, cancelled), lastCancelledId: id }))
          return cancelled
        },
        reschedule: async (id, date, time) => {
          const moved = await services.appointments.reschedule(find(id), date, time)
          set((s) => ({ items: replace(s.items, moved) }))
          return moved
        },
        complete: async (id) => {
          const done = await services.appointments.complete(find(id))
          set((s) => ({ items: replace(s.items, done) }))
        },
        saveFeedback: (id, feedback) =>
          set((s) => ({ items: s.items.map((a) => (a.id === id ? { ...a, feedback } : a)) })),
        reset: () => set(seed),
      }
    },
    { name: 'appointments', storage: persistStorage },
  ),
)

export const isUpcoming = (a: Appointment) => a.status === 'confirmed' || a.status === 'in-progress'

export const byDateTime = (a: Appointment, b: Appointment) =>
  a.dateIso.localeCompare(b.dateIso) || toClock(a.time) - toClock(b.time)

function toClock(time: string): number {
  const [clock, meridiem] = time.split(' ')
  const [h, m] = clock.split(':').map(Number)
  return ((h % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + m
}

export const upcomingOf = (items: Appointment[]) => items.filter(isUpcoming).sort(byDateTime)

export function appointmentById(items: Appointment[], id: string | undefined): Appointment {
  return items.find((a) => a.id === id) ?? upcomingOf(items)[0] ?? items[0]
}

/** Times on a date this doctor already holds for this patient. */
export function takenTimes(items: Appointment[], doctorId: string, iso: string): string[] {
  return items.filter((a) => isUpcoming(a) && a.doctorId === doctorId && a.dateIso === iso).map((a) => a.time)
}
