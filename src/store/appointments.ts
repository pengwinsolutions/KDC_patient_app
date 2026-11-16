import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Appointment, AppointmentFeedback } from '../types'
import { appointments as seedAppointments } from '../mock-data/mock'
import { services } from '../services'
import type { BookingRequest } from '../services/appointments'
import type { CalendarDate } from '../domain/schedule'
import { LIVE } from '../services/config'
import { persistStorage } from './storage'

const live = () => require('../services/live/appointments') as typeof import('../services/live/appointments')

interface AppointmentsState {
  items: Appointment[]
  lastBookedId: string | null
  lastCancelledId: string | null
  book: (request: BookingRequest) => Promise<Appointment>
  cancel: (id: string) => Promise<Appointment>
  reschedule: (id: string, date: CalendarDate, time: string) => Promise<Appointment>
  complete: (id: string) => Promise<void>
  /** Live: sent to the server first (completed consultations only, once). */
  saveFeedback: (id: string, feedback: AppointmentFeedback) => void | Promise<void>
  reset: () => void
}

/* Live: filled from the server by the 'appointments' sync domain. */
const seed = { items: LIVE ? [] : seedAppointments, lastBookedId: null, lastCancelledId: null }

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
          // Live bookings go through checkout: the slot is held on the server (flows-care.ts), then paid.
          if (LIVE) throw new Error('Live bookings are made by checkout')
          const appointment = await services.appointments.book(request)
          set((s) => ({ items: [appointment, ...s.items], lastBookedId: appointment.id }))
          return appointment
        },
        cancel: async (id) => {
          const cancelled = LIVE ? await live().cancelAppointment(id) : await services.appointments.cancel(find(id))
          set((s) => ({ items: replace(s.items, cancelled), lastCancelledId: id }))
          return cancelled
        },
        reschedule: async (id, date, time) => {
          const moved = LIVE ? await live().rescheduleAppointment(id, date, time) : await services.appointments.reschedule(find(id), date, time)
          set((s) => ({ items: replace(s.items, moved) }))
          return moved
        },
        complete: async (id) => {
          // Live: the doctor completes a consultation; the app only reloads it.
          const done = LIVE ? await live().getAppointment(id) : await services.appointments.complete(find(id))
          set((s) => ({ items: replace(s.items, done) }))
        },
        saveFeedback: (id, feedback) => {
          const apply = () => {
            set((s) => ({ items: s.items.map((a) => (a.id === id ? { ...a, feedback, canGiveFeedback: false } : a)) }))
          }
          if (!LIVE) return apply()
          return live().sendFeedback(id, feedback).then(apply)
        },
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

/** Live: what a screen shows for an appointment that isn't loaded (blank, never a demo one). */
export const NO_APPOINTMENT: Appointment = { id: '', bookingId: '', doctorId: '', mode: 'video', date: '', dateIso: '', time: '', status: 'confirmed', fee: 0, platformFee: 0, discount: 0, for: '' }

export function appointmentById(items: Appointment[], id: string | undefined): Appointment {
  if (LIVE) return items.find((a) => a.id === id) ?? NO_APPOINTMENT
  return items.find((a) => a.id === id) ?? upcomingOf(items)[0] ?? items[0]
}

/** Times on a date this doctor already holds for this patient. */
export function takenTimes(items: Appointment[], doctorId: string, iso: string): string[] {
  return items.filter((a) => isUpcoming(a) && a.doctorId === doctorId && a.dateIso === iso).map((a) => a.time)
}
