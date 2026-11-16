import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Sparkles,
  Check,
  ChevronRight,
  Stethoscope,
  Pill,
  FlaskConical,
  ShieldCheck,
  CalendarClock,
  TrendingUp,
  Info,
  RefreshCw,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, StickyBar, IconButton } from '../components/ui/Button'
import { Card, SectionHeader, KeyValue, Divider, StatusBadge } from '../components/ui/Display'
import { Modal } from '../components/ui/Feedback'
import { PlusTag } from '../components/ui/Membership'
import { rupee } from '../mock-data/mock'
import { perMonth, planById, benefits, planConfig } from '../mock-data/membership'
import { useNav } from '../navigation/navigation'
import { savedByArea, totalSaved, useMembership } from '../store/membership'
import { PAY_ONLINE, usePayments } from '../store/payments'
import { LIVE } from '../services/config'
import { errorMessage } from '../services/errors'
import { endMembership } from '../services/live/membership'
import { useCheckout } from '../flows/payment'
import { planTotals } from '../domain/pricing'
import { renewalLabel } from '../services/account'
import { showToast } from '../store/toast'

const AREA_ICON = {
  consultations: Stethoscope,
  pharmacy: Pill,
  diagnostics: FlaskConical,
} as const

/* ============================================ 55 — KDC+ Plus (offer) ====== */

/**
 * The offer, for a patient who has no membership. One promise — a flat
 * percentage off everything KDC+ charges for — and the arithmetic to prove it.
 */
