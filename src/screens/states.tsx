import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  CalendarX2,
  FileX2,
  ShoppingCart,
  FlaskConical,
  CloudOff,
  WifiOff,
  XCircle,
  Clock,
  UserX,
  VideoOff,
  PhoneOff,
  Hourglass,
  PackageX,
  SearchX,
  RefreshCw,
  ChevronRight,
  Headphones,
  Bell,
  Timer,
  AlertTriangle,
  Check,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, BottomNav } from '../components/ui/Nav'
import { Button, StickyBar } from '../components/ui/Button'
import { Avatar, Card, SectionHeader, StatusBadge, Divider, KeyValue, Segmented } from '../components/ui/Display'
import { StateBlock, LoadingState, EcgLoader, SkeletonDoctorCard, Skeleton, Banner } from '../components/ui/Feedback'
import { SearchInput } from '../components/ui/Inputs'
import { Logo, EcgLine } from '../components/ui/Logo'
import { rupee } from '../mock-data/mock'
import { useNavigation } from '@react-navigation/native'
import { useNav } from '../navigation/navigation'
import { getDoctor, useCatalog } from '../store/catalog'
import { useBooking, useSelectedDoctor } from '../store/booking'
import { useAppointments } from '../store/appointments'
import { useCall } from '../store/call'
import { useCheckout, runPayment, checkLatePayment } from '../flows/payment'
import { CASH_ON_DELIVERY, usePayments } from '../store/payments'
import { LIVE } from '../services/config'
import { finishConsultation } from '../flows/consultation'
import { CancelAppointmentModal } from '../components/forms/AppointmentDialogs'
import { MOCK_TODAY } from '../domain/schedule'
import type { Doctor } from '../types'

const surname = (d: Doctor) => `Dr. ${d.name.split(' ').slice(-1)[0]}`
const heShe = (d: Doctor) => (d.gender === 'Male' ? 'He' : 'She')
const hisHer = (d: Doctor) => (d.gender === 'Male' ? 'His' : 'Her')

/** Shared chrome so every state screen sits in a believable context. */
function StateScreen({
  title,
  children,
  tab,
  footer,
  background = 'bg-canvas',
}: {
  title?: string
  children: React.ReactNode
  tab?: 'home' | 'doctors' | 'appointments' | 'orders' | 'profile'
  footer?: React.ReactNode
  background?: string
}) {
  return (
    <Screen background={background} padBottom={false}>
      {title && <ScreenHeader title={title} />}
      <Div className=" flex-1 flex-col justify-center pb-[120px]">{children}</Div>
      {footer}
      {tab && <BottomNav active={tab} />}
    </Screen>
  )
}

/* ------------------------------------------------------------- S01 Loading */

export function LoadingScreen() {
  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className=" flex-1 flex-col items-center justify-center">
        <LoadingState label="Finding available doctors…" />
      </Div>
      <Div className="absolute inset-x-0 bottom-0  flex-col items-center gap-2" style={{ paddingBottom: DEVICE.safeBottom + 24 }}>
        <Logo variant="wordmark" width={56} className="opacity-35" />
        <P className="text-caption text-ink-300">Securing your connection</P>
      </Div>
    </Screen>
  )
}

/* ------------------------------------------------------------ S02 Skeleton */

export function SkeletonScreen() {
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="bg-white px-5 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
        <Div className="pt-4">
          <Skeleton className="h-[22px] w-[52%]" />
          <Skeleton className="mt-2.5 h-[13px] w-[70%]" />
        </Div>
        <Skeleton className="mt-4 h-[48px] w-full" rounded={14} />
      </Div>

      <Div className="flex-row gap-2 px-5 pt-3">
        {['w-[64px]', 'w-[82px]', 'w-[72px]', 'w-[90px]'].map((w) => (
          <Skeleton key={w} className={`h-[34px] ${w}`} rounded={12} />
        ))}
      </Div>

      <Div className="gap-2.5 px-5 pt-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonDoctorCard key={i} />
        ))}
      </Div>

      <BottomNav active="doctors" />
    </Screen>
  )
}

