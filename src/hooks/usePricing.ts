import { useMemo } from 'react'
import type { BenefitArea } from '../types'
import { buildBill, memberPrice, memberSaving, rateFor } from '../domain/pricing'
import { useMembership } from '../store/membership'

/** Member-rate arithmetic bound to the live membership, so prices re-render with it. */
export function usePricing() {
  const status = useMembership((s) => s.status)
  const planId = useMembership((s) => s.planId)
  const rates = useMembership((s) => s.rates)
  return useMemo(() => {
    const membership = { status, planId, rates }
    const rate = (area: BenefitArea) => rateFor(membership, area)
    return {
      active: status === 'active',
      rateFor: rate,
      memberPrice: (amount: number, area: BenefitArea) => memberPrice(amount, rate(area)),
      memberSaving: (amount: number, area: BenefitArea) => memberSaving(amount, rate(area)),
      bill: (base: number, area: BenefitArea, platformFee = 0) => buildBill(base, rate(area), platformFee),
    }
  }, [status, planId, rates])
}
