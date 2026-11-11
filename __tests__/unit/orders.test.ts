import { currentStage, diagnosticRow, orderTestTitle, pharmacyRow, STAGE_INTERVAL_MS, stageState } from '../../src/domain/orderTracking'
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
