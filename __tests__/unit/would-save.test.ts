/** The non-member offer quotes the plan's headline discount, never the (higher) per-area cap. */
import { wouldSave } from '../../src/domain/pricing'
import { planConfig } from '../../src/mock-data/membership'

describe('what KDC+ Plus would save', () => {
  const before = { discount: { ...planConfig.discount }, headline: planConfig.headlineDiscount }
  afterEach(() => {
    planConfig.discount = { ...before.discount }
    planConfig.headlineDiscount = before.headline
  })

  it('uses the best plan’s rate when the caps are higher (the live server: caps 60%, best plan 25%)', () => {
    planConfig.discount = { consultations: 60, pharmacy: 60, diagnostics: 60 }
    planConfig.headlineDiscount = 25
    expect(wouldSave(250, 'consultations')).toBe(62) // ₹250 → ₹188 at 25% (whole rupees)
    expect(wouldSave(31, 'pharmacy')).toBeLessThan(10)
  })

  it('never quotes more than an area’s cap', () => {
    planConfig.discount = { consultations: 25, pharmacy: 10, diagnostics: 25 }
    planConfig.headlineDiscount = 25
    expect(wouldSave(100, 'pharmacy')).toBe(10)
  })
})

describe('medicine delivery windows offered at checkout', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const { openDeliverySlots } = require('../../src/screens/pharmacy') as typeof import('../../src/screens/pharmacy')
  const at = (h: number, m = 0) => new Date(2026, 10, 23, h, m)

  it('drops today’s windows that close within the hour, and always keeps tomorrow morning', () => {
    expect(openDeliverySlots(at(10))).toEqual(['Today, 2–5 PM', 'Today, 5–8 PM', 'Tomorrow, 9–12 PM'])
    expect(openDeliverySlots(at(16, 50))).toEqual(['Today, 5–8 PM', 'Tomorrow, 9–12 PM'])
    expect(openDeliverySlots(at(19, 30))).toEqual(['Tomorrow, 9–12 PM'])
  })
})

describe('tracking a medicine order’s delivery window', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const { deliveryWindow } = require('../../src/services/live/pharmacy') as typeof import('../../src/services/live/pharmacy')
  const now = new Date(2026, 10, 23, 16, 50)
  it('says Today or Tomorrow while true, the date otherwise, and keeps old orders as stored', () => {
    expect(deliveryWindow('23 Nov, 5–8 PM', now)).toBe('Today · 5–8 PM')
    expect(deliveryWindow('24 Nov, 9 AM–12 PM', now)).toBe('Tomorrow · 9 AM–12 PM')
    expect(deliveryWindow('20 Nov, 5–8 PM', now)).toBe('20 Nov · 5–8 PM')
    expect(deliveryWindow('Today, 5–8 PM', now)).toBe('Today · 5–8 PM')
  })
})

describe('the home greeting', () => {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const { greeting } = require('../../src/screens/home') as typeof import('../../src/screens/home')
  it('follows the time of day', () => {
    expect(greeting(new Date(2026, 10, 23, 9))).toBe('Good morning')
    expect(greeting(new Date(2026, 10, 23, 14))).toBe('Good afternoon')
    expect(greeting(new Date(2026, 10, 23, 17))).toBe('Good evening')
    expect(greeting(new Date(2026, 10, 23, 2))).toBe('Good evening')
  })
})