export function MembershipScreen() {
  const nav = useNav()
  const picked = useMembership((s) => s.pickedPlanId)
  const setPicked = useMembership((s) => s.pickPlan)
  // The plans on sale: bundled in demo, the server's in live (re-renders when they load).
  const plans = useMembership((s) => s.plans)
  const plan = planById(picked)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      {/* The only ink-and-gold surface in the patient app: a paid tier should
          not have to borrow the brand blue to feel like a different thing. */}
      <Div
        className="relative shrink-0 overflow-hidden bg-ink-900 px-5 pb-6"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}
      >
        <Div className="pointer-events-none absolute -right-16 -top-10 h-[190px] w-[190px] rounded-full bg-gold-500/15 blur-2xl" />

        <Div className="relative flex-row items-center justify-between pt-2">
          <Btn
            onPress={nav.back}
            className="tap -ml-2 flex-col h-[38px] w-[38px] items-center justify-center rounded-full"
          >
            <ChevronRight className="h-[21px] w-[21px] rotate-180 text-white" strokeWidth={2.4} />
          </Btn>
          <Btn
            onPress={() => nav.navigate('membership-savings')}
            className="tap text-body-sm font-semibold text-white/70"
          >
            How it works
          </Btn>
        </Div>

        <Div className="relative mt-4 flex-row items-center gap-2.5">
          <Span className="flex-col h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-gold-500">
            <Sparkles className="h-[17px] w-[17px] text-white" strokeWidth={2.4} />
          </Span>
          <Span className="font-display text-[19px] font-extrabold tracking-[-0.3px] text-white">KDC+ Plus</Span>
        </Div>

        <P className="relative mt-4 font-display text-[29px] font-extrabold leading-[34px] tracking-[-0.7px] text-white">
          {planConfig.headlineDiscount}% off every consultation, medicine and test.
        </P>
        <P className="relative mt-2.5 text-body-lg leading-[23px] text-white/65">
          One membership. The lower price is applied automatically at checkout — there is no code to remember and
          nothing to claim.
        </P>

        <Div className="relative mt-5 flex-row gap-2">
          {benefits.map((b) => {
            const Icon = AREA_ICON[b.area]
            return (
              <Div key={b.area} className="flex-1 rounded-tile bg-white/10 p-3 ring-1 ring-inset  ring-white/15">
                <Icon className="h-[17px] w-[17px] text-gold-300" strokeWidth={2.1} />
                <P className="mt-2 text-[22px] font-extrabold leading-none tabular-nums text-white">
                  {plan.discount}%
                </P>
                <P className="mt-1.5 text-caption leading-[15px] text-white/55">{b.label}</P>
              </Div>
            )
          })}
        </Div>
      </Div>

      <Div className="flex-1 gap-5 px-5 pb-[150px] pt-5">
        <Div>
          <SectionHeader title="Choose a plan" className="!px-0 pb-2.5" />
          <Div className="gap-2.5">
            {plans.map((p) => {
              const on = p.id === picked
              return (
                <Btn
                  key={p.id}
                  onPress={() => setPicked(p.id)}
                  className={`tap flex-row w-full items-center gap-3.5 rounded-card p-4 text-left  ${
                    on ? 'bg-white ring-[1.5px] ring-inset  ring-gold-500 shadow-card' : 'bg-white shadow-tile'
                  }`}
                >
                  <Span
                    className={`flex-col h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full ${
                      on ? 'bg-gold-500' : 'ring-[1.5px] ring-inset  ring-ink-200'
                    }`}
                  >
                    {on && <Check className="h-[12px] w-[12px] text-white" strokeWidth={3.2} />}
                  </Span>

                  <Div className="min-w-0 flex-1">
                    <Div className="flex-row items-center gap-2">
                      <P className="text-body-lg font-bold text-ink-900">{p.name}</P>
                      {p.tag && (
                        <Span className="rounded-[6px] bg-gold-50 px-1.5 py-[2px] text-[9.5px] font-bold uppercase tracking-[.08em] text-gold-700">
                          {p.tag}
                        </Span>
                      )}
                    </Div>
                    <P className="mt-0.5 text-caption text-ink-400">
                      {p.discount}% off · {rupee(perMonth(p))}/month
                    </P>
                  </Div>

                  <Span className="shrink-0 font-display text-[19px] font-extrabold tabular-nums text-ink-900">
                    {rupee(p.price)}
                  </Span>
                </Btn>
              )
            })}
          </Div>
        </Div>

        <Div>
          <SectionHeader title="What you get" className="!px-0 pb-2.5" />
          <Card elevation="tile" className="divide-y divide-ink-100">
            {benefits.map((b) => {
              const Icon = AREA_ICON[b.area]
              return (
                <Div key={b.area} className="flex-row items-start gap-3.5 p-4">
                  <Span className="flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] bg-gold-50">
                    <Icon className="h-[17px] w-[17px] text-gold-600" strokeWidth={2.1} />
                  </Span>
                  <Div className="min-w-0 flex-1">
                    <P className="text-body-lg font-semibold text-ink-900">
                      {plan.discount}% off {b.label.toLowerCase()}
                    </P>
                    <P className="mt-0.5 text-caption leading-[17px] text-ink-400">{b.detail}</P>
                  </Div>
                </Div>
              )
            })}
          </Card>
        </Div>

        <Div className="flex-row items-start gap-2.5 rounded-tile bg-white p-3.5 shadow-tile">
          <Info className="mt-[1px] h-[16px] w-[16px] shrink-0 text-ink-400" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-ink-500">
            The membership covers what KDC+ charges. It does not change doctor-set clinic fees for a visit arranged
            outside the app, and it cannot be combined with a promotional code on the same bill.
          </P>
        </Div>
      </Div>

      <StickyBar>
        <Div className="mb-2.5 flex-row items-baseline justify-between">
          <Span className="text-body text-ink-500">{plan.name} membership</Span>
          <Span className="font-display text-[20px] font-extrabold tabular-nums text-ink-900">{rupee(plan.price)}</Span>
        </Div>
        <Button onClick={() => nav.navigate('membership-checkout')}>Continue</Button>
      </StickyBar>
    </Screen>
  )
}

/* ========================================== 56 — Membership checkout ====== */

