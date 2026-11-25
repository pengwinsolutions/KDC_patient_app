/** The patient's notifications on the backend (/me/notifications). */
import type { NotificationCategory, NotificationItem } from '../../types'
import { api } from './http'
import { atToDay, atToTime } from './map'

interface NotificationRow {
  id: number
  category: string
  title: string
  body: string
  data: { type?: string; code?: string | null } | null
  unread: boolean
  createdAt: string
  group: NotificationItem['group']
}

const CATEGORIES: NotificationCategory[] = ['Appointments', 'Prescriptions', 'Diagnostics', 'Pharmacy', 'Payments', 'System']

/** The button a notification offers, by what it opens. */
const ACTIONS: Record<string, string> = {
  appointment: 'View appointment',
  consultation: 'View appointment',
  prescription: 'View prescription',
  lab_report: 'View report',
  lab_booking: 'Track booking',
  order: 'Track order',
  payment: 'View payments',
  membership: 'View membership',
  support_ticket: 'Read the reply',
  waiting_room: 'Join now',
}

export function toNotification(n: NotificationRow): NotificationItem {
  const type = n.data?.type
  const code = n.data?.code ?? null
  return {
    id: String(n.id),
    group: n.group,
    category: (CATEGORIES as string[]).includes(n.category) ? (n.category as NotificationCategory) : 'System',
    title: n.title,
    body: n.body,
    time: n.group === 'Today' ? atToTime(n.createdAt) : atToDay(n.createdAt),
    unread: n.unread,
    action: type && code && ACTIONS[type] ? ACTIONS[type] : undefined,
    target: type ? { type, code } : undefined,
  }
}

export async function loadNotifications(): Promise<NotificationItem[]> {
  const r = await api.get<{ rows: NotificationRow[] }>('me/notifications?limit=100')
  return r.rows.map(toNotification)
}

export const markNotificationRead = (id: string, read = true) => api.post(`me/notifications/${id}/read`, { read })
export const markAllNotificationsRead = () => api.post('me/notifications/read-all', {})
export const deleteNotification = (id: string) => api.del(`me/notifications/${id}`)

/** Where a notification's action leads: the screen and its params. */
export function notificationRoute(n: NotificationItem): { screen: string; params: Record<string, unknown> } | null {
  const code = n.target?.code
  if (!code) return null
  switch (n.target?.type) {
    case 'appointment':
    case 'consultation':
      return { screen: 'appointment-detail', params: { id: code } }
    case 'prescription':
      return { screen: 'prescription', params: { rxId: code } }
    case 'lab_report':
      return { screen: 'lab-report', params: { id: code } }
    case 'lab_booking':
      return { screen: 'diagnostic-tracking', params: { id: code } }
    case 'order':
      return { screen: 'order-tracking', params: { id: code } }
    case 'waiting_room':
      return { screen: 'waiting-room', params: { id: code } }
    case 'payment':
      return { screen: 'payments', params: {} }
    case 'membership':
      return { screen: 'membership-manage', params: {} }
    case 'support_ticket':
      return { screen: 'help', params: {} }
    default:
      return null
  }
}
