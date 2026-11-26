import { currentStage, diagnosticRow, lastFailedAttempt, orderTestTitle, PHARMACY_STATUS_LABEL, pharmacyRow, returnReason, STAGE_INTERVAL_MS, stageState } from '../../src/domain/orderTracking'
import { diagnosticOrders, pharmacyOrders } from '../../src/mock-data/mock'
import type { PharmacyOrder } from '../../src/types'

describe('order stages', () => {
  const placed: PharmacyOrder = { ...pharmacyOrders[0], fixedStage: undefined, placedAt: 1000 }

  it('keeps seeded orders at their fixed stage', () => {
    expect(currentStage(pharmacyOrders[0], Date.now())).toBe(3)
    expect(currentStage(pharmacyOrders[1], 0)).toBe(4)
  })

  it('advances a new order over time and stops at the last stage', () => {
    expect(currentStage(placed, 1000)).toBe(0)
    expect(currentStage(placed, 1000 + STAGE_INTERVAL_MS)).toBe(1)
    expect(currentStage(placed, 1000 + STAGE_INTERVAL_MS * 99)).toBe(4)
  })

  it('classifies stage states', () => {
    expect(stageState(0, 2, false)).toBe('done')
    expect(stageState(2, 2, false)).toBe('active')
    expect(stageState(3, 2, false)).toBe('pending')
    expect(stageState(4, 4, true)).toBe('done')
  })
})

describe('order rows', () => {
  const name = (id: string) => ({ m1: 'Telma 40 Tablet', m2: 'Rosuvas 10 Tablet', m3: 'Ecosprin 75 Tablet' }[id] ?? id)

  it('prints the blueprint pharmacy rows', () => {
    expect(pharmacyRow(pharmacyOrders[0], name, 0)).toMatchObject({
      title: '3 medicines',
      sub: 'Telma 40, Rosuvas 10, Ecosprin 75',
      when: 'Arriving today by 7:30 PM',
      amount: 263,
      status: 'Out for delivery',
      live: true,
    })
    expect(pharmacyRow(pharmacyOrders[1], name, 0)).toMatchObject({ status: 'Delivered', live: false })
  })

  it('prints the blueprint diagnostic rows', () => {
    const live = diagnosticRow(diagnosticOrders[0], 'HbA1c', 'Dr. Lal PathLabs', 0)
    expect(live).toMatchObject({ when: 'Tue, 7 Oct · 7:00 – 8:00 AM', status: 'Confirmed', live: true, screen: 'diagnostic-tracking' })
    const done = diagnosticRow(diagnosticOrders[1], 'Lipid Profile — Complete', 'Dr. Lal PathLabs', 0)
    expect(done).toMatchObject({ status: 'Report ready', live: false, screen: 'lab-report', when: 'Reported 28 Sep, 6:45 PM' })
  })

  it('shows a cancelled booking as not live', () => {
    const row = diagnosticRow({ ...diagnosticOrders[0], status: 'cancelled' }, 'HbA1c', 'L', 0)
    expect(row).toMatchObject({ status: 'Cancelled', live: false, tone: 'neutral' })
  })

  it('prefers the full test name only when it is short', () => {
    expect(orderTestTitle({ name: 'Lipid Profile — Complete', short: 'Lipid Profile' })).toBe('Lipid Profile — Complete')
    expect(orderTestTitle({ name: 'HbA1c (Glycosylated Haemoglobin)', short: 'HbA1c' })).toBe('HbA1c')
  })
})