export function MembershipCheckoutScreen() {
  const nav = useNav()
  const membership = useMembership()
  const savedMethods = usePayments((s) => s.methods)
  // Live: one way to pay, Razorpay Checkout (UPI, cards, net banking, wallets).
  const methods = LIVE ? [PAY_ONLINE] : savedMethods
  const selectedMethod = usePayments((s) => (LIVE ? PAY_ONLINE.id : s.selectedMethodId))
  const selectMethod = usePayments((s) => s.select)
  const plan = planById(membership.pickedPlanId)
  const { gst, total } = planTotals(plan)
  const renews =
    membership.status === 'active' && membership.planId === plan.id ? membership.renews : renewalLabel(plan, new Date())
  const pay = () => {
    if (LIVE) usePayments.getState().select(PAY_ONLINE.id)
    useCheckout.getState().start({
      kind: 'membership',
      amount: total,
      title: `KDC+ Plus · ${plan.name}`,
      subtitle: `${plan.discount}% off every bill`,
      planId: plan.id,
      planName: plan.name,
    })
    nav.navigate('st-payment-processing')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Confirm membership" subtitle={`Paying ${rupee(total)}`} />

      <Div className="flex-1 gap-5 px-5 pb-[140px] pt-4">
        <Div className="overflow-hidden rounded-card bg-ink-900 p-4 shadow-card">
          <Div className="flex-row items-center gap-2.5">
            <Span className="flex-col h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-gold-500">
              <Sparkles className="h-[15px] w-[15px] text-white" strokeWidth={2.4} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-body-lg font-bold text-white">KDC+ Plus · {plan.name}</P>
              <P className="text-caption text-white/55">{plan.discount}% off across all three services</P>
            </Div>
          </Div>
          <Div className="mt-3.5 flex-row items-center gap-1.5">
            {benefits.map((b) => (
              <Span
                key={b.area}
                className="flex-1 rounded-chip bg-white/10 py-1.5 text-center text-caption font-semibold text-white/75"
              >
                {b.label}
              </Span>
            ))}
          </Div>
        </Div>

        <Card elevation="tile" className="p-4">
          <KeyValue label={`Plus membership · ${plan.name}`} value={rupee(plan.price)} />
          <KeyValue label="GST (18%)" value={rupee(gst)} />
          <Divider className="my-2.5" />
          <Div className="flex-row items-center justify-between">
            <Span className="text-title-sm text-ink-900">Total payable</Span>
            <Span className="font-display text-[22px] font-extrabold tabular-nums text-ink-900">{rupee(total)}</Span>
          </Div>
          <P className="mt-2 text-caption text-ink-400">
            Renews on {renews}. Cancel any time before renewal from your profile.
          </P>
        </Card>

        <Div>
          <SectionHeader title="Pay using" className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {methods.filter((p) => p.kind === 'upi' || p.kind === 'card' || p.kind === 'online').slice(0, 2).map((p) => {
              const on = p.id === selectedMethod
              return (
              <Div
                key={p.id}
                onPress={() => selectMethod(p.id)}
                className={`flex-row items-center gap-3.5 rounded-tile bg-white p-3.5 ${
                  on ? 'ring-[1.5px] ring-inset  ring-brand-600' : 'ring-1 ring-inset  ring-ink-100'
                }`}
              >
                <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50 text-[11px] font-bold text-ink-600">
                  {p.kind === 'upi' ? 'UPI' : p.kind === 'online' ? 'PAY' : 'CARD'}
                </Span>
                <Div className="min-w-0 flex-1">
                  <P className="truncate text-body-lg font-semibold text-ink-900">{p.label}</P>
                  <P className="truncate text-caption text-ink-400">{p.sub}</P>
                </Div>
                <Span
                  className={`flex-col h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full ${
                    on ? 'bg-brand-600' : 'ring-[1.5px] ring-inset  ring-ink-200'
                  }`}
                >
                  {on && <Check className="h-[11px] w-[11px] text-white" strokeWidth={3.2} />}
                </Span>
              </Div>
              )
            })}
          </Div>
        </Div>

        <Div className="flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
          <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-brand-700">
            The discount is live the moment this payment clears — including on anything already in your cart.
          </P>
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={pay}>Pay {rupee(total)}</Button>
      </StickyBar>
    </Screen>
  )
}

/* =========================================== 57 — Membership active ======= */

