/**
 * The KDC+ backend client for live builds.
 *
 * - Returns the `data` of the backend's `{ code, message, data, errors }` envelope
 *   failures throw the app's ServiceError with the server's message, and the field
 *   name when the server pins the problem to one (forms show it under that field).
 * - The access token is in memory (session store); the refresh token is in the
 *   Keychain. An expired access token is refreshed once (one refresh at a time),
 *   and a session that can't be refreshed ends once. An outage never signs out.
 */
import { ServiceError } from '../errors'
import { API_CONFIG } from '../config'
import { useSession } from '../../store/session'
import { clearRefreshToken, loadRefreshToken, saveRefreshToken } from '../../store/secure'
import type { PickedFile } from '../documents'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * The request never reached the server (no network, wrong address, timeout). Development
 * builds name the address, since there the usual cause is a backend that isn't running or
 * an Android device without the port forwarded.
 */
export const OFFLINE = __DEV__
  ? `Can’t reach the KDC+ server at ${API_CONFIG.baseUrl}. Start the backend (npm run start:dev in KDC_backend); on an Android device, also run npm run api:reverse.`
  : 'Can’t reach KDC+. Check your connection and try again.'
/** The server answered but failed (5xx): the connection is fine, so don't send people to check it. */
const SERVER_DOWN = 'KDC+ is having trouble right now. Please try again in a few minutes.'
const SESSION_ENDED = 'Your session has ended. Please sign in again.'

let onSessionEnded: (() => void) | null = null
let endedOnce = false

/** Called once by the app shell: where to go when the session can't continue. */
export function setSessionEndedHandler(fn: () => void) {
  onSessionEnded = fn
}

function sessionEnded() {
  useSession.setState({ token: null })
  void clearRefreshToken()
  if (!endedOnce) {
    endedOnce = true
    onSessionEnded?.()
  }
}

interface Envelope<T> {
  code: number
  message?: string
  data?: T
  errors?: Record<string, string[]> | null
}

