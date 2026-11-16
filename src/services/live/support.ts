/** Support tickets on the backend (/me/support-tickets): what "Chat support" opens in live builds. */
import { api, qs } from './http'

export interface TicketRow {
  id: string
  subject: string
  category: string
  priority: string
  status: string
  statusText: string
  created: string
  updated: string
}

export const loadTicketCategories = () => api.get<string[]>('me/support-tickets/categories')
export const loadTickets = (status?: 'open' | 'resolved') => api.get<{ rows: TicketRow[]; total: number }>(`me/support-tickets${qs({ status })}`)
export const createTicket = (t: { subject: string; category: string; description: string; bookingRef?: string }) => api.post<{ id: string }>('me/support-tickets', t)