export function MembershipSuccessScreen() {
  const nav = useNav()
  const membership = useMembership()
  const plan = planById(membership.planId)

  return (
    <Screen background="bg-ink-900" padBottom={false}>
      <Div className="relative  flex-1 flex-col items-center px-6 pb-[150px] pt-10 text-center">
        <Div className="pointer-events-none absolute -top-6 left-1/2 h-[240px] w-[240px] -translate-x-1/2 rounded-full bg-gold-500/18 blur-3xl" />

        <Span className="relative flex-col h-[76px] w-[76px] items-center justify-center rounded-[26px] bg-gold-500 shadow-lift">
          <Sparkles className="h-[34px] w-[34px] text-white" strokeWidth={2.2} />
        </Span>

        <P className="relative mt-6 font-display text-[27px] font-extrabold leading-[32px] tracking-[-0.6px] text-white">
          Your membership is active
        </P>
        <P className="relative mt-2.5 text-body-lg leading-[23px] text-white/65">
          Every consultation, medicine order and test is now billed at the member rate. Nothing else to do.
        </P>

        <Div className="relative mt-7 w-full rounded-card bg-white/10 p-4 ring-1 ring-inset  ring-white/15">
          <Div className="flex-row items-center justify-between">
            <Span className="text-body text-white/60">Plan</Span>
            <Span className="text-body font-semibold text-white">Plus · {plan.name}</Span>
          </Div>
          <Div className="mt-2.5 flex-row items-center justify-between">
            <Span className="text-body text-white/60">Discount</Span>
            <Span className="text-body font-semibold text-gold-300">{plan.discount}% on everything</Span>
          </Div>
          <Div className="mt-2.5 flex-row items-center justify-between">
            <Span className="text-body text-white/60">Renews</Span>
            <Span className="text-body font-semibold text-white">{membership.renews}</Span>
          </Div>
        </Div>

        <Div className="relative mt-3 flex-row w-full gap-1.5">
          {benefits.map((b) => {
            const Icon = AREA_ICON[b.area]
            return (
              <Div key={b.area} className="flex-1 rounded-tile bg-white/[0.07] py-3">
                <Icon className="mx-auto h-[16px] w-[16px] text-gold-300" strokeWidth={2.1} />
                <P className="mt-1.5 text-caption text-white/55">{b.label}</P>
              </Div>
            )
          })}
        </Div>
      </Div>

      <StickyBar blur={false} className="!bg-ink-900 !border-white/10">
        <Button onClick={() => nav.resetTo('home', 'home')}>Start saving</Button>
        <Btn
          onPress={() => nav.navigate('membership-manage')}
          className="tap mt-2 w-full py-2 text-body font-semibold text-white/60"
        >
          View membership
        </Btn>
      </StickyBar>
    </Screen>
  )
}

/* ========================================== 58 — Manage membership ======== */

