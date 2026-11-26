import { Btn, Div, P, Span } from '../primitives/index'
import React from 'react'
import { Sparkles } from '../primitives/icons'
import { rupee } from '../../mock-data/mock'
import { planConfig } from '../../mock-data/membership'
import { wouldSave } from '../../domain/pricing'
import type { BenefitArea } from '../../types'
import { usePricing } from '../../hooks/usePricing'

/**
 * One presentation of the member rate, used on every price surface so a
 * discounted amount always reads the same way: the price you pay, the price you
 * would have paid struck through, and the mark that explains why.
 */

/** The membership mark. Gold is reserved for this, so it never reads as status. */
export function PlusTag({ size = 'sm' }: { size?: 'sm' | 'xs' }) {
  const xs = size === 'xs'
  return (
    <Span
      className={`inline-flex flex-row shrink-0 items-center gap-1 rounded-[6px] bg-gold-50 font-bold uppercase tracking-[.08em] text-gold-700 ring-1 ring-inset  ring-gold-200 ${
        xs ? 'px-1.5 py-[2px] text-[8.5px]' : 'px-2 py-[3px] text-[9.5px]'
      }`}
    >
      <Sparkles className={xs ? 'h-[9px] w-[9px]' : 'h-[10px] w-[10px]'} strokeWidth={2.6} />
      Plus
    </Span>
  )
}

/**
 * A price that the membership has reduced. When the membership is inactive
 * this renders the plain amount, so the same call site serves both states.
 */
export function MemberPrice({
  amount,
  area,
  size = 'md',
  showTag = true,
  className = '',
}: {
  amount: number
  area: BenefitArea
  size?: 'lg' | 'md' | 'sm'
  showTag?: boolean
  className?: string
}) {
  const { memberPrice } = usePricing()
  const now = memberPrice(amount, area)
  const discounted = now !== amount
  const type = { lg: 'text-title-md', md: 'text-title-sm', sm: 'text-body-lg font-bold' }[size]

  return (
    <Span className={`inline-flex flex-row items-baseline gap-1.5 ${className}`}>
      <Span className={`tabular-nums text-ink-900 ${type}`}>{rupee(now)}</Span>
      {discounted && (
        <>
          <Span className="text-caption tabular-nums text-ink-300 line-through">{rupee(amount)}</Span>
          {showTag && <PlusTag size="xs" />}
        </>
      )}
    </Span>
  )
}

/**
 * The bill line that explains the reduction. Green because a saving is a good
 * outcome, which is the one thing green means in this product.
 */
export function MemberDiscountLine({ amount, area }: { amount: number; area: BenefitArea }) {
  const { memberSaving, rateFor } = usePricing()
  const saved = memberSaving(amount, area)
  if (!saved) return null
  return (
    <Div className="flex-row items-start justify-between gap-6 py-[7px]">
      <Span className="flex-row items-center gap-2 text-body text-ink-500">
        KDC+ Plus
        <Span className="rounded-[5px] bg-gold-50 px-1.5 py-[1px] text-[10px] font-bold text-gold-700">
          {rateFor(area)}% off
        </Span>
      </Span>
      <Span className="text-right text-body font-semibold tabular-nums text-vital-700">− {rupee(saved)}</Span>
    </Div>
  )
}

/** Closing confirmation on a bill — what this membership just saved. */
export function SavedStrip({ amount, area }: { amount: number; area: BenefitArea }) {
  const { memberSaving } = usePricing()
  const saved = memberSaving(amount, area)
  if (!saved) return null
  return (
    <Div className="flex-row items-center gap-2.5 rounded-tile bg-vital-50 px-3.5 py-3">
      <Sparkles className="h-[15px] w-[15px] shrink-0 text-vital-600" strokeWidth={2.4} />
      <P className="text-body-sm font-semibold text-vital-700">
        Your subscription saved {rupee(saved)} on this order
      </P>
    </Div>
  )
}

/**
 * The offer, shown where a non-member is about to pay full price. Deliberately
 * quiet: it states the number and gets out of the way.
 */
export function PlusUpsell({
  amount,
  area,
  onJoin,
}: {
  amount: number
  area: BenefitArea
  onJoin?: () => void
}) {
  const save = wouldSave(amount, area)
  return (
    <Btn
      onPress={onJoin}
      className="tap flex-row w-full items-center gap-3 rounded-tile bg-gold-50 p-3.5 text-left ring-1 ring-inset  ring-gold-200"
    >
      <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-gold-500">
        <Sparkles className="h-[16px] w-[16px] text-white" strokeWidth={2.4} />
      </Span>
      <P className="min-w-0 flex-1 text-body-sm leading-[19px] text-gold-700">
        <Span className="font-bold">Save {rupee(save)} on this with KDC+ Plus.</Span> {planConfig.headlineDiscount}% off
        every consultation, medicine and test.
      </P>
    </Btn>
  )
}
