import { buildBill, labTestPrice, memberPrice, memberSaving, PLATFORM_FEE, planTotals, rateFor, wouldSave } from '../../src/domain/pricing'
import { planById } from '../../src/mock-data/membership'
import type { MembershipRecord } from '../../src/types'

const membership = (status: MembershipRecord['status'], planId: string) => ({ status, planId })

describe('rateFor', () => {
  test.each([
    ['annual', 25],
    ['half', 15],
    ['quarter', 10],
  ])('active %s plan gives its own %i%% rate in every area', (planId, pct) => {
    for (const area of ['consultations', 'pharmacy', 'diagnostics'] as const) {
      expect(rateFor(membership('active', planId), area)).toBe(pct)
    }
  })

  it('gives nothing without an active membership', () => {
    expect(rateFor(membership('expired', 'annual'), 'pharmacy')).toBe(0)
    expect(rateFor(membership('none', 'annual'), 'consultations')).toBe(0)
  })
})

describe('member price', () => {
  it('rounds to the rupee and applies the percentage', () => {
    expect(memberPrice(800, 25)).toBe(600)
    expect(memberPrice(800, 15)).toBe(680)
    expect(memberPrice(800, 10)).toBe(720)
    expect(memberPrice(327, 25)).toBe(245)
  })

  it('rounds the saving, not the price, as the server bills it', () => {
    expect(memberSaving(450, 25)).toBe(113)
    expect(memberPrice(450, 25)).toBe(337)
    expect(buildBill(450, 25, PLATFORM_FEE)).toEqual({ base: 450, platformFee: 49, discount: 113, total: 386 })
    expect(memberSaving(350, 15)).toBe(53)
  })

  it('leaves the amount alone at zero', () => {
    expect(memberPrice(499, 0)).toBe(499)
    expect(memberSaving(499, 0)).toBe(0)
  })

  it('reports the saving as listed minus member price', () => {
    expect(memberSaving(800, 25)).toBe(200)
  })

  it('quotes the headline rate to a non-member', () => {
    expect(wouldSave(800, 'consultations')).toBe(200)
  })
})

describe('buildBill', () => {
  it('discounts the fee but never the platform fee', () => {
    expect(buildBill(800, 25, PLATFORM_FEE)).toEqual({ base: 800, platformFee: 49, discount: 200, total: 649 })
  })

  it('charges the full amount at no rate', () => {
    expect(buildBill(1000, 0, 49).total).toBe(1049)
  })
})

describe('plans', () => {
  it('adds 18% GST to the annual plan', () => {
    expect(planTotals(planById('annual'))).toEqual({ price: 2500, gst: 450, total: 2950 })
  })

  it('prices a test in proportion to the lab rate', () => {
    expect(labTestPrice(549, 549)).toBe(549)
    expect(labTestPrice(549, 480)).toBe(480)
    expect(labTestPrice(699, 480)).toBe(611)
  })
})