/** The member's own view: what it is saving, and when it renews. */
export function MembershipManageScreen() {
  const nav = useNav()
  const membership = useMembership()
  const plan = planById(membership.planId)
  const pct = Math.min(100, Math.round((membership.daysLeft / (plan.months * 30)) * 100))
  const saved = totalSaved(membership.ledger)
  const byArea = savedByArea(membership.ledger)
  const [confirmingStop, setConfirmingStop] = React.useState(false)
  const turnOffAutoRenew = () => {
    membership.setAutoRenew(false)
    setConfirmingStop(false)
    showToast('Auto-renew turned off', 'success', `Your member rate continues until ${membership.renews}`)
  }
  const endNow = async () => {
    if (LIVE) {
      try {
        await endMembership()
      } catch (e) {
        setConfirmingStop(false)
        showToast(errorMessage(e, 'We could not end your membership. Please try again.'), 'critical')
        return
      }
    } else membership.expire()
    nav.navigate('st-membership-expired', { replace: true })
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="relative shrink-0 overflow-hidden bg-ink-900 px-5 pb-5"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}
      >
        <Div className="pointer-events-none absolute -right-14 -top-8 h-[170px] w-[170px] rounded-full bg-gold-500/15 blur-2xl" />

        <Div className="relative flex-row items-center justify-between pt-2">
          <Btn
            onPress={nav.back}
            className="tap -ml-2 flex-col h-[38px] w-[38px] items-center justify-center rounded-full"
          >
            <ChevronRight className="h-[21px] w-[21px] rotate-180 text-white" strokeWidth={2.4} />
          </Btn>
          <StatusBadge tone="success" dot>
            Active
          </StatusBadge>
        </Div>

        <Div className="relative mt-3 flex-row items-center gap-2.5">
          <Span className="flex-col h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-gold-500">
            <Sparkles className="h-[15px] w-[15px] text-white" strokeWidth={2.4} />
          </Span>
          <Span className="font-display text-[17px] font-extrabold text-white">KDC+ Plus · {plan.name}</Span>
        </Div>

        <P className="relative mt-5 text-caption uppercase tracking-[.09em] text-white/45">Saved since {membership.since}</P>
        <P className="relative mt-1 font-display text-[38px] font-extrabold leading-none tabular-nums text-white">
          {rupee(saved)}
        </P>
        <P className="relative mt-2 text-body-sm text-white/55">
          Across {membership.ledger.length} bills —{' '}
          {saved >= plan.price
            ? `already ${rupee(saved - plan.price)} more than the membership cost.`
            : `${rupee(plan.price - saved)} away from paying for itself.`}
        </P>

        <Div className="relative mt-5">
          <Div className="flex-row items-center justify-between text-caption text-white/55">
            <Span>{membership.daysLeft} days left</Span>
            <Span>Renews {membership.renews}</Span>
          </Div>
          <Div className="mt-2 h-[5px] overflow-hidden rounded-full bg-white/15">
            <Div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
          </Div>
        </Div>
      </Div>

      <Div className="flex-1 gap-5 px-5 pb-[40px] pt-5">
        <Div>
          <SectionHeader title="Where it saved you money" action="All" onAction={() => nav.navigate('membership-savings')} className="!px-0 pb-2.5" />
          <Card elevation="tile" className="divide-y divide-ink-100">
            {benefits.map((b) => {
              const Icon = AREA_ICON[b.area]
              return (
                <Div key={b.area} className="flex-row items-center gap-3.5 p-4">
                  <Span className="flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] bg-gold-50">
                    <Icon className="h-[17px] w-[17px] text-gold-600" strokeWidth={2.1} />
                  </Span>
                  <Div className="min-w-0 flex-1">
                    <P className="text-body-lg font-semibold text-ink-900">{b.label}</P>
                    <P className="mt-0.5 text-caption text-ink-400">{plan.discount}% off every bill</P>
                  </Div>
                  <Span className="shrink-0 text-title-sm tabular-nums text-vital-700">
                    {rupee(byArea[b.area])}
                  </Span>
                </Div>
              )
            })}
          </Card>
        </Div>

        <Btn
          onPress={() => nav.navigate('membership-savings')}
          className="tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-4 text-left shadow-tile"
        >
          <Span className="flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] bg-brand-50">
            <TrendingUp className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
          </Span>
          <Div className="min-w-0 flex-1">
            <P className="text-body-lg font-semibold text-ink-900">Savings history</P>
            <P className="mt-0.5 text-caption text-ink-400">Every bill the membership reduced</P>
          </Div>
          <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
        </Btn>

        <Div>
          <SectionHeader title="Membership" className="!px-0 pb-2.5" />
          <Card elevation="tile" className="p-4">
            <KeyValue label="Plan" value={`Plus · ${plan.name}`} />
            <KeyValue label="Started" value={membership.since} />
            <KeyValue label="Renews on" value={membership.renews} />
            <KeyValue label="Auto-renew" value={membership.autoRenew ? 'On' : 'Off'} />
            <Divider className="my-2.5" />
            <KeyValue label="Renewal amount" value={rupee(plan.price)} strong />
          </Card>
        </Div>

        <Div className="flex-row gap-2.5">
          <Btn
            onPress={() => nav.navigate('membership')}
            className="tap flex-row flex-1 items-center justify-center gap-2 rounded-ctl bg-white py-3.5 text-body font-semibold text-brand-600 shadow-tile"
          >
            <RefreshCw className="h-[15px] w-[15px]" strokeWidth={2.3} />
            Change plan
          </Btn>
          <Btn
            onPress={() => (membership.autoRenew ? setConfirmingStop(true) : membership.setAutoRenew(true))}
            className="tap flex-row flex-1 items-center justify-center rounded-ctl bg-white py-3.5 text-body font-semibold text-ink-500 shadow-tile"
          >
            {membership.autoRenew ? 'Turn off auto-renew' : 'Turn on auto-renew'}
          </Btn>
        </Div>
      </Div>

      {confirmingStop && (
        <Modal
          tone="caution"
          icon={<CalendarClock className="h-[26px] w-[26px]" strokeWidth={2} />}
          title="Turn off auto-renew?"
          body={`Your member rate continues until ${membership.renews}, then prices return to normal.`}
          actions={
            <>
              <Button onClick={turnOffAutoRenew}>Turn off auto-renew</Button>
              <Button variant="tertiary" onClick={endNow}>
                End membership now
              </Button>
              <Button variant="text" onClick={() => setConfirmingStop(false)}>
                Keep it on
              </Button>
            </>
          }
        />
      )}
    </Screen>
  )
}