async function http<T>(method: Method, path: string, body: unknown, token: string | null, extra?: Record<string, string>): Promise<{ status: number; json: Envelope<T> | null }> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extra }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), API_CONFIG.timeoutMs)
  try {
    const r = await fetch(`${API_CONFIG.baseUrl}/${path.replace(/^\/+/, '')}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctrl.signal })
    return { status: r.status, json: (await r.json().catch(() => null)) as Envelope<T> | null }
  } catch {
    throw new ServiceError('unavailable', OFFLINE)
  } finally {
    clearTimeout(timer)
  }
}

let refreshing: Promise<string | null> | null = null

/** A new access token from the Keychain's refresh token; null when the session has ended. Throws on an outage. */
export function refreshSession(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const refreshToken = await loadRefreshToken()
      if (!refreshToken) return null
      const { status, json } = await http<{ accessToken: string; refreshToken: string }>('POST', 'auth/refresh', { refreshToken }, null)
      if (status === 200 && json?.data) {
        await saveRefreshToken(json.data.refreshToken)
        useSession.setState({ token: json.data.accessToken })
        return json.data.accessToken
      }
      if (status === 401) return null
      throw new ServiceError('unavailable', SERVER_DOWN)
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** Signed in: refresh token to the Keychain, access token in memory. */
export async function adoptSession(pair: { accessToken: string; refreshToken: string }) {
  await saveRefreshToken(pair.refreshToken)
  useSession.setState({ token: pair.accessToken })
  endedOnce = false
}

/** On launch: is there a session to continue? 'offline' when the server can't say. */
export async function restoreSession(): Promise<'signed-in' | 'signed-out' | 'offline'> {
  try {
    if (useSession.getState().token) return 'signed-in'
    const token = await refreshSession()
    if (token) endedOnce = false
    return token ? 'signed-in' : 'signed-out'
  } catch {
    return (await loadRefreshToken()) ? 'offline' : 'signed-out'
  }
}

/** Ends the session on the server, then forgets both tokens. */
export async function endSession(tokenAtSignOut?: string | null) {
  const token = tokenAtSignOut ?? useSession.getState().token
  if (token) await http('POST', 'auth/logout', {}, token).catch(() => undefined)
  useSession.setState({ token: null })
  await clearRefreshToken()
}

const CODES: Record<number, import('../errors').ServiceErrorCode> = { 400: 'invalid', 403: 'forbidden', 404: 'not_found', 409: 'conflict', 413: 'too_large', 415: 'unsupported', 422: 'invalid', 429: 'rate_limited' }

function failure(status: number, json: Envelope<unknown> | null): ServiceError {
  // 503 carries the server's own words for maintenance; other failures get a plain apology.
  if (status >= 500 || !json) return new ServiceError('unavailable', (status === 503 && json?.message) || SERVER_DOWN)
  const [field, messages] = Object.entries(json.errors ?? {})[0] ?? []
  const message = status === 429 ? 'Too many attempts. Please wait a moment and try again.' : (messages?.[0] ?? json.message ?? SERVER_DOWN)
  return new ServiceError(CODES[status] ?? 'invalid', message, field)
}

/** One call to the backend: the envelope's data, or a ServiceError. */
export async function request<T = unknown>(method: Method, path: string, body?: unknown, opts: { auth?: boolean; headers?: Record<string, string> } = {}): Promise<T> {
  const auth = opts.auth ?? true
  let token = auth ? useSession.getState().token : null
  if (auth && !token) token = await refreshSession()
  if (auth && !token) {
    sessionEnded()
    throw new ServiceError('session_ended', SESSION_ENDED)
  }
  let res = await http<T>(method, path, body, token, opts.headers)
  if (auth && res.status === 401) {
    const fresh = await refreshSession()
    if (!fresh) {
      sessionEnded()
      throw new ServiceError('session_ended', SESSION_ENDED)
    }
    res = await http<T>(method, path, body, fresh, opts.headers)
    if (res.status === 401) {
      sessionEnded()
      throw new ServiceError('session_ended', SESSION_ENDED)
    }
  }
  if (res.status >= 200 && res.status < 300) return res.json?.data as T
  throw failure(res.status, res.json)
}

/** `?a=1&b=2` from the defined values (empty strings and nulls are left out). */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  /** Public catalogue reads: no session needed. */
  pub: <T = unknown>(path: string) => request<T>('GET', path, undefined, { auth: false }),
  post: <T = unknown>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body: unknown = {}) => request<T>('PUT', path, body),
  patch: <T = unknown>(path: string, body: unknown = {}) => request<T>('PATCH', path, body),
  del: <T = unknown>(path: string) => request<T>('DELETE', path),
}

const MIME: Record<string, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp' }

export interface UploadedFile {
  id: number
  name: string
  sizeBytes: number
  mime: string
}

/**
 * Uploads a picked file (POST /files, multipart) with progress. The server checks the
 * real type and size; the extension only labels the part.
 */
export async function upload(purpose: string, file: PickedFile, onProgress?: (pct: number) => void): Promise<UploadedFile> {
  const send = (token: string) =>
    new Promise<{ status: number; json: Envelope<UploadedFile> | null }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_CONFIG.baseUrl}/files`)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.timeout = 120_000
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)))
      xhr.onload = () => {
        let json: Envelope<UploadedFile> | null = null
        try {
          json = JSON.parse(xhr.responseText)
        } catch {
          json = null
        }
        resolve({ status: xhr.status, json })
      }
      xhr.onerror = () => reject(new ServiceError('unavailable', OFFLINE))
      xhr.ontimeout = () => reject(new ServiceError('unavailable', OFFLINE))
      const form = new FormData()
      form.append('purpose', purpose)
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      form.append('file', { uri: file.uri, name: file.name, type: MIME[ext] ?? (file.kind === 'pdf' ? 'application/pdf' : 'image/jpeg') } as unknown as Blob)
      xhr.send(form)
    })
  let token = useSession.getState().token ?? (await refreshSession())
  if (!token) {
    sessionEnded()
    throw new ServiceError('session_ended', SESSION_ENDED)
  }
  let res = await send(token)
  if (res.status === 401) {
    token = await refreshSession()
    if (!token) {
      sessionEnded()
      throw new ServiceError('session_ended', SESSION_ENDED)
    }
    res = await send(token)
  }
  if (res.status >= 200 && res.status < 300 && res.json?.data) {
    onProgress?.(100)
    return res.json.data
  }
  throw failure(res.status, res.json)
}
