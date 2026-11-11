import type { PaymentMethod } from '../types'
import { delay } from './latency'

export interface ChargeRequest {
  amount: number
  method: PaymentMethod
}

export type ChargeResult = { ok: true; reference: string } | { ok: false; reason: string }

export interface PaymentsService {
  charge(request: ChargeRequest): Promise<ChargeResult>
}

const PROCESSING_MS = 1400

/** A UPI ID beginning with `fail` is the mock gateway's decline switch. */
export function isDeclined(method: PaymentMethod): boolean {
  return method.kind === 'upi' && method.label.toLowerCase().startsWith('fail')
}

export const mockPaymentsService: PaymentsService = {
  charge: ({ method }) =>
    delay(
      isDeclined(method)
        ? { ok: false as const, reason: 'Your bank declined the transaction.' }
        : { ok: true as const, reference: `PAY${Date.now().toString(36).toUpperCase()}` },
      PROCESSING_MS,
    ),
}