/* ============================================= 59 — Savings history ======= */

export function MembershipSavingsScreen() {
  const nav = useNav()
  const savingsLedger = useMembership((s) => s.ledger)
  const total = totalSaved(savingsLedger)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-canvas"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <Div className="bg-ink-900 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
          <ScreenHeader
            embedded
            tone="dark"
            transparent
            title="Savings history"
            subtitle={`${savingsLedger.length} bills`}
            border={false}
            right={
              <IconButton size={36} tone="glass" label="Membership" onClick={() => nav.navigate('membership-manage')}>
                <Sparkles className="h-[15px] w-[15px]" strokeWidth={2.3} />
              </IconButton>
            }
          />
          <Div className="px-5">
            <P className="text-caption uppercase tracking-[.09em] text-white/45">Total saved</P>
            <P className="mt-1 font-display text-[30px] font-extrabold leading-none tabular-nums text-white">
              {rupee(total)}
            </P>
          </Div>
        </Div>
      </Div>

      <Div className="flex-1 px-5 pb-[40px] pt-4">
        <Div className="mb-4 flex-row items-start gap-2.5 rounded-tile bg-gold-50 p-3.5 ring-1 ring-inset  ring-gold-200">
          <Sparkles className="mt-[1px] h-[16px] w-[16px] shrink-0 text-gold-600" strokeWidth={2.3} />
          <P className="text-body-sm leading-[19px] text-gold-700">
            Applied automatically at checkout. Every line below was already discounted when you paid.
          </P>
        </Div>

        <Div className="gap-2.5">
          {savingsLedger.map((r) => {
            const Icon = AREA_ICON[r.area]
            return (
              <Div key={r.id} className="flex-row items-start gap-3.5 rounded-tile bg-white p-3.5 shadow-tile">
                <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
                  <Icon className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.1} />
                </Span>
                <Div className="min-w-0 flex-1">
                  <P className="text-body-lg font-semibold leading-[20px] text-ink-900">{r.label}</P>
                  <P className="mt-0.5 text-caption text-ink-400">
                    {r.date} · billed {rupee(r.listed - r.saved)} instead of {rupee(r.listed)}
                  </P>
                </Div>
                <Div className="shrink-0 text-right">
                  <P className="text-body-lg font-bold tabular-nums text-vital-700">− {rupee(r.saved)}</P>
                  <PlusTag size="xs" />
                </Div>
              </Div>
            )
          })}
        </Div>
      </Div>
    </Screen>
  )
}

/* ====================================== S19 — Membership expired ========== */

export function MembershipExpiredScreen() {
  const nav = useNav()
  const membership = useMembership()
  const plan = planById(membership.planId)
  const saved = totalSaved(membership.ledger)
  const renew = () => {
    membership.pickPlan(plan.id)
    nav.navigate('membership-checkout')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="KDC+ Plus" />

      <Div className=" flex-1 flex-col items-center px-6 pb-[140px] pt-10 text-center">
        <Span className="flex-col h-[70px] w-[70px] items-center justify-center rounded-[24px] bg-caution-50 ring-1 ring-inset  ring-caution-200">
          <CalendarClock className="h-[30px] w-[30px] text-caution-600" strokeWidth={2.1} />
        </Span>

        <P className="mt-6 font-display text-[23px] font-extrabold leading-[29px] tracking-[-0.5px] text-ink-900">
          Your membership has ended
        </P>
        <P className="mt-2.5 text-body-lg leading-[23px] text-ink-500">
          Consultations, medicines and tests are back at the regular price. Your records and history are untouched.
        </P>

        <Div className="mt-6 w-full rounded-card bg-white p-4 shadow-tile">
          <P className="text-caption uppercase tracking-[.09em] text-ink-400">While it was active</P>
          <P className="mt-1.5 font-display text-[28px] font-extrabold leading-none tabular-nums text-vital-700">
            {rupee(saved)}
          </P>
          <P className="mt-1.5 text-body-sm text-ink-500">saved across {membership.ledger.length} bills</P>
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={renew}>Renew for {rupee(plan.price)}</Button>
        <Btn
          onPress={() => nav.navigate('membership')}
          className="tap mt-2 w-full py-2 text-body font-semibold text-ink-500"
        >
          See other plans
        </Btn>
      </StickyBar>
    </Screen>
  )
}