/* ------------------------------------------------- S03 Empty appointments */

export function EmptyAppointmentsScreen() {
  const nav = useNav()
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
        <P className="px-5 pb-3 pt-4 text-title-lg text-ink-900">Appointments</P>
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'upcoming', label: 'Upcoming', count: 0 },
              { id: 'completed', label: 'Completed', count: 0 },
              { id: 'cancelled', label: 'Cancelled', count: 0 },
            ]}
            value="upcoming"
          />
        </Div>
      </Div>

      <Div className=" flex-1 flex-col justify-center pb-[120px]">
        <StateBlock
          tone="brand"
          icon={<CalendarX2 className="h-[32px] w-[32px]" strokeWidth={1.8} />}
          title="No appointments yet"
          body="When you book a consultation it will appear here, with everything you need to join it."
          primary={<Button onClick={() => nav.navigate('doctor-search', { tab: 'doctors' })}>Find a doctor</Button>}
          secondary={
            <Button variant="text" onClick={() => nav.navigate('home', { tab: 'home' })}>
              Browse specialties
            </Button>
          }
        />
      </Div>

      <BottomNav active="appointments" />
    </Screen>
  )
}

/* ------------------------------------------------ S04 Empty prescriptions */

export function EmptyPrescriptionsScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Prescriptions">
      <StateBlock
        icon={<FileX2 className="h-[32px] w-[32px]" strokeWidth={1.8} />}
        title="No prescriptions yet"
        body="Prescriptions written during a KDC+ consultation are saved here automatically, and stay available for five years."
        primary={<Button onClick={() => nav.navigate('doctor-search', { tab: 'doctors' })}>Consult a doctor</Button>}
        secondary={
          <Button variant="text" onClick={() => nav.navigate('rx-upload')}>
            Upload an existing prescription
          </Button>
        }
      />
    </StateScreen>
  )
}

/* -------------------------------------------------------- S05 Empty cart */

export function EmptyCartScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Cart" tab="orders">
      <StateBlock
        icon={<ShoppingCart className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="Your cart is empty"
        body="Add medicines from your prescription, or search for what you need."
        primary={<Button onClick={() => nav.navigate('rx-upload')}>Upload prescription</Button>}
        secondary={
          <Button variant="tertiary" onClick={() => nav.navigate('medicine-search')}>
            Browse medicines
          </Button>
        }
      />
    </StateScreen>
  )
}

/* ------------------------------------------------- S06 Empty diagnostics */

export function EmptyDiagnosticsScreen() {
  const nav = useNav()
  return (
    <StateScreen title="My tests" tab="orders">
      <StateBlock
        icon={<FlaskConical className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="No tests booked"
        body="Book a diagnostic test and have the sample collected at home, free of charge."
        primary={<Button onClick={() => nav.navigate('diagnostics')}>Browse tests</Button>}
        secondary={
          <Button variant="text" onClick={() => nav.navigate('test-search')}>
            See full body checkup packages
          </Button>
        }
      />
    </StateScreen>
  )
}

/* ----------------------------------------------------------- S07 API error */

/** The API error block, for use inside a list that failed to load. */
export function ApiErrorBody({ onRetry }: { onRetry: () => void }) {
  return (
    <Div className="pt-6">
      <StateBlock
        compact
        tone="critical"
        icon={<CloudOff className="h-[26px] w-[26px]" strokeWidth={1.8} />}
        title="We couldn’t load this"
        body="Something went wrong on our side, not yours."
        primary={<Button onClick={onRetry} icon={<RefreshCw className="h-[17px] w-[17px]" strokeWidth={2.3} />}>Try again</Button>}
      />
    </Div>
  )
}

/** The no-results block, for use inside a search list. */
export function NoResultsBody({ body }: { body: string }) {
  return (
    <Div className="pt-6">
      <StateBlock icon={<SearchX className="h-[31px] w-[31px]" strokeWidth={1.8} />} title="No matches found" body={body} />
    </Div>
  )
}

export function ApiErrorScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Doctors">
      <StateBlock
        tone="critical"
        icon={<CloudOff className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="We couldn’t load this"
        body="Something went wrong on our side, not yours. Nothing has been charged and no booking was affected."
        primary={<Button onClick={nav.back} icon={<RefreshCw className="h-[17px] w-[17px]" strokeWidth={2.3} />}>Try again</Button>}
        secondary={
          <Button variant="text" onClick={() => nav.navigate('help')}>
            Contact support
          </Button>
        }
      />
      <P className="mt-7 text-center text-caption tabular-nums text-ink-300">Error reference KDC-5031</P>
    </StateScreen>
  )
}

