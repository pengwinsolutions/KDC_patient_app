/// <reference types="node" />
/**
 * Shared by the live contract tests (__tests__/live/*.contract.test.ts): the app's own modules on a
 * real KDC+ backend. They run only when pointed at a server:
 *   PATIENT_LIVE_URL=http://127.0.0.1:4100/api/v1 PATIENT_DATA=/path/p11d-data.json npx jest __tests__/live
 * PATIENT_DATA comes from the backend test kit (p11d-seed.mjs): the catalogue's codes, the MSG91
 * stand-in's SMS log (sign-in codes are read from it) and the Razorpay stand-in's control port
 * (Checkout's result is simulated with it). Each test file signs in its own patient.
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

export const LIVE_URL = process.env.PATIENT_LIVE_URL
export const liveSuite = LIVE_URL ? describe : describe.skip
export const data = LIVE_URL ? JSON.parse(readFileSync(process.env.PATIENT_DATA!, 'utf8')) : null
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const smsLines = () => readFileSync(data.smsLog, 'utf8').trim().split('\n').filter(Boolean)
export const smsCount = () => smsLines().length

export async function smsCodeFor(mobile: string, since: number): Promise<string> {
  for (let i = 0; i < 80; i++) {
    const hit = smsLines()
      .slice(since)
      .map((l) => JSON.parse(l))
      .filter((e: { kind: string; to: string }) => e.kind === 'sms' && e.to === `91${mobile}`)
      .at(-1)
    if (hit) return hit.code
    await sleep(100)
  }
  throw new Error(`no SMS for ${mobile}`)
}

const db = process.env.PATIENT_DB ?? 'kdcplus_r2'
export const sql = (q: string) => execSync(`mysql ${db} -N -e "${q}"`, { encoding: 'utf8' }).trim()

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Signs in through the app's own sign-in service (SMS code from the stand-in's log), retrying
 * while the resend window is open. Completes the profile when `profile` is given and it's new.
 */
export async function signIn(mobile: string, profile?: { name: string; dob?: string; gender?: string }) {
  const { services } = require('../src/services') as typeof import('../src/services')
  const { useSession } = require('../src/store/session') as typeof import('../src/store/session')
  const me = require('../src/services/live/me') as typeof import('../src/services/live/me')
  for (let attempt = 0; ; attempt++) {
    const since = smsCount()
    try {
      await services.auth.requestOtp(mobile)
    } catch (e) {
      if ((e as { code?: string }).code === 'rate_limited' && attempt < 8) {
        await sleep(5000)
        continue
      }
      throw e
    }
    const { token } = await services.auth.verifyOtp(mobile, await smsCodeFor(mobile, since))
    useSession.getState().signIn(token, mobile)
    break
  }
  const view = await me.loadMe()
  if (!view.profileCompleted && profile) {
    await me.saveProfile({ name: profile.name, dob: profile.dob ?? '14 Mar 1991', gender: profile.gender ?? 'Female', email: '', bloodGroup: 'O+' }, true)
  }
  return view
}

/**
 * Stands in for Razorpay Checkout: the native SDK's `open` resolves with what the stand-in's
 * `/pay` returns for that order (a captured payment and its signature), in the SDK's snake_case.
 * `decline: true` rejects the way the SDK does when the patient's bank declines or they close it.
 */
export function simulateCheckout(opts: { decline?: boolean } = {}) {
  const sdk = (require('react-native-razorpay') as { default: { open: jest.Mock } }).default
  sdk.open.mockImplementation(async (options: { order_id: string }) => {
    if (opts.decline) throw { code: 2, description: 'Payment cancelled by user' }
    const cb = await (await fetch(`${data.rzpControl}/pay`, { method: 'POST', body: JSON.stringify({ orderId: options.order_id }) })).json()
    return { razorpay_order_id: cb.razorpayOrderId, razorpay_payment_id: cb.razorpayPaymentId, razorpay_signature: cb.razorpaySignature }
  })
  return sdk.open
}
