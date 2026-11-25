/**
 * Live checkout outcomes: Razorpay's platform-specific error codes (a dropped connection is not a
 * cancel), a paid-but-refunded purchase is never shown as success, and a lapsed hold is final.
 */
import { sdkOutcome } from '../../src/services/live/checkout'

describe('what the Razorpay SDK error means', () => {
  it('reads cancel and network codes the right way round per platform', () => {
    expect(sdkOutcome({ code: 0 }, 'android')).toBe('cancelled')
    expect(sdkOutcome({ code: 2 }, 'android')).toBe('network')
    expect(sdkOutcome({ code: 2 }, 'ios')).toBe('cancelled')
    expect(sdkOutcome({ code: '0' }, 'ios')).toBe('network')
    expect(sdkOutcome({ code: 1, description: 'Card declined' }, 'android')).toBe('error')
  })

  it('trusts an explicit "cancelled" description', () => {
    expect(sdkOutcome({ code: 2, description: 'Payment cancelled by user' }, 'android')).toBe('cancelled')
    expect(sdkOutcome({}, 'android')).toBe('error')
  })
})

describe('the server’s view after paying', () => {
  beforeEach(() => jest.resetModules())

  const load = (views: object[], sdk?: () => Promise<unknown>) => {
    const get = jest.fn()
    views.forEach((v) => get.mockResolvedValueOnce({ code: 'KDC-PT-1', amount: 500, failureReason: null, ...v }))
    jest.doMock('../../src/services/live/http', () => ({
      api: { get, post: jest.fn(async () => ({})) },
      request: jest.fn(async () => ({ code: 'KDC-PT-1', amount: 500, status: 'created', failureReason: null, checkout: { keyId: 'rzp_test_x', orderId: 'order_1', amount: 50000, currency: 'INR', name: 'KDC+', description: 'Visit' } })),
    }))
    const rzp = (require('react-native-razorpay') as { default: { open: jest.Mock } }).default
    rzp.open.mockImplementation(sdk ?? (async () => ({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' })))
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    return require('../../src/services/live/checkout') as typeof import('../../src/services/live/checkout')
  }

  it('paid and fulfilled is success', async () => {
    const { payFor } = load([{ status: 'paid', fulfilment: 'fulfilled' }])
    await expect(payFor('KDC-AP-1', 'k')).resolves.toEqual({ status: 'paid' })
  })

  it('paid but refunded (slot taken) says refunded, with the reason', async () => {
    const { payFor, REFUNDED } = load([{ status: 'paid', fulfilment: 'refunded', failureReason: 'That slot was just taken.' }])
    await expect(payFor('KDC-AP-1', 'k')).resolves.toEqual({ status: 'refunded', reason: `That slot was just taken. ${REFUNDED}` })
  })

  it('a lapsed hold fails at once, saying nothing was charged', async () => {
    const { payFor, LAPSED } = load([{ status: 'cancelled' }])
    await expect(payFor('KDC-AP-1', 'k')).resolves.toEqual({ status: 'failed', reason: LAPSED })
  })

  it('a "cancel" after the money went through (Back from a UPI app) is a success', async () => {
    const { payFor } = load([{ status: 'paid', fulfilment: 'fulfilled' }], async () => {
      throw { code: 2, description: 'Payment cancelled by user' }
    })
    await expect(payFor('KDC-AP-1', 'k')).resolves.toEqual({ status: 'paid' })
  })

  it('a real cancel stays a cancel', async () => {
    const { payFor } = load([{ status: 'created' }], async () => {
      throw { code: 2, description: 'Payment cancelled by user' }
    })
    await expect(payFor('KDC-AP-1', 'k')).resolves.toEqual({ status: 'cancelled' })
  })

  it('a dropped connection is reported as such, not as a cancel', async () => {
    jest.useFakeTimers()
    const { payFor, NETWORK_DROPPED } = load(Array(6).fill({ status: 'created' }), async () => {
      throw { code: 0, description: 'Network error' } // iOS's network code (jest runs as iOS)
    })
    const done = payFor('KDC-AP-1', 'k')
    await jest.runAllTimersAsync()
    await expect(done).resolves.toEqual({ status: 'failed', reason: NETWORK_DROPPED })
    jest.useRealTimers()
  })

  it('finds a payment confirmed after the app stopped waiting, without opening Checkout again', async () => {
    const mod = load([])
    const http = require('../../src/services/live/http') as { request: jest.Mock }
    http.request.mockResolvedValueOnce({ code: 'KDC-PT-1', amount: 500, status: 'paid', fulfilment: 'fulfilled', failureReason: null })
    await expect(mod.paidLater('KDC-AP-1', 'k')).resolves.toBe('paid')
    expect(http.request).toHaveBeenLastCalledWith('POST', 'patient/payments', { purposeCode: 'KDC-AP-1' }, { headers: { 'Idempotency-Key': 'k' } })
    const rzp = (require('react-native-razorpay') as { default: { open: jest.Mock } }).default
    expect(rzp.open).not.toHaveBeenCalled()
    http.request.mockResolvedValueOnce({ code: 'KDC-PT-1', amount: 500, status: 'created', failureReason: null })
    await expect(mod.paidLater('KDC-AP-1', 'k')).resolves.toBeNull()
    http.request.mockRejectedValueOnce(new Error('offline'))
    await expect(mod.paidLater('KDC-AP-1', 'k')).resolves.toBeNull()
  })
})
