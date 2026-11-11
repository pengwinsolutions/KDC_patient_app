import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NotificationItem } from '../types'
import { notifications as seedNotifications } from '../mock-data/mock'
import { persistStorage } from './storage'

interface NotificationsState {
  added: NotificationItem[]
  readIds: string[]
  markRead: (id: string) => void
  markAllRead: () => void
  push: (item: Omit<NotificationItem, 'id' | 'group' | 'unread'>) => void
  reset: () => void
}

let serial = 0

export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      added: [],
      readIds: [],
      markRead: (id) => set((s) => (s.readIds.includes(id) ? s : { readIds: [...s.readIds, id] })),
      markAllRead: () => set({ readIds: allNotifications(get().added).map((n) => n.id) }),
      push: (item) =>
        set((s) => ({
          added: [{ ...item, id: `n${Date.now().toString(36)}${serial++}`, group: 'Today', unread: true }, ...s.added],
        })),
      reset: () => set({ added: [], readIds: [] }),
    }),
    { name: 'notifications', storage: persistStorage },
  ),
)

const allNotifications = (added: NotificationItem[]) => [...added, ...seedNotifications]

/** The feed with read-state applied. */
export function notificationFeed(added: NotificationItem[], readIds: string[]): NotificationItem[] {
  return allNotifications(added).map((n) => ({ ...n, unread: n.unread && !readIds.includes(n.id) }))
}

export const useUnreadCount = () =>
  useNotifications((s) => notificationFeed(s.added, s.readIds).filter((n) => n.unread).length)
