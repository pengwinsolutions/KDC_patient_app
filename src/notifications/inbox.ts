/**
 * Keeps the notification inbox (and the bell's badge) current while the app is open. The inbox
 * used to load once at launch and then go stale for the whole session.
 *
 * - Back in the foreground: the inbox reloads.
 * - While in the foreground: every minute, a cheap unread-count check; the list reloads only when
 *   the server's count differs from the app's.
 * - Push messages (src/notifications/push.ts) and pull-to-refresh call refreshInbox() directly.
 * Concurrent refreshes share one request.
 */
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { LIVE } from '../services/config'
import { api } from '../services/live/http'
import { syncOne } from '../services/live/sync'
import { notificationFeed, useNotifications } from '../store/notifications'
import { useSession } from '../store/session'

export const INBOX_CHECK_MS = 60_000

let inflight: Promise<void> | null = null

export function refreshInbox(): Promise<void> {
  if (!LIVE) return Promise.resolve()
  inflight ??= syncOne('notifications')
    .catch(() => undefined)
    .finally(() => {
      inflight = null
    })
  return inflight
}

const unreadInApp = () => {
  const s = useNotifications.getState()
  return notificationFeed(s.added, s.readIds).filter((n) => n.unread).length
}

/** Reloads the list only when the server has a different unread count. */
export async function checkInbox(): Promise<void> {
  if (!LIVE) return
  try {
    const { unread } = await api.get<{ unread: number }>('me/notifications/unread-count')
    if (unread !== unreadInApp()) await refreshInbox()
  } catch {
    // Offline or signed out: the next check or foreground tries again.
  }
}

/** Mounted once by the app shell; does nothing until someone is signed in. */
export function useLiveInbox() {
  const signedIn = useSession((s) => Boolean(s.token))
  useEffect(() => {
    if (!LIVE || !signedIn) return
    let timer: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (!timer) timer = setInterval(() => void checkInbox(), INBOX_CHECK_MS)
    }
    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    if (AppState.currentState === 'active') start()
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshInbox()
        start()
      } else stop()
    })
    return () => {
      sub.remove()
      stop()
    }
  }, [signedIn])
}
