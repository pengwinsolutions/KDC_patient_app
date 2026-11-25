/**
 * Push notifications (Firebase Cloud Messaging), so a patient hears about their consultation,
 * order or report while the app is closed. Ready, but on only when Firebase is configured for
 * the build (android/app/google-services.json, ios/PatientApp/GoogleService-Info.plist); until
 * then every function here is a no-op and the in-app inbox (src/notifications/inbox.ts) still works.
 *
 * - startPush (after sign-in): asks permission (Android 13+, iOS), registers this phone's token
 *   with the server, and re-registers when Firebase rotates it.
 * - In the foreground a push shows as the in-app notification banner (tap opens it) and refreshes the inbox.
 * - Tapping a push (app in the background or closed) opens what it's about.
 * - stopPush (sign-out): removes this phone from the account before the session ends, so it
 *   gets none of this person's notifications (the server also only sends to live sign-ins).
 */
import { PermissionsAndroid, Platform } from 'react-native'
import { LIVE } from '../services/config'
import { api } from '../services/live/http'
import { notificationRoute } from '../services/live/notifications'
import { installId } from '../store/storage'
import { showInAppPush } from '../store/inAppPush'
import type { NotificationItem } from '../types'
import { refreshInbox } from './inbox'

/* eslint-disable @typescript-eslint/no-require-imports -- loaded only when Firebase is configured */
type Messaging = typeof import('@react-native-firebase/messaging')
type Remote = { notification?: { title?: string; body?: string }; data?: Record<string, unknown> } | null

const APP_VERSION: string = require('../../package.json').version

/** The messaging module, or null when Firebase isn't configured for this build. */
function firebase(): { m: Messaging; instance: ReturnType<Messaging['getMessaging']> } | null {
  if (!LIVE) return null
  try {
    const { getApps } = require('@react-native-firebase/app') as typeof import('@react-native-firebase/app')
    if (!getApps().length) return null
    const m = require('@react-native-firebase/messaging') as Messaging
    return { m, instance: m.getMessaging() }
  } catch {
    return null
  }
}

export const pushAvailable = () => firebase() !== null

/** Where a push opens, from its data ({ type, code } like the inbox). */
export function pushRoute(remote: Remote): { screen: string; params: Record<string, unknown> } | null {
  const data = remote?.data ?? {}
  const type = typeof data.type === 'string' ? data.type : undefined
  const code = typeof data.code === 'string' && data.code ? data.code : null
  if (!type) return null
  return notificationRoute({ target: { type, code } } as NotificationItem)
}

async function allowed(fb: NonNullable<ReturnType<typeof firebase>>): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Number(Platform.Version) < 33) return true
    const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
    return r === PermissionsAndroid.RESULTS.GRANTED
  }
  const status = await fb.m.requestPermission(fb.instance)
  return status === fb.m.AuthorizationStatus.AUTHORIZED || status === fb.m.AuthorizationStatus.PROVISIONAL
}

function register(fcmToken: string | null) {
  return api.put(`me/devices/${installId()}`, {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    osVersion: String(Platform.Version).slice(0, 32),
    appVersion: APP_VERSION.slice(0, 32),
    fcmToken,
  })
}

let stop: (() => void) | null = null

/**
 * After sign-in (once per session). `open` navigates to a screen; `opened` is called with the
 * push that launched the app, if any.
 */
export async function startPush(open: (screen: string, params: Record<string, unknown>) => void): Promise<'on' | 'denied' | 'unavailable'> {
  const fb = firebase()
  if (!fb) return 'unavailable'
  stop?.()
  const granted = await allowed(fb).catch(() => false)
  // Registered either way: the server lists this phone among the patient's devices.
  const token = granted ? await fb.m.getToken(fb.instance).catch(() => null) : null
  await register(token).catch(() => undefined)

  const offRefresh = fb.m.onTokenRefresh(fb.instance, (t) => void register(t).catch(() => undefined))
  const offMessage = fb.m.onMessage(fb.instance, (remote) => {
    void refreshInbox()
    const title = remote.notification?.title
    if (!title) return
    const route = pushRoute(remote as Remote)
    showInAppPush({
      type: typeof remote.data?.type === 'string' ? remote.data.type : 'campaign',
      urgent: remote.data?.event === 'consultation.doctor_ready',
      title,
      body: remote.notification?.body,
      open: route ? () => open(route.screen, route.params) : undefined,
    })
  })
  const offOpened = fb.m.onNotificationOpenedApp(fb.instance, (remote) => {
    void refreshInbox()
    const route = pushRoute(remote as Remote)
    if (route) open(route.screen, route.params)
  })
  stop = () => {
    offRefresh()
    offMessage()
    offOpened()
    stop = null
  }
  // The push that started the app from closed.
  const initial = await fb.m.getInitialNotification(fb.instance).catch(() => null)
  const route = pushRoute(initial as Remote)
  if (route) open(route.screen, route.params)
  return granted ? 'on' : 'denied'
}

/** Sign-out: forget this phone on the server first (needs the session), then locally. */
export async function stopPush(sessionToken: string | null): Promise<void> {
  stop?.()
  if (!LIVE || !sessionToken) return
  const fb = firebase() // resolved before the network call
  await api.del(`me/devices/${installId()}`).catch(() => undefined)
  if (fb) await fb.m.deleteToken(fb.instance).catch(() => undefined)
}

/** index.js: data that arrives while the app is closed needs a handler (the system shows the notification itself). */
export function registerBackgroundPush() {
  const fb = firebase()
  fb?.m.setBackgroundMessageHandler(fb.instance, async () => undefined)
}