describe('Wave 2 delivery statuses', () => {
  const name = (id: string) => id
  const base: PharmacyOrder = { ...pharmacyOrders[0] }

  it('labels the new statuses for patients', () => {
    expect(PHARMACY_STATUS_LABEL.delivery_failed).toBe('Delivery attempt failed')
    expect(PHARMACY_STATUS_LABEL.returned).toBe('Returned to pharmacy')
    expect(PHARMACY_STATUS_LABEL.out_for_delivery).toBe('Out for delivery')
  })

  it('a failed delivery is still in progress, in caution', () => {
    const row = pharmacyRow({ ...base, status: 'delivery_failed', fixedStage: 3, statusLabel: 'Delivery attempt failed' }, name, 0)
    expect(row).toMatchObject({ status: 'Delivery attempt failed', tone: 'caution', live: true })
  })

  it('a returned order is finished, with its refund', () => {
    const row = pharmacyRow({ ...base, status: 'returned', cancelled: true, statusLabel: 'Returned to pharmacy', refundAmount: 263 }, name, 0)
    expect(row).toMatchObject({ status: 'Returned to pharmacy', tone: 'critical', live: false, when: 'Returned · ₹263 refund on its way' })
    expect(pharmacyRow({ ...base, status: 'returned', cancelled: true, refundAmount: 0 }, name, 0)).toMatchObject({ when: base.placed })
  })

  it('out for delivery shows the delivery code on the row', () => {
    expect(pharmacyRow({ ...base, status: 'out_for_delivery', deliveryOtp: '4821' }, name, 0).when).toBe('On the way · delivery code 4821')
    expect(pharmacyRow({ ...base, status: 'out_for_delivery', deliveryOtp: null }, name, 0).when).toBe(base.etaWhen)
  })

  it('a cancelled order is unchanged', () => {
    expect(pharmacyRow({ ...base, status: 'cancelled', cancelled: true, statusLabel: 'Cancelled' }, name, 0)).toMatchObject({ status: 'Cancelled', tone: 'neutral', live: false })
  })

  it('finds the latest failed attempt and the return reason', () => {
    const a = (attempt: number, outcome: string, reason: string | null = null) => ({ attempt, outcome, reason, outAt: null, endedAt: null })
    expect(lastFailedAttempt([a(1, 'failed', 'nobody was home'), a(2, 'failed', 'refused'), a(3, 'out')])?.reason).toBe('refused')
    expect(lastFailedAttempt([a(1, 'delivered')])).toBeNull()
    expect(lastFailedAttempt(undefined)).toBeNull()
    expect(returnReason('Returned to store: nobody was home (gate locked)')).toBe('nobody was home (gate locked)')
    expect(returnReason(undefined)).toBeNull()
  })
})

describe('live order mapping (toPharmacyOrder)', () => {
  const { toPharmacyOrder } = require('../../src/services/live/pharmacy') as typeof import('../../src/services/live/pharmacy')
  const api = {
    code: 'KDC-PH-1', status: 'placed', stage: 'Order confirmed', bill: { subtotal: 245, memberSaving: 0, deliveryFee: 0, total: 245 },
    paymentMethod: 'cod' as const, paymentStatus: 'pending', paidVia: null, paymentRequired: false, deliverySlot: '26 Nov, 9 AM–12 PM',
    address: { line: '1 Road', area: 'Banjara Hills' }, rxRequired: false, rxVerified: false, rider: null, placedAt: '2026-11-25T08:00:00.000Z',
    deliveredAt: null, cancellation: null, lines: [{ medicineCode: 'MED-1', name: 'Dolo 650', qty: 1, unitPrice: 245 }], itemCount: 1, pharmacy: { name: 'Apollo' },
  }

  it('keeps older orders as they were', () => {
    const o = toPharmacyOrder(api)
    expect(o).toMatchObject({ status: 'placed', fixedStage: 0, deliveryOtp: null, deliveryCodeLocked: false, cancelled: false })
    expect(o.deliveryAttempts).toBeUndefined()
  })

  it('maps the delivery code, rider and attempts while out for delivery', () => {
    const o = toPharmacyOrder({ ...api, status: 'out_for_delivery', stage: 'Out for delivery', rider: { name: 'Ravi', mobile: '9000022001' }, deliveryOtp: '4821', deliveryCodeLocked: false, deliveryAttempts: [{ attempt: 1, outAt: '2026-11-25T10:00:00.000Z', outcome: 'out', reason: null, endedAt: null }] })
    expect(o).toMatchObject({ fixedStage: 3, deliveryOtp: '4821', rider: { name: 'Ravi', mobile: '9000022001' }, deliveryAttempts: [{ attempt: 1, outcome: 'out' }] })
  })

  it('a failed delivery stays on the delivery step and never carries a code', () => {
    const o = toPharmacyOrder({ ...api, status: 'delivery_failed', stage: 'Delivery attempt failed', deliveryOtp: '9999' })
    expect(o).toMatchObject({ fixedStage: 3, statusLabel: 'Delivery attempt failed', deliveryOtp: null, cancelled: false, etaWhen: 'Delivery missed · we’ll try again' })
  })

  it('a returned order is closed with its reason and refund', () => {
    const o = toPharmacyOrder({ ...api, status: 'returned', stage: 'Returned to pharmacy', paymentMethod: 'online', cancellation: { reason: 'Returned to store: nobody was home', at: '2026-11-25T12:00:00.000Z', refundAmount: '245.00' } })
    expect(o).toMatchObject({ cancelled: true, statusLabel: 'Returned to pharmacy', cancelReason: 'Returned to store: nobody was home', refundAmount: 245, etaWhen: 'Returned to pharmacy' })
  })
})