/* -------------------------------------------------------------- S08 Offline */

export function OfflineScreen() {
  const nav = useNav()
  return (
    <StateScreen title="Doctors">
      <StateBlock
        icon={<WifiOff className="h-[31px] w-[31px]" strokeWidth={1.8} />}
        title="You’re offline"
        body="Check your mobile data or Wi-Fi connection. Your prescriptions and reports are still available offline."
        primary={<Button onClick={nav.back} icon={<RefreshCw className="h-[17px] w-[17px]" strokeWidth={2.3} />}>Retry</Button>}
        secondary={
          <Button variant="tertiary" onClick={() => nav.navigate('records')}>
            View saved records
          </Button>
        }
      />
      <Div className="mt-8 px-6">
        <Banner
          tone="brand"
          icon={<Check className="h-[16px] w-[16px]" strokeWidth={2.4} />}
          title="12 prescriptions and 8 reports available offline"
        />
      </Div>
    </StateScreen>
  )
}

/* ------------------------------------------------------ S09 Payment failed */

export function PaymentFailedScreen() {
  const nav = useNav()
  const intent = useCheckout((s) => s.intent)
  const d = useSelectedDoctor()
  const consultation = intent?.kind === 'consultation' ? intent : null
  const showHold = !intent || consultation
  const holdTime = consultation?.time ?? '5:30 PM'
  const holdDoctor = consultation ? getDoctor(consultation.doctorId).name : d.name
  const failure = useCheckout((s) => s.lastFailure)
  const inflight = useCheckout((s) => s.inflight)
  const retry = () => (intent ? nav.navigate('st-payment-processing', { replace: true }) : nav.navigate('payment'))
  const changeMethod = () => (intent ? nav.back() : nav.navigate('payment'))
  // Live: say what actually happened; the slot note only while the server still holds it.
  const liveTitle = failure?.notServiceable ? 'We don’t deliver there yet' : failure?.cancelled ? 'Payment cancelled' : failure?.refunded ? 'Payment refunded' : failure?.pending ? 'Waiting for your bank' : 'Payment didn’t go through'

  // Live: while the server still holds the purchase, keep checking quietly. A UPI or bank
  // confirmation that arrives after the app stopped waiting moves straight on to success,
  // instead of leaving "didn't go through" (and a Retry) on screen for a paid booking.
  React.useEffect(() => {
    if (!LIVE || !inflight || failure?.refunded) return
    let alive = true
    let tries = 0
    const tick = async () => {
      if (!alive) return
      const outcome = await checkLatePayment().catch(() => null)
      if (!alive) return
      if (outcome?.ok) return nav.finishTo(outcome.screen, outcome.params)
      if (++tries < 36) timer = setTimeout(tick, 5000)
    }
    let timer = setTimeout(tick, 3000)
    return () => {
      alive = false
      clearTimeout(timer)
    }
    // Once per visit to this screen, for the purchase it was shown for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title="Payment" />
      <Div className=" flex-1 flex-col justify-center pb-[160px]">
        <StateBlock
          tone={LIVE && (failure?.cancelled || failure?.pending || failure?.refunded) ? 'neutral' : 'critical'}
          icon={<XCircle className="h-[32px] w-[32px]" strokeWidth={1.8} />}
          title={LIVE ? liveTitle : 'Payment didn’t go through'}
          body={
            LIVE
              ? failure?.reason ?? 'The payment didn’t go through. Nothing was charged.'
              : 'Your bank declined the transaction. No money has been deducted — if it shows as debited, it will be reversed within 48 hours.'
          }
        />
        {LIVE && inflight && consultation && !failure?.pending && (
          <Div className="mt-7 px-6">
            <Card elevation="tile" className="!bg-vital-50">
              <Div className="flex-row items-center gap-2.5">
                <Clock className="h-[16px] w-[16px] shrink-0 text-vital-700" strokeWidth={2.2} />
                <P className="text-body-sm font-semibold text-vital-700">
                  Your {holdTime} slot with {holdDoctor} is held for a few minutes while you retry.
                </P>
              </Div>
            </Card>
          </Div>
        )}
        {!LIVE && showHold && (
          <Div className="mt-7 px-6">
            <Card elevation="tile" className="!bg-vital-50">
              <Div className="flex-row items-center gap-2.5">
                <Clock className="h-[16px] w-[16px] shrink-0 text-vital-700" strokeWidth={2.2} />
                <P className="text-body-sm font-semibold text-vital-700">
                  Your {holdTime} slot with {holdDoctor} is held for 9 more minutes.
                </P>
              </Div>
            </Card>
          </Div>
        )}
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          {/* Refunded: the same purchase can't go through (e.g. the slot was taken), so choose again rather than pay again. */}
          {LIVE && failure?.refunded ? (
            <Button onClick={changeMethod}>Choose again</Button>
          ) : (
            <Button onClick={retry}>{LIVE && !inflight ? 'Try again' : 'Retry payment'}</Button>
          )}
          {!(LIVE && failure?.refunded) && (
            <Button variant="tertiary" onClick={changeMethod}>
              {LIVE ? 'Go back' : 'Use a different method'}
            </Button>
          )}
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* -------------------------------------------------- S10 Payment processing */

export function PaymentProcessingScreen() {
  const nav = useNav()
  const navigation = useNavigation()
  const intent = useCheckout((s) => s.intent)
  const preview = useSelectedDoctor()
  const consultation = intent?.kind === 'consultation' ? intent : null
  const doctor = consultation ? getDoctor(consultation.doctorId) : preview
  const inflight = useCheckout((s) => s.inflight)
  const cashChosen = usePayments((s) => s.selectedMethodId === CASH_ON_DELIVERY.id)
  // Cash on delivery places the order without taking a payment: don't say "paying" or "Razorpay".
  const cash = LIVE && (inflight ? !inflight.hold.online : (intent?.kind === 'pharmacy' || intent?.kind === 'diagnostic') && cashChosen)

  React.useEffect(() => {
    navigation.setOptions({ gestureEnabled: false })
    if (!useCheckout.getState().intent) return
    runPayment().then((outcome) => {
      if (outcome.ok) nav.finishTo(outcome.screen, outcome.params)
      else nav.navigate('st-payment-failed', { replace: true })
    })
    // Charges exactly once per visit to this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className=" flex-1 flex-col items-center justify-center px-8">
        <EcgLoader
          label={cash ? 'Placing your order' : 'Confirming your payment'}
          sub={cash ? 'Just a moment. You’ll pay when it arrives.' : 'This usually takes a few seconds. Please don’t close the app or press back.'}
        />

        <Div className="mt-9 w-full rounded-card bg-ink-50 p-4">
          <Div className="flex-row items-center justify-between">
            <Span className="text-body-sm text-ink-500">{cash ? 'Pay on delivery' : 'Paying'}</Span>
            <Span className="text-title-sm text-ink-900">{rupee(inflight?.hold.amount ?? intent?.amount ?? (LIVE ? 0 : 799))}</Span>
          </Div>
          <Divider className="my-3" />
          <Div className="flex-row items-center gap-3">
            <Avatar
              src={!intent || consultation ? doctor.photo : undefined}
              name={!intent || consultation ? doctor.name : intent.title}
              size={34}
              radius={11}
            />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-sm font-semibold text-ink-900">{intent?.title ?? doctor.name}</P>
              <P className="truncate text-caption text-ink-400">{intent?.subtitle ?? (LIVE ? '' : 'Mon, 6 Oct · 5:30 PM')}</P>
            </Div>
          </Div>
        </Div>

        <Div className="mt-6 flex-row items-center gap-2 text-caption text-ink-400">
          <Span className="h-[6px] w-[6px] animate-pulse rounded-full bg-brand-600" />
          {cash ? 'Cash on delivery' : LIVE ? 'Secured by Razorpay' : 'Verifying with your bank'}
        </Div>
      </Div>
    </Screen>
  )
}

/* ------------------------------------------------ S11 Appointment cancelled */

export function CancelledScreen() {
  const nav = useNav()
  const cancelled = useAppointments((s) => s.items.find((a) => a.id === s.lastCancelledId))
  const doctor = getDoctor(cancelled?.doctorId ?? useBooking.getState().doctorId)
  const when = cancelled ? cancelled.date.replace(/^(Today, |\w+, )/, '').replace(/ \d{4}$/, '') : '6 October'
  /* Live: the server's refund (a late cancellation keeps a fee). */
  const refund = cancelled ? (cancelled.refundAmount ?? cancelled.fee + cancelled.platformFee - cancelled.discount) : 799
  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title="Appointment" />
      <Div className=" flex-1 flex-col justify-center pb-[160px]">
        <StateBlock
          tone="neutral"
          icon={<CalendarX2 className="h-[32px] w-[32px]" strokeWidth={1.8} />}
          title="Appointment cancelled"
          body={`Your consultation with ${doctor.name} on ${when} has been cancelled.`}
        />
        <Div className="mt-7 gap-3 px-6">
          <Card elevation="tile">
            <KeyValue label="Booking ID" value={cancelled?.bookingId ?? (LIVE ? '' : 'KDC2410A4821')} />
            <KeyValue label="Cancelled on" value={cancelled?.cancelledOn ?? (LIVE ? '' : '5 Oct 2025, 4:12 PM')} />
            <Divider className="my-2.5" />
            <KeyValue label="Refund amount" value={rupee(refund)} strong tone="success" />
            <P className="mt-2 text-caption text-ink-400">
              Credited to {cancelled?.paidVia ?? (LIVE ? 'the original payment method' : 'UPI · aarav@okhdfcbank')} within 3–5 working days.
            </P>
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button onClick={() => nav.navigate('doctor-profile', { tab: 'doctors' })}>Book again</Button>
          <Button variant="text" onClick={() => nav.navigate('help')}>
            Need help with this refund?
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ------------------------------------------------- S12 Doctor unavailable */

export function DoctorUnavailableScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const doctors = useCatalog((s) => s.doctors)
  const selectDoctor = useBooking((s) => s.selectDoctor)
  const seeNextDay = () => {
    useBooking.getState().setSlot({ ...MOCK_TODAY, day: 7 }, '10:00 AM')
    nav.navigate('select-slot')
  }
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Select time" subtitle="Monday, 6 October 2025" />
      <Div className=" flex-1 flex-col justify-center pb-[140px]">
        <StateBlock
          tone="caution"
          icon={<UserX className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="No slots on this date"
          body={`${d.name} is not consulting on 6 October. ${hisHer(d)} next available slot is Tuesday, 7 October at 10:00 AM.`}
          primary={<Button onClick={seeNextDay}>See 7 October</Button>}
        />

        <Div className="mt-8 px-5">
          <SectionHeader title="Similar cardiologists available today" className="!px-0 pb-2.5" />
          <Div className="gap-2.5">
            {doctors.slice(4, 6).map((x) => (
              <Btn
                key={x.id}
                onPress={() => {
                  selectDoctor(x.id)
                  nav.navigate('doctor-profile')
                }}
                className="tap flex-row w-full items-center gap-3.5 rounded-card bg-white p-3.5 text-left shadow-tile"
              >
                <Avatar src={x.photo} name={x.name} size={46} radius={15} />
                <Div className="min-w-0 flex-1">
                  <P className="truncate text-title-sm text-ink-900">{x.name}</P>
                  <P className="truncate text-body-sm text-ink-500">{x.specialty}</P>
                  <P className="mt-0.5 text-caption font-semibold text-vital-700">{x.nextSlot}</P>
                </Div>
                <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
              </Btn>
            ))}
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

/* ------------------------------------------------- S13 Doctor running late */

export function DoctorLateScreen() {
  const nav = useNav()
  const callId = useCall((s) => s.appointmentId)
  const appointment = useAppointments((s) => s.items.find((a) => a.id === (callId ?? 'a1')))
  const selected = useSelectedDoctor()
  const d = appointment ? getDoctor(appointment.doctorId) : selected
  const [confirmingCancel, setConfirmingCancel] = React.useState(false)
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Waiting room" />
      <Div className=" flex-1 flex-col items-center justify-center px-6 pb-[140px]">
        <Div className="relative flex-col h-[92px] w-[92px] items-center justify-center">
          <Span className="absolute inset-0 animate-pulseRing rounded-full bg-caution-600/20" />
          <Span className="relative flex-col h-[72px] w-[72px] items-center justify-center rounded-[26px] bg-caution-50">
            <Timer className="h-[31px] w-[31px] text-caution-600" strokeWidth={1.8} />
          </Span>
        </Div>

        <P className="mt-6 text-center text-title-md text-ink-900">{surname(d)} is running late</P>
        <P className="mt-2.5 max-w-[300px] text-center text-body-lg leading-[23px] text-ink-500">
          {heShe(d)} is finishing an earlier consultation. You’re next in line.
        </P>

        <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white px-4 py-3 shadow-tile">
          <Clock className="h-[16px] w-[16px] text-caution-600" strokeWidth={2.3} />
          <Span className="font-display text-[18px] font-bold tabular-nums text-ink-900">~ 8 minutes</Span>
          <Span className="text-body-sm text-ink-400">estimated wait</Span>
        </Div>

        <Div className="mt-7 w-full">
          <Card elevation="tile">
            <Div className="flex-row items-center gap-3.5">
              <Avatar src={d.photo} name={d.name} size={46} radius={15} />
              <Div className="min-w-0 flex-1">
                <P className="truncate text-title-sm text-ink-900">{d.name}</P>
                <P className="truncate text-body-sm text-ink-500">Next in queue · {appointment?.time ?? '5:30 PM'}</P>
              </Div>
              <StatusBadge tone="caution" dot>
                Delayed
              </StatusBadge>
            </Div>
          </Card>
        </Div>

        <Div className="mt-4 w-full">
          <Banner
            tone="brand"
            icon={<Bell className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="You can leave this screen"
            body="We’ll send a notification the moment the doctor joins."
          />
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button variant="tertiary" onClick={() => nav.navigate('home', { tab: 'home' })}>
            Notify me when ready
          </Button>
          <Button variant="text" className="!text-critical-600" onClick={() => setConfirmingCancel(true)}>
            Cancel appointment
          </Button>
        </Div>
      </StickyBar>

      {confirmingCancel && appointment && (
        <CancelAppointmentModal appointment={appointment} onClose={() => setConfirmingCancel(false)} />
      )}
    </Screen>
  )
}

/** The doctor of the consultation in progress, or the selected doctor when previewing. */
function useCallDoctor() {
  const callId = useCall((s) => s.appointmentId)
  const appointment = useAppointments((s) => s.items.find((a) => a.id === callId))
  const selected = useSelectedDoctor()
  return appointment ? getDoctor(appointment.doctorId) : selected
}

/* ------------------------------------------------- S14 Video connection lost */

export function VideoLostScreen() {
  const nav = useNav()
  const d = useCallDoctor()
  const leave = async () => {
    await finishConsultation()
    nav.navigate('consult-complete', { replace: true })
  }
  return (
    <Screen background="bg-black" padTop={false} padBottom={false}>
      <Div className="relative h-full w-full">
        <Img src={d.photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-[3px]" style={{ objectPosition: 'center 28%' }} />
        <Div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,12,20,.82) 0%, rgba(5,12,20,.9) 100%)' }} />

        <Div className="absolute inset-x-0  flex-col items-center px-8" style={{ top: '26%' }}>
          <Span className="flex-col h-[76px] w-[76px] items-center justify-center rounded-[26px] bg-white/10 ring-1 ring-inset  ring-white/15">
            <VideoOff className="h-[31px] w-[31px] text-white" strokeWidth={1.8} />
          </Span>
          <P className="mt-6 text-center text-title-md text-white">Connection lost</P>
          <P className="mt-2.5 max-w-[290px] text-center text-body-lg leading-[23px] text-white/65">
            We’re reconnecting you to {d.name}. Your consultation time has been paused.
          </P>

          <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white/10 px-4 py-2.5 ring-1 ring-inset  ring-white/15">
            <Span className="h-[7px] w-[7px] animate-pulse rounded-full bg-caution-500" />
            <Span className="text-body-sm font-semibold text-white">Reconnecting… attempt 2 of 5</Span>
          </Div>

          <Div className="mt-5 w-full max-w-[280px]">
            <EcgLine animate width={280} height={30} stroke="rgba(255,255,255,.45)" />
          </Div>
        </Div>

        <Div className="absolute inset-x-0 px-6" style={{ bottom: DEVICE.safeBottom + 22 }}>
          <Div className="gap-2.5">
            <Button variant="onDark" onClick={() => nav.navigate('video-call')}>
              Rejoin consultation
            </Button>
            <Button variant="danger" onClick={leave}>
              Leave call
            </Button>
          </Div>
          <P className="mt-3.5 text-center text-caption text-white/45">
            If this keeps happening, switch to an audio consultation.
          </P>
        </Div>
      </Div>
    </Screen>
  )
}

/* ------------------------------------------------ S15 Audio connection lost */

export function AudioLostScreen() {
  const nav = useNav()
  const d = useCallDoctor()
  const leave = async () => {
    await finishConsultation()
    nav.navigate('consult-complete', { replace: true })
  }
  return (
    <Screen background="bg-brand-deep" padTop={false} padBottom={false}>
      <Div className="relative  h-full w-full flex-col items-center">
        <Div className="absolute inset-0 bg-ink-900/55" />

        <Div className="relative mt-[22%]  flex-col items-center px-8">
          <Div className="relative flex-col items-center justify-center">
            <Avatar src={d.photo} name={d.name} size={120} radius={42} className="opacity-55 grayscale" />
            <Span className="absolute flex-col h-[52px] w-[52px] items-center justify-center rounded-full bg-critical-600 ring-[4px] ring-ink-900/40">
              <PhoneOff className="h-[22px] w-[22px] text-white" strokeWidth={2.2} />
            </Span>
          </Div>

          <P className="mt-7 text-title-md text-white">Call disconnected</P>
          <P className="mt-2.5 max-w-[290px] text-center text-body-lg leading-[23px] text-white/60">
            The call with {d.name} dropped at 06:18. You will not be charged for the interrupted time.
          </P>

          <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white/10 px-4 py-2.5 ring-1 ring-inset  ring-white/15">
            <AlertTriangle className="h-[14px] w-[14px] text-caution-400" strokeWidth={2.3} />
            <Span className="text-body-sm font-semibold text-white">Weak network detected</Span>
          </Div>
        </Div>

        <Div className="absolute inset-x-0 px-6" style={{ bottom: DEVICE.safeBottom + 22 }}>
          <Div className="gap-2.5">
            <Button onClick={() => nav.navigate('audio-call')}>Call again</Button>
            <Button variant="onDark" onClick={leave}>
              End consultation
            </Button>
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

/* ---------------------------------------------------- S16 Report pending */

export function ReportPendingScreen() {
  const nav = useNav()
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Lab report" subtitle="KDC-LR-66104" />
      <Div className=" flex-1 flex-col justify-center pb-[140px]">
        <StateBlock
          tone="brand"
          icon={<Hourglass className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="Report is being prepared"
          body="Your sample is at the lab. A registered pathologist reviews every report before it is released."
        />

        <Div className="mt-8 gap-3 px-5">
          <Card elevation="tile">
            <Div className="flex-row items-center justify-between">
              <Span className="text-body-sm text-ink-500">Expected by</Span>
              <Span className="text-title-sm text-ink-900">Today, 6:45 PM</Span>
            </Div>
            <Divider className="my-3" />
            <Div className="flex-row items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Span key={i} className={`h-[4px] flex-1 rounded-full ${i <= 4 ? 'bg-brand-600' : 'bg-ink-100'}`} />
              ))}
            </Div>
            <P className="mt-2.5 text-caption text-ink-400">Step 4 of 5 · Processing at Dr. Lal PathLabs</P>
          </Card>

          <Banner
            tone="brand"
            icon={<Bell className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="We’ll notify you"
            body="You’ll get a push notification and an SMS the moment the report is ready."
          />
        </Div>
      </Div>

      <StickyBar>
        <Button variant="tertiary" onClick={() => nav.navigate('diagnostic-tracking', { tab: 'orders' })}>
          Track this booking
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* ----------------------------------------------------- S17 Order delayed */

export function OrderDelayedScreen() {
  const nav = useNav()
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Track order" subtitle="KDC-PH-99421" />
      <Div className=" flex-1 flex-col justify-center pb-[140px]">
        <StateBlock
          tone="caution"
          icon={<PackageX className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="Your order is delayed"
          body="Heavy rain in Banjara Hills is slowing deliveries. Your medicines are safe with the delivery partner."
        />

        <Div className="mt-8 gap-3 px-5">
          <Card elevation="tile">
            <Div className="flex-row items-center justify-between">
              <Div>
                <P className="text-caption text-ink-400">Original estimate</P>
                <P className="mt-0.5 text-body-lg font-semibold text-ink-400 line-through">Today, 7:30 PM</P>
              </Div>
              <Div className="text-right">
                <P className="text-caption text-ink-400">New estimate</P>
                <P className="mt-0.5 text-body-lg font-bold text-caution-700">Today, 9:15 PM</P>
              </Div>
            </Div>
          </Card>

          <Card elevation="tile">
            <Div className="flex-row items-center gap-3">
              <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile bg-vital-50">
                <Check className="h-[17px] w-[17px] text-vital-600" strokeWidth={2.6} />
              </Span>
              <P className="min-w-0 flex-1 text-body-sm leading-[19px] text-ink-600">
                Delivery charges for this order have been waived automatically.
              </P>
            </Div>
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button variant="tertiary" className="flex-1" onClick={() => nav.navigate('help')} icon={<Headphones className="h-[16px] w-[16px]" strokeWidth={2.2} />}>
            Support
          </Button>
          <Button className="flex-1" onClick={() => nav.navigate('order-tracking', { tab: 'orders' })}>
            Track order
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ---------------------------------------------------- S18 No search results */

export function NoResultsScreen() {
  const nav = useNav()
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="bg-white px-5 pb-3" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
        <ScreenHeader embedded title="Search" border={false} />
        <SearchInput value="cardiologist in kompally" />
      </Div>

      <Div className=" flex-1 flex-col justify-center pb-[120px]">
        <StateBlock
          icon={<SearchX className="h-[31px] w-[31px]" strokeWidth={1.8} />}
          title="No matches found"
          body="We couldn’t find a cardiologist in Kompally. Try widening the distance or removing a filter."
        />

        <Div className="mt-8 px-5">
          <SectionHeader title="Try instead" className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {[
              { label: 'Cardiologists within 10 km', sub: '12 doctors available' },
              { label: 'Online cardiology consultations', sub: '38 doctors available today' },
              { label: 'General physicians in Kompally', sub: '7 doctors available' },
            ].map((s) => (
              <Btn
                key={s.label}
                onPress={() => nav.navigate('doctor-list', { tab: 'doctors' })}
                className="tap flex-row w-full items-center gap-3 rounded-card bg-white p-3.5 text-left shadow-tile"
              >
                <Div className="min-w-0 flex-1">
                  <P className="truncate text-body-lg font-semibold text-ink-900">{s.label}</P>
                  <P className="truncate text-caption text-ink-400">{s.sub}</P>
                </Div>
                <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
              </Btn>
            ))}
          </Div>
        </Div>
      </Div>

      <BottomNav active="doctors" />
    </Screen>
  )
}
