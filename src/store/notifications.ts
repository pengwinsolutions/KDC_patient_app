import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NotificationItem } from '../types'
import { notifications as seedNotifications } from '../mock-data/mock'
import { persistStorage } from './storage'
import { LIVE } from '../services/config'
import { deleteNotification, markAllNotificationsRead, markNotificationRead } from '../services/live/notifications'

interface NotificationsState {
  added: NotificationItem[]
  readIds: string[]
  markRead: (id: string) => void
  markAllRead: () => void
  push: (item: Omit<NotificationItem, 'id' | 'group' | 'unread'>) => void
  /** Live: deletes it on the server. */
  remove: (id: string) => Promise<void>
  /** Live: the server's inbox replaces the feed. */
  setAll: (items: NotificationItem[]) => void
  reset: () => void
}

let serial = 0

export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      added: [],
      readIds: [],
      markRead: (id) => {
        const n = get().added.find((x) => x.id === id)
        set((s) => (s.readIds.includes(id) ? s : { readIds: [...s.readIds, id] }))
        if (LIVE && n?.unread) {
          markNotificationRead(id).catch(() => set((s) => ({ readIds: s.readIds.filter((x) => x !== id) })))
        }
      },
      markAllRead: () => {
        const before = get().readIds
        set({ readIds: allNotifications(get().added).map((n) => n.id) })
        if (LIVE) markAllNotificationsRead().catch(() => set({ readIds: before }))
      },
      remove: async (id) => {
        if (LIVE) await deleteNotification(id)
        set((s) => ({ added: s.added.filter((n) => n.id !== id) }))
      },
      setAll: (added) => set({ added, readIds: [] }),
      push: (item) =>
        set((s) => ({
          added: [{ ...item, id: `n${Date.now().toString(36)}${serial++}`, group: 'Today', unread: true }, ...s.added],
        })),
      reset: () => set({ added: [], readIds: [] }),
    }),
    { name: 'notifications', storage: persistStorage },
  ),
)

/** Demo: the blueprint's feed plus what the app added. Live: the server's inbox only. */
const allNotifications = (added: NotificationItem[]) => (LIVE ? added : [...added, ...seedNotifications])

/** The feed with read-state applied. */
export function notificationFeed(added: NotificationItem[], readIds: string[]): NotificationItem[] {
  return allNotifications(added).map((n) => ({ ...n, unread: n.unread && !readIds.includes(n.id) }))
}

export const useUnreadCount = () =>
  useNotifications((s) => notificationFeed(s.added, s.readIds).filter((n) => n.unread).length)
