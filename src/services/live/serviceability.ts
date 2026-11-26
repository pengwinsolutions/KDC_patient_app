/**
 * Live: can medicines be delivered to a pincode? GET /public/pharmacy/serviceable?pincode= (no
 * token) → {pincode, serviceable, restricted, message}. `restricted: false` means no pharmacy has
 * set a delivery area yet, so every pincode is served. Checkout refuses an unserved pincode with
 * 422 `pincode_not_serviceable` (field `addressId`), which holdPharmacy records here too, so the
 * checkout screen marks that address whatever the earlier lookup said.
 */
import { create } from 'zustand'
import type { Address } from '../../types'
import { ServiceError } from '../errors'
import { api, qs } from './http'

export interface Serviceability {
  pincode: string
  serviceable: boolean
  restricted: boolean
  message: string
}

export interface PincodeStatus {
  ok: boolean
  message: string
  at: number
}

const TTL_MS = 5 * 60_000
/** The app shows "area – PIN" (account.ts PIN_SEPARATOR); older or hand-typed areas end with the PIN. */
export function pincodeOf(a: Pick<Address, 'area'> | null | undefined): string {
  const m = /(\d{6})\s*$/.exec(a?.area ?? '')
  return m ? m[1] : ''
}

export const notServiceableText = (pincode: string) => `We don’t deliver medicines to ${pincode} yet. Choose another address, or check back soon.`

/** Known answers by pincode (from the lookup or a checkout refusal). */
export const useServiceability = create<{ byPin: Record<string, PincodeStatus> }>(() => ({ byPin: {} }))

const record = (pincode: string, ok: boolean, message: string) =>
  useServiceability.setState((s) => ({ byPin: { ...s.byPin, [pincode]: { ok, message, at: Date.now() } } }))

const inflight = new Map<string, Promise<PincodeStatus>>()

/**
 * The pincode's status, cached for a few minutes (`fresh` asks again, as checkout does before
 * placing). A failed lookup throws and records nothing: the server checks again at checkout.
 */
export function checkServiceable(pincode: string, opts: { fresh?: boolean } = {}): Promise<PincodeStatus> {
  const pin = pincode.trim()
  const known = useServiceability.getState().byPin[pin]
  if (!opts.fresh && known && Date.now() - known.at < TTL_MS) return Promise.resolve(known)
  const pending = inflight.get(pin)
  if (pending && !opts.fresh) return pending
  const p = api
    .pub<Serviceability>(`public/pharmacy/serviceable${qs({ pincode: pin })}`)
    .then((r) => {
      record(pin, r.serviceable, r.serviceable ? r.message : r.message || notServiceableText(pin))
      return useServiceability.getState().byPin[pin]
    })
    .finally(() => inflight.delete(pin))
  inflight.set(pin, p)
  return p
}

/** Checkout refused this pincode (422 pincode_not_serviceable). */
export const markNotServiceable = (pincode: string, message?: string) => pincode && record(pincode, false, message || notServiceableText(pincode))

/** Checkout's 422 `pincode_not_serviceable`, as the app's http client throws it (code invalid, field addressId). */
export const isNotServiceable = (e: unknown): e is ServiceError =>
  e instanceof ServiceError && e.code === 'invalid' && e.field === 'addressId' && /deliver medicines to|serviceable/i.test(e.message)

export const resetServiceability = () => {
  inflight.clear()
  useServiceability.setState({ byPin: {} })
}
