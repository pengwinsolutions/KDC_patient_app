import { Btn, Div, P, Span, SvgBox, SvgG, SvgPath, SvgRect } from '../components/primitives/index'
import React from 'react'
import {
  Video,
  Phone,
  Building2,
  Check,
  Info,
  MapPin,
  Navigation,
  Clock,
  ShieldCheck,
  CalendarPlus,
  ChevronRight,
  Lock,
  Banknote,
  Landmark,
  CreditCard,
  Smartphone,
  Tag,
  FlaskConical,
} from '../components/primitives/icons'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, StickyBar } from '../components/ui/Button'
import { Avatar, Card, KeyValue, MetaChip, SectionHeader, StatusBadge, Divider, VerifiedMark } from '../components/ui/Display'
import { Calendar, SlotGroup } from '../components/ui/Scheduling'
import { Banner, Modal } from '../components/ui/Feedback'
import { MODE, PaymentMethodRow } from '../components/cards/index'
import { Logo, EcgLine } from '../components/ui/Logo'
import { consultationModes, rupee } from '../mock-data/mock'
import type { ConsultMode } from '../types'
import { MemberDiscountLine, PlusTag, PlusUpsell } from '../components/ui/Membership'
import { CardFormSheet, PatientPickerSheet, UpiFormSheet } from '../components/forms/Sheets'
import { useNav } from '../navigation/navigation'
import { useCatalog, getClinic, getDoctor, getLab, getTest } from '../store/catalog'
import { useBooking, useSelectedDoctor } from '../store/booking'
import { takenTimes, useAppointments } from '../store/appointments'
import { patientLabel, useFamily } from '../store/family'
import { NET_BANKING, PAY_AT_COLLECTION, PAY_ONLINE, WALLET, usePayments } from '../store/payments'
import { LIVE as LIVE_PAYMENT } from '../services/config'
import { PREVIEW_BILLED_TEST, useDiagnosticsDraft } from '../store/diagnosticsDraft'
import { formatAddress, useAddresses } from '../store/addresses'
import { showToast } from '../store/toast'
import { useCheckout, type PaymentIntent } from '../flows/payment'
import { usePricing } from '../hooks/usePricing'
import { labTestPrice, PLATFORM_FEE } from '../domain/pricing'
import {
  buildMonth,
  cancellationDeadline,
  clampMonthOffset,
  collectionWindow,
  consultationSlots,
  consultMinutes,
  formatLong,
  formatShort,
  formatShortYear,
  isSlotOpen,
  MOCK_TODAY,
  monthAt,
  toIso,
  type CalendarDate,
  type Period,
} from '../domain/schedule'
import { LIVE } from '../services/config'
import { useEarliestSlots, useMonthAvailability, useSlots } from '../hooks/useCare'
import { careRules, groupSlots } from '../services/live/doctors'
import { selfMemberId } from '../services/live/me'
import { errorMessage } from '../services/errors'
import { useProfile } from '../store/profile'
import { plural } from '../domain/plural'

/** Live: the free-cancellation cut-off, from the server's rule (minutes before the start). */
function freeCancelUntil(time: string): string {
  if (!LIVE) return cancellationDeadline(time)
  const [clock, meridiem] = time.split(' ')
  const [h, m] = clock.split(':').map(Number)
  const total = ((h % 12) + (meridiem === 'PM' ? 12 : 0)) * 60 + m - careRules.freeCancelMinutes
  const wrapped = ((total % 1440) + 1440) % 1440
  const hh = Math.floor(wrapped / 60)
  return `${hh % 12 || 12}:${String(wrapped % 60).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`
}

/** The fee shown at each step: live uses the platform fee the server charges. */
const platformFee = () => (LIVE ? careRules.platformFee : PLATFORM_FEE)

/* --------------------------------------------------- Shared booking header */

function BookingDoctorStrip() {
  const d = useSelectedDoctor()
  return (
    <Div className="flex-row items-center gap-3 border-b border-ink-100 bg-white px-5 py-3.5">
      <Avatar src={d.photo} name={d.name} size={44} radius={14} />
      <Div className="min-w-0 flex-1">
        <Div className="flex-row items-center gap-1">
          <P className="truncate text-title-sm text-ink-900">{d.name}</P>
          <VerifiedMark size={14} />
        </Div>
        <P className="truncate text-body-sm text-ink-500">
          {d.specialty} · {d.experience} yrs
        </P>
      </Div>
    </Div>
  )
}

function Steps({ active }: { active: number }) {
  const labels = ['Type', 'Date', 'Slot', 'Pay']
  return (
    <Div className="flex-row items-center gap-1.5 bg-white px-5 pb-3.5 pt-3">
      {labels.map((l, i) => (
        <React.Fragment key={l}>
          <Div className="flex-row items-center gap-1.5">
            <Span
              className={`flex-col h-[20px] w-[20px] items-center justify-center rounded-full text-[10px] font-bold ${
                i < active ? 'bg-vital-600 text-white' : i === active ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-400'
              }`}
            >
              {i < active ? <Check className="h-[11px] w-[11px]" strokeWidth={3.4} /> : i + 1}
            </Span>
            <Span className={`text-caption font-semibold ${i <= active ? 'text-ink-800' : 'text-ink-300'}`}>{l}</Span>
          </Div>
          {i < labels.length - 1 && <Span className={`h-[2px] flex-1 rounded-full ${i < active ? 'bg-vital-600' : 'bg-ink-100'}`} />}
        </React.Fragment>
      ))}
    </Div>
  )
}

/* ============================================ 13 — Consultation type ====== */

const MODE_ICON = { video: Video, audio: Phone, clinic: Building2 }

const nextStepFor = (mode: ConsultMode) => (mode === 'clinic' ? 'clinic-location' : 'select-date')

export function ConsultTypeScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const mode = useBooking((s) => s.mode)
  const setMode = useBooking((s) => s.setMode)
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Book consultation" border={false} />
      <BookingDoctorStrip />
      <Steps active={0} />

      <Div className="flex-1 px-5 pb-[120px] pt-5">
        <P className="text-title-md text-ink-900">How would you like to consult?</P>
        <P className="mt-1 text-body text-ink-500">You can change this later, before you pay.</P>

        <Div className="mt-4 gap-3">
          {consultationModes.filter((m) => !LIVE || (d.modes ?? []).includes(m.id)).map((m) => {
            const Icon = MODE_ICON[m.id]
            const selected = m.id === mode
            return (
              <Btn
                key={m.id}
                onPress={() => {
                  setMode(m.id)
                  nav.navigate(nextStepFor(m.id))
                }}
                className={`tap relative w-full overflow-hidden rounded-card bg-white p-4 text-left  ${
                  selected ? 'ring-[1.5px] ring-inset  ring-brand-600 shadow-card' : 'shadow-tile'
                }`}
              >
                {m.tag && (
                  <Span className="absolute right-0 top-0 rounded-bl-[12px] bg-brand-600 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[.05em] text-white">
                    {m.tag}
                  </Span>
                )}
                <Div className="flex-row items-start gap-3.5">
                  <Span
                    className={`flex-col h-[46px] w-[46px] shrink-0 items-center justify-center rounded-tile ${
                      selected ? 'bg-brand-600' : 'bg-brand-50'
                    }`}
                  >
                    <Icon className={`h-[21px] w-[21px] ${selected ? 'text-white' : 'text-brand-600'}`} strokeWidth={2} />
                  </Span>
                  <Div className="min-w-0 flex-1 pr-6">
                    <P className="text-title-sm text-ink-900">{m.label}</P>
                    <P className="mt-1 text-body-sm leading-[19px] text-ink-500">{m.blurb}</P>
                  </Div>
                </Div>

                <Div className="mt-3.5 flex-row items-center justify-between border-t border-ink-100 pt-3.5">
                  <Div className="flex-row items-center gap-2">
                    <MetaChip>
                      <Clock className="h-[11px] w-[11px]" /> {m.duration}
                    </MetaChip>
                    {m.id === 'clinic' && <MetaChip>Physical exam</MetaChip>}
                  </Div>
                  <Div className="flex-row items-baseline gap-1.5">
                    <Span className="text-title-sm text-ink-900">{rupee(d.fees[m.id])}</Span>
                    <ChevronRight className="h-[16px] w-[16px] text-ink-300" />
                  </Div>
                </Div>
              </Btn>
            )
          })}
        </Div>

        <Div className="mt-5">
          <Banner
            tone="brand"
            icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="Not sure which to pick?"
            body="Video works for most new problems. Audio is ideal for follow-ups and report reviews."
          />
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={() => nav.navigate(nextStepFor(mode))}>Continue</Button>
      </StickyBar>
    </Screen>
  )
}

/* ================================================ 14 — Date selection ===== */

const modeSummary = (mode: ConsultMode, fee: number) =>
  `${MODE[mode].verb} · ${consultMinutes(mode)} min · ${rupee(fee)}`

export function DateScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const booking = useBooking()
  const [monthOffset, setMonthOffset] = React.useState(() => {
    const months = (booking.date.year - MOCK_TODAY.year) * 12 + booking.date.month - MOCK_TODAY.month
    return clampMonthOffset(months)
  })
  const { year, month } = monthAt(monthOffset)
  const demoView = buildMonth(year, month)
  /* Live: the doctor's real bookable days for this month. */
  const monthDays = useMonthAvailability(d.id, booking.mode, year, month).data
  const view = LIVE
    ? {
        ...demoView,
        days: demoView.days.map((x) => {
          const day = monthDays?.days.find((a) => a.date.day === x.date)
          return { ...x, available: Boolean(day && !day.closed && day.freeSlots > 0) }
        }),
      }
    : demoView
  const onShownMonth = booking.date.year === year && booking.date.month === month
  const ModeIcon = MODE[booking.mode].Icon
  const liveEarliest = useEarliestSlots(d.id, booking.mode).data ?? []
  const earliest: { d: string; t: string; tone: string; date: CalendarDate }[] = LIVE
    ? liveEarliest.map((x, i) => ({
        d: toIso(x.date) === toIso(MOCK_TODAY) ? `Today, ${formatShort(x.date).split(', ')[1]}` : formatShort(x.date),
        t: x.time,
        tone: i === 0 ? 'vital' : 'ink',
        date: x.date,
      }))
    : [
        { d: 'Today, 5 Oct', t: '5:30 PM', tone: 'vital', date: MOCK_TODAY },
        { d: 'Mon, 6 Oct', t: '10:00 AM', tone: 'ink', date: { ...MOCK_TODAY, day: 6 } },
      ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Select date" border={false} />
      <BookingDoctorStrip />
      <Steps active={1} />

      <Div className="flex-1 px-5 pb-[120px] pt-4">
        <Div className="mb-3.5 flex-row items-center gap-2 rounded-tile bg-brand-50 px-3.5 py-2.5">
          <ModeIcon className="h-[15px] w-[15px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm font-semibold text-brand-700">{modeSummary(booking.mode, d.fees[booking.mode])}</P>
        </Div>

        <Calendar
          month={view.label}
          year={view.year}
          startOffset={view.startOffset}
          days={view.days}
          selected={onShownMonth ? booking.date.day : undefined}
          onSelect={(day) => booking.setDate({ year, month, day })}
          onPrev={() => setMonthOffset(clampMonthOffset(monthOffset - 1))}
          onNext={() => setMonthOffset(clampMonthOffset(monthOffset + 1))}
        />

        {earliest.length > 0 && <Div className="mt-4">
          <SectionHeader title="Earliest available" className="!px-0 pb-2.5" />
          <Div className=" grid-cols-2 gap-2.5">
            {earliest.map((s) => (
              <Btn
                key={s.d}
                onPress={() => {
                  booking.setSlot(s.date, s.t)
                  nav.navigate('select-slot')
                }}
                className="tap rounded-tile bg-white p-3.5 text-left shadow-tile"
              >
                <P className="text-body-sm font-semibold text-ink-900">{s.d}</P>
                <P className={`mt-0.5 text-title-sm ${s.tone === 'vital' ? 'text-vital-600' : 'text-ink-900'}`}>{s.t}</P>
              </Btn>
            ))}
          </Div>
        </Div>}
      </Div>

      <StickyBar>
        <Div className="mb-3 flex-row items-center justify-between">
          <Span className="text-body-sm text-ink-500">Selected</Span>
          <Span className="text-body-sm font-bold text-ink-900">{formatLong(booking.date)}</Span>
        </Div>
        <Button onClick={() => nav.navigate('select-slot')}>Continue</Button>
      </StickyBar>
    </Screen>
  )
}

/* =================================================== 15 — Time slots ====== */

export function SlotScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const booking = useBooking()
  const appointments = useAppointments((s) => s.items)
  const [confirmingMove, setConfirmingMove] = React.useState(false)
  const iso = toIso(booking.date)
  const taken = takenTimes(appointments, d.id, iso)
  /* Live: the doctor's real slots for that day. */
  const liveSlots = useSlots(d.id, booking.mode, booking.date)
  const groups = LIVE ? groupSlots(liveSlots.data ?? [], booking.time) : consultationSlots(d.id, booking.date, taken, booking.time)
  const canContinue = LIVE
    ? Boolean(booking.time && liveSlots.data?.some((x) => x.time === booking.time && x.available))
    : isSlotOpen(d.id, booking.date, taken, booking.time)
  const rescheduling = booking.reschedulingId
  const noSlots = LIVE && liveSlots.isSuccess && !liveSlots.data.some((x) => x.available)

  const moveAppointment = async () => {
    if (!rescheduling || !booking.time) return
    try {
      await useAppointments.getState().reschedule(rescheduling, booking.date, booking.time)
    } catch (e) {
      setConfirmingMove(false)
      showToast(errorMessage(e, 'We could not reschedule. Please try again.'), 'critical')
      void liveSlots.refetch()
      return
    }
    booking.finishReschedule()
    showToast('Appointment rescheduled', 'success', `${formatShort(booking.date)} · ${booking.time}`)
    nav.finishTo('appointment-detail', { id: rescheduling })
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Select time" subtitle={formatLong(booking.date)} border={false} />
      <BookingDoctorStrip />
      <Steps active={2} />

      <Div className="flex-1 gap-6 px-5 pb-[130px] pt-5">
        {(['Morning', 'Afternoon', 'Evening'] as Period[])
          .filter((p) => !LIVE || groups[p].length > 0)
          .map((p) => (
            <SlotGroup key={p} period={p} slots={groups[p]} onSelect={booking.setTime} />
          ))}
        {noSlots && (
          <Banner
            tone="caution"
            icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="No open slots on this day"
            body="Pick another date to see the doctor's open times."
          />
        )}

        <Div className="flex-row items-center gap-4 rounded-tile bg-white p-3.5 shadow-tile">
          <Span className="flex-row items-center gap-1.5 text-caption text-ink-500">
            <Span className="h-[12px] w-[12px] rounded-[4px] bg-brand-600" /> Selected
          </Span>
          <Span className="flex-row items-center gap-1.5 text-caption text-ink-500">
            <Span className="h-[12px] w-[12px] rounded-[4px] bg-white ring-1 ring-inset  ring-ink-200" /> Available
          </Span>
          <Span className="flex-row items-center gap-1.5 text-caption text-ink-500">
            <Span className="h-[12px] w-[12px] rounded-[4px] bg-ink-50" /> Booked
          </Span>
        </Div>
      </Div>

      <StickyBar>
        <Div className="mb-3 flex-row items-center gap-2">
          <Clock className="h-[15px] w-[15px] text-brand-600" strokeWidth={2.3} />
          <Span className="text-body-sm font-bold text-ink-900">
            {formatShort(booking.date)} · {booking.time ?? 'Select a time'}
          </Span>
          <Span className="ml-auto text-body-sm font-bold text-ink-900">{rupee(d.fees[booking.mode])}</Span>
        </Div>
        <Button
          disabled={!canContinue}
          onClick={() => (rescheduling ? setConfirmingMove(true) : nav.navigate('summary'))}
        >
          Continue
        </Button>
      </StickyBar>

      {confirmingMove && (
        <Modal
          icon={<Clock className="h-[26px] w-[26px]" strokeWidth={2} />}
          title="Reschedule this appointment?"
          body={`It will move to ${formatLong(booking.date)} at ${booking.time}. There is no extra charge.`}
          actions={
            <>
              <Button onClick={moveAppointment}>Yes, reschedule</Button>
              <Button variant="tertiary" onClick={() => setConfirmingMove(false)}>
                Keep current time
              </Button>
            </>
          }
        />
      )}
    </Screen>
  )
}

/* ============================================ 16 — In-person location ===== */

function MapPreview({ height = 150 }: { height?: number }) {
  return (
    <Div className="relative overflow-hidden rounded-tile bg-[#E8EEF4]" style={{ height }}>
      <SvgBox viewBox="0 0 360 160" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <SvgRect width="360" height="160" fill="#E9EFF5" />
        {/* Parks */}
        <SvgRect x="18" y="14" width="78" height="46" rx="6" fill="#DCEBDF" />
        <SvgRect x="262" y="96" width="86" height="54" rx="6" fill="#DCEBDF" />
        {/* Water */}
        <SvgPath d="M0 132c44-10 84 6 130 0s82-22 130-14 100 10 100 10v32H0Z" fill="#D5E6F2" />
        {/* Blocks */}
        {[
          [110, 18, 56, 40], [178, 18, 48, 40], [238, 18, 62, 40],
          [18, 74, 70, 40], [100, 74, 58, 40], [170, 74, 52, 40], [234, 74, 44, 40],
          [18, 126, 60, 30], [92, 126, 72, 30], [178, 126, 62, 30],
        ].map(([x, y, w, h], i) => (
          <SvgRect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#DFE6ED" />
        ))}
        {/* Roads */}
        <SvgG stroke="#FFFFFF" strokeLinecap="round">
          <SvgPath d="M0 68h360" strokeWidth="9" />
          <SvgPath d="M0 120h360" strokeWidth="6" />
          <SvgPath d="M100 0v160" strokeWidth="8" />
          <SvgPath d="M230 0v160" strokeWidth="5" />
          <SvgPath d="M168 0v160" strokeWidth="4" />
        </SvgG>
        <SvgG stroke="#C9A646" strokeWidth="2" strokeLinecap="round" opacity=".55">
          <SvgPath d="M0 68h360" />
        </SvgG>
        {/* Route */}
        <SvgPath d="M58 150 58 120 100 120 100 68 196 68" stroke="#0068C8" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray="1 7" />
      </SvgBox>

      {/* Destination pin */}
      <Div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
        <Span className="absolute -inset-5 animate-pulseRing rounded-full bg-brand-600/25" />
        <Span className="relative flex-col h-[34px] w-[34px] items-center justify-center rounded-full bg-brand-600 shadow-lift ring-[3px] ring-white">
          <Building2 className="h-[16px] w-[16px] text-white" strokeWidth={2.3} />
        </Span>
      </Div>

      <Div className="absolute bottom-2.5 right-2.5 flex-row items-center gap-1.5 rounded-chip bg-white/92 px-2.5 py-1.5 shadow-tile ">
        <Navigation className="h-[12px] w-[12px] text-brand-600" strokeWidth={2.4} />
        <Span className="text-caption font-bold text-ink-800">3.2 km · 14 min</Span>
      </Div>
    </Div>
  )
}

export function ClinicScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const demoClinics = useCatalog((s) => s.clinics)
  const selectedClinicId = useBooking((s) => s.clinicId)
  const setClinic = useBooking((s) => s.setClinic)
  const continueToDate = () => nav.navigate('select-date')
  /* Live: a doctor practises at one clinic (their profile's address); distance and today's slots aren't known here. */
  const clinics = LIVE ? [] : demoClinics
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Choose clinic" border={false} />
      <BookingDoctorStrip />

      <Div className="flex-1 px-5 pb-[120px] pt-4">
        <Div className="mb-4 flex-row items-center gap-2 rounded-tile bg-ink-900 px-3.5 py-2.5">
          <Building2 className="h-[15px] w-[15px] shrink-0 text-white" strokeWidth={2.2} />
          <P className="text-body-sm font-semibold text-white">In-person consultation · {consultMinutes('clinic')} min · {rupee(d.fees.clinic)}</P>
        </Div>

        {LIVE && (
          <Card elevation="card" className="ring-[1.5px] ring-inset ring-brand-600">
            <P className="text-title-sm text-ink-900">{d.hospital || 'Clinic'}</P>
            <P className="mt-1 text-body-sm leading-[18px] text-ink-500">{d.clinicAddress || `${d.locality}`}</P>
          </Card>
        )}
        <Div className="gap-3">
          {clinics.map((c) => {
            const selected = c.id === selectedClinicId
            return (
            <Div
              key={c.id}
              className={`overflow-hidden rounded-card bg-white  ${
                selected ? 'ring-[1.5px] ring-inset  ring-brand-600 shadow-card' : 'shadow-tile'
              }`}
            >
              {selected && <MapPreview />}
              <Btn
                onPress={() => {
                  setClinic(c.id)
                  continueToDate()
                }}
                className="tap w-full p-4 text-left"
              >
                <Div className="flex-row items-start justify-between gap-3">
                  <Div className="min-w-0">
                    <P className="text-title-sm text-ink-900">{c.name}</P>
                    <P className="mt-1 text-body-sm leading-[18px] text-ink-500">{c.address}</P>
                  </Div>
                  <Span
                    className={`mt-0.5 flex-col h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full ${
                      selected ? 'bg-brand-600' : 'ring-1 ring-inset  ring-ink-300'
                    }`}
                  >
                    {selected && <Span className="h-[7px] w-[7px] rounded-full bg-white" />}
                  </Span>
                </Div>

                <Div className="mt-3 flex-row flex-wrap gap-1.5">
                  <MetaChip>
                    <MapPin className="h-[11px] w-[11px]" /> {c.distanceKm} km
                  </MetaChip>
                  <MetaChip>
                    <Clock className="h-[11px] w-[11px]" /> {c.timing}
                  </MetaChip>
                </Div>

                <Div className="mt-3 flex-row items-center justify-between border-t border-ink-100 pt-3">
                  <Span className={`text-body-sm font-bold ${c.slots > 5 ? 'text-vital-700' : 'text-caution-700'}`}>
                    {plural(c.slots, 'slot')} available today
                  </Span>
                  <Span className="text-body-sm font-semibold text-brand-600">Select →</Span>
                </Div>
              </Btn>
            </Div>
            )
          })}
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={continueToDate}>Continue to slots</Button>
      </StickyBar>
    </Screen>
  )
}

/* ====================================================== 17 — Summary ====== */

export function SummaryScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const booking = useBooking()
  const family = useFamily((s) => s.members)
  const pricing = usePricing()
  const [pickingPatient, setPickingPatient] = React.useState(false)
  const fee = d.fees[booking.mode]
  const platform = platformFee()
  const { discount, total } = pricing.bill(fee, 'consultations', platform)
  const holderName = useProfile((s) => s.profile.name)
  /* Live: no choice yet means the account holder. */
  const patientId = LIVE ? booking.patientId || String(selfMemberId ?? '') : booking.patientId
  const patient = family.find((m) => m.id === patientId) ?? (LIVE ? family.find((m) => m.primary) : family[0])
  const patientValue = patient ? (patient.primary ? `${patient.name} (Self)` : patientLabel(patient)) : `${holderName} (Self)`
  const ModeIcon = MODE[booking.mode].Icon

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Appointment summary" border={false} />
      <Steps active={3} />

      <Div className="flex-1 gap-4 px-5 pb-[150px] pt-4">
        <Card elevation="tile" padded={false}>
          <Div className="flex-row items-center gap-3.5 p-4">
            <Avatar src={d.photo} name={d.name} size={54} radius={17} />
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-center gap-1">
                <P className="truncate text-title-sm text-ink-900">{d.name}</P>
                <VerifiedMark size={14} />
              </Div>
              <P className="truncate text-body-sm text-ink-500">{d.specialty}</P>
              <P className="mt-0.5 truncate text-caption text-ink-400">{d.hospital}</P>
            </Div>
          </Div>
          <Divider />
          <Div className="gap-0 p-4">
            <SummaryRow icon={<ModeIcon className="h-[15px] w-[15px]" />} label="Consultation type" value={MODE[booking.mode].verb} />
            <SummaryRow
              icon={<Clock className="h-[15px] w-[15px]" />}
              label="Date & time"
              value={`${formatShortYear(booking.date)} · ${booking.time ?? ''}`}
            />
            <SummaryRow icon={<Clock className="h-[15px] w-[15px]" />} label="Duration" value={`${consultMinutes(booking.mode)} minutes`} />
            {booking.mode === 'clinic' && (
              <SummaryRow icon={<MapPin className="h-[15px] w-[15px]" />} label="Clinic" value={LIVE ? d.hospital || d.clinicAddress || '' : getClinic(booking.clinicId).name} />
            )}
            <SummaryRow
              icon={<ShieldCheck className="h-[15px] w-[15px]" />}
              label="Patient"
              value={patientValue}
              last
              onPress={() => setPickingPatient(true)}
            />
          </Div>
        </Card>

        {!pricing.active && (
          <PlusUpsell amount={fee} area="consultations" onJoin={() => nav.navigate('membership')} />
        )}

        <Card elevation="tile">
          <P className="mb-1.5 text-title-sm text-ink-900">Payment details</P>
          <KeyValue label="Consultation fee" value={rupee(fee)} />
          <KeyValue label="Platform fee" value={rupee(platform)} />
          <MemberDiscountLine amount={fee} area="consultations" />
          <Divider className="my-2.5" />
          <Div className="flex-row items-baseline justify-between">
            <Span className="text-title-sm text-ink-900">Total payable</Span>
            <Span className="font-display text-[22px] font-extrabold tabular-nums text-ink-900">{rupee(total)}</Span>
          </Div>
          <P className="mt-1 text-caption text-ink-400">Inclusive of all taxes</P>
        </Card>

        {pricing.active && (
          <Btn
            onPress={() => nav.navigate('membership-manage')}
            className="tap flex-row w-full items-center gap-3 rounded-card bg-white p-4 shadow-tile"
          >
            <Tag className="h-[17px] w-[17px] shrink-0 text-vital-600" strokeWidth={2.2} />
            <Div className="min-w-0 flex-1 text-left">
              <Div className="flex-row items-center gap-2">
                <P className="text-body-sm font-bold text-ink-900">Member rate applied</P>
                <PlusTag size="xs" />
              </Div>
              <P className="text-caption text-vital-700">You saved {rupee(discount)} on this booking</P>
            </Div>
            <Span className="text-body-sm font-semibold text-brand-600">View</Span>
          </Btn>
        )}

        <Banner
          tone="brand"
          icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          title={`Free cancellation until ${booking.time ? freeCancelUntil(booking.time) : ''}`}
          body={
            LIVE
              ? `Cancel up to ${careRules.freeCancelMinutes} minutes before the appointment for a full refund to the original payment method.`
              : 'Cancel up to one hour before the appointment for a full refund to the original payment method.'
          }
        />
      </Div>

      <StickyBar>
        <Div className="mb-3 flex-row items-end justify-between">
          <Div>
            <P className="text-caption text-ink-400">Total payable</P>
            <P className="font-display text-[21px] font-extrabold leading-none tabular-nums text-ink-900">{rupee(total)}</P>
          </Div>
          <Span className="flex-row items-center gap-1 text-caption text-ink-400">
            <Lock className="h-[11px] w-[11px]" strokeWidth={2.4} /> Secure payment
          </Span>
        </Div>
        <Button onClick={() => nav.navigate('payment')}>Proceed to Payment</Button>
      </StickyBar>

      <PatientPickerSheet
        visible={pickingPatient}
        members={family}
        selectedId={patientId}
        onSelect={booking.setPatient}
        onClose={() => setPickingPatient(false)}
      />
    </Screen>
  )
}

function SummaryRow({
  icon,
  label,
  value,
  last,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  value: string
  last?: boolean
  onPress?: () => void
}) {
  return (
    <Div onPress={onPress} className={`flex-row items-center gap-3 py-2.5 ${last ? '' : 'border-b border-ink-100'}`}>
      <Span className="text-ink-400">{icon}</Span>
      <Span className="flex-1 text-body text-ink-500">{label}</Span>
      <Span className="text-right text-body font-semibold text-ink-900">{value}</Span>
    </Div>
  )
}

/* ====================================================== 18 — Payment ====== */

/** Lab price of a test; a walk-in saves ₹50 over home collection. */
function diagnosticPrice(testPrice: number, labPrice: number, method: 'Home Collection' | 'Lab Visit') {
  return labTestPrice(testPrice, labPrice) - (method === 'Lab Visit' ? 50 : 0)
}

export function PaymentScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const booking = useBooking()
  const draft = useDiagnosticsDraft()
  const family = useFamily((s) => s.members)
  const address = useAddresses((s) => s.items.find((a) => a.id === s.selectedId))
  const pricing = usePricing()
  const methods = usePayments((s) => s.methods)
  const selected = usePayments((s) => s.selectedMethodId)
  const selectMethod = usePayments((s) => s.select)
  const [sheet, setSheet] = React.useState<'upi' | 'card' | null>(null)

  const diagnostics = nav.from === 'diagnostics'
  const area = diagnostics ? ('diagnostics' as const) : ('consultations' as const)
  const test = getTest(draft.testId ?? PREVIEW_BILLED_TEST)
  const lab = getLab(draft.labId)
  /* Discountable amount, then the platform fee which the membership does not
     touch — the same split Appointment summary uses, so the two agree. */
  const base = diagnostics ? diagnosticPrice(test.price, lab.price, draft.method) : d.fees[booking.mode]
  const platform = diagnostics ? 0 : PLATFORM_FEE
  const bill = pricing.bill(base, area, platform)
  const saved = bill.discount
  const listed = base + platform
  const total = bill.total
  const window = draft.time ? collectionWindow(draft.time) : null
  const collection = draft.method === 'Home Collection' ? 'Home collection' : 'Lab visit'
  const what = diagnostics ? `${test.short} · ${lab.name}` : `${d.name} · ${MODE[booking.mode].verb}`
  const whenLine = diagnostics
    ? `${formatShort(draft.date)} · ${window?.compact ?? ''} · ${collection}`
    : `${formatShortYear(booking.date)} · ${booking.time ?? ''}`
  const ModeIcon = MODE[booking.mode].Icon

  const pay = () => {
    const shared = { amount: total }
    let intent: PaymentIntent
    if (diagnostics) {
      if (!draft.time) {
        showToast('Choose a collection slot first', 'caution')
        return
      }
      intent = {
        ...shared,
        kind: 'diagnostic',
        title: what,
        subtitle: `${formatShort(draft.date)} · ${window?.compact ?? ''}`,
        testId: test.id,
        labId: lab.id,
        method: draft.method,
        date: draft.date,
        time: draft.time,
        address: address ? formatAddress(address) : '',
        bill,
        testName: test.name,
      }
    } else {
      if (!booking.time) {
        showToast('Choose a time slot first', 'caution')
        return
      }
      const patient = family.find((m) => m.id === booking.patientId) ?? (LIVE ? family.find((m) => m.primary) ?? family[0] : family[0])
      intent = {
        ...shared,
        kind: 'consultation',
        title: d.name,
        subtitle: `${formatShort(booking.date)} · ${booking.time}`,
        doctorId: d.id,
        mode: booking.mode,
        date: booking.date,
        time: booking.time,
        location: booking.mode === 'clinic' ? (LIVE ? d.hospital || d.clinicAddress || undefined : getClinic(booking.clinicId).name) : undefined,
        patientLabel: patientLabel(patient),
        bill,
        discountLabel: bill.discount ? `KDC+ Plus (${pricing.rateFor('consultations')}% off)` : undefined,
      }
    }
    // Live: consultations are always paid now; a lab test may be paid at collection.
    if (LIVE_PAYMENT && !diagnostics) selectMethod(PAY_ONLINE.id)
    useCheckout.getState().start(intent)
    nav.navigate('st-payment-processing')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Payment" subtitle={`Paying ${rupee(total)}`} />

      <Div className="flex-1 gap-5 px-5 pb-[130px] pt-4">
        {/* What is being paid for — this screen serves two journeys */}
        <Div className="flex-row items-center gap-3 rounded-tile bg-white p-3.5 shadow-tile">
          <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-brand-50">
            {diagnostics ? (
              <FlaskConical className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
            ) : (
              <ModeIcon className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
            )}
          </Span>
          <Div className="min-w-0 flex-1">
            <P className="truncate text-body-lg font-semibold text-ink-900">{what}</P>
            <P className="truncate text-caption text-ink-400">{whenLine}</P>
          </Div>
          <Span className="inline-flex flex-row shrink-0 items-baseline gap-1.5">
            <Span className="text-title-sm tabular-nums text-ink-900">{rupee(total)}</Span>
            {saved > 0 && (
              <Span className="text-caption tabular-nums text-ink-300 line-through">{rupee(listed)}</Span>
            )}
          </Span>
        </Div>

        {/* The bill, so the member rate is arithmetic the patient can check. */}
        <Card elevation="tile">
          <KeyValue label={diagnostics ? 'Test price' : 'Consultation fee'} value={rupee(base)} />
          {platform > 0 && <KeyValue label="Platform fee" value={rupee(platform)} />}
          <MemberDiscountLine amount={base} area={area} />
          <Divider className="my-2.5" />
          <Div className="flex-row items-baseline justify-between">
            <Span className="text-title-sm text-ink-900">Total payable</Span>
            <Span className="font-display text-[22px] font-extrabold tabular-nums text-ink-900">{rupee(total)}</Span>
          </Div>
        </Card>

        {/* Live: Razorpay Checkout offers UPI, cards, net banking and wallets itself; card details never reach KDC+. */}
        {LIVE_PAYMENT && (
          <Div>
            <SectionHeader title="Pay using" className="!px-0 pb-2.5" />
            <Div className="gap-2">
              {(diagnostics ? [PAY_ONLINE, PAY_AT_COLLECTION] : [PAY_ONLINE]).map((p) => (
                <PaymentMethodRow
                  key={p.id}
                  pm={p}
                  selected={diagnostics ? p.id === selected || (p.id === PAY_ONLINE.id && selected !== PAY_AT_COLLECTION.id) : true}
                  onClick={() => selectMethod(p.id)}
                />
              ))}
            </Div>
            <P className="mt-2 text-caption text-ink-400">
              The amount is confirmed by KDC+ when you pay{diagnostics ? '' : ', and the slot is held for you while you do'}.
            </P>
          </Div>
        )}

        {!LIVE_PAYMENT && (<>
        <Div>
          <SectionHeader title="UPI" subtitle="Instant · recommended" className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {methods
              .filter((p) => p.kind === 'upi')
              .map((p) => (
                <PaymentMethodRow key={p.id} pm={p} selected={p.id === selected} onClick={() => selectMethod(p.id)} />
              ))}
            <Btn
              onPress={() => setSheet('upi')}
              className="tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-3.5 ring-1 ring-inset  ring-ink-100"
            >
              <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
                <Smartphone className="h-[17px] w-[17px] text-ink-600" strokeWidth={2.1} />
              </Span>
              <Span className="flex-1 text-left text-body-lg font-semibold text-ink-900">Add new UPI ID</Span>
              <ChevronRight className="h-[17px] w-[17px] text-ink-300" />
            </Btn>
            <Div className="flex-row gap-2 pt-1">
              {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => (
                <Btn
                  key={a}
                  onPress={() => showToast(`${a} will open when you pay`, 'info')}
                  className="flex-1 rounded-chip bg-white py-2 text-center text-caption font-semibold text-ink-600 ring-1 ring-inset  ring-ink-100"
                >
                  {a}
                </Btn>
              ))}
            </Div>
          </Div>
        </Div>

        <Div>
          <SectionHeader title="Cards" className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {methods
              .filter((p) => p.kind === 'card')
              .map((p) => (
                <PaymentMethodRow key={p.id} pm={p} selected={p.id === selected} onClick={() => selectMethod(p.id)} />
              ))}
            <Btn
              onPress={() => setSheet('card')}
              className="tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-3.5 ring-1 ring-inset  ring-ink-100"
            >
              <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
                <CreditCard className="h-[17px] w-[17px] text-ink-600" strokeWidth={2.1} />
              </Span>
              <Span className="flex-1 text-left text-body-lg font-semibold text-ink-900">Add credit or debit card</Span>
              <ChevronRight className="h-[17px] w-[17px] text-ink-300" />
            </Btn>
          </Div>
        </Div>

        <Div>
          <SectionHeader title="More options" className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {[
              { Icon: Landmark, method: NET_BANKING },
              { Icon: Banknote, method: WALLET },
            ].map(({ Icon, method }) => (
              <Btn
                key={method.id}
                onPress={() =>
                  method.id === WALLET.id
                    ? showToast('Your KDC+ Wallet has no balance', 'caution')
                    : selectMethod(method.id)
                }
                className={`tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-3.5 ${
                  selected === method.id ? 'ring-[1.5px] ring-inset ring-brand-600' : 'ring-1 ring-inset ring-ink-100'
                }`}
              >
                <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
                  <Icon className="h-[17px] w-[17px] text-ink-600" strokeWidth={2.1} />
                </Span>
                <Span className="min-w-0 flex-1 text-left">
                  <Span className="block text-body-lg font-semibold text-ink-900">{method.label}</Span>
                  <Span className="block text-caption text-ink-400">{method.sub}</Span>
                </Span>
                <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-300" />
              </Btn>
            ))}
          </Div>
        </Div>

        </>)}

        <Div className="flex-row items-center justify-center gap-2 pt-1 text-caption text-ink-400">
          <ShieldCheck className="h-[13px] w-[13px] text-vital-600" strokeWidth={2.3} />
          {LIVE_PAYMENT ? 'Secured by Razorpay · KDC+ never sees your card details' : 'PCI-DSS compliant · KDC+ never stores your card details'}
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={pay} icon={<Lock className="h-[16px] w-[16px]" strokeWidth={2.4} />}>
          {LIVE_PAYMENT && diagnostics && selected === PAY_AT_COLLECTION.id ? 'Confirm booking' : `Pay ${rupee(total)}`}
        </Button>
      </StickyBar>

      {!LIVE_PAYMENT && <UpiFormSheet visible={sheet === 'upi'} onClose={() => setSheet(null)} />}
      {!LIVE_PAYMENT && <CardFormSheet visible={sheet === 'card'} onClose={() => setSheet(null)} />}
    </Screen>
  )
}

/* ============================================== 19 — Booking success ====== */

export function SuccessScreen() {
  const nav = useNav()
  const booking = useBooking()
  const lastBooked = useAppointments((s) => s.items.find((a) => a.id === s.lastBookedId))
  const d = getDoctor(lastBooked?.doctorId ?? booking.doctorId)
  const mode = lastBooked?.mode ?? booking.mode
  const year = lastBooked?.date.split(' ').pop() ?? String(booking.date.year)
  const dateLabel = lastBooked ? lastBooked.date.replace(/ \d{4}$/, '') : formatShort(booking.date)
  const time = lastBooked?.time ?? booking.time
  const bookingId = lastBooked?.bookingId ?? (LIVE ? useAppointments.getState().lastBookedId ?? '' : 'KDC2410A4821')
  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className=" flex-1 flex-col px-6 pb-[150px]">
        <Div className=" flex-col items-center pt-10">
          <Div className="relative flex-col h-[92px] w-[92px] items-center justify-center">
            <Span className="absolute inset-0 animate-pulseRing rounded-full bg-vital-600/20" />
            <Span className="absolute inset-0 animate-pulseRing rounded-full bg-vital-600/20 [animation-delay:.8s]" />
            <Span className="relative flex-col h-[68px] w-[68px] items-center justify-center rounded-full bg-vital-600 shadow-[0_10px_28px_-8px_rgba(48,152,64,.6)]">
              <Check className="h-[33px] w-[33px] text-white" strokeWidth={3.2} />
            </Span>
          </Div>

          <P className="mt-7 text-center font-display text-[27px] font-extrabold leading-[32px] tracking-[-0.6px] text-ink-900">
            Appointment confirmed
          </P>
          <P className="mt-2.5 max-w-[300px] text-center text-body-lg leading-[23px] text-ink-500">
            We’ve sent the details to your registered mobile number and email.
          </P>

          <Div className="mt-4">
            <EcgLine animate width={200} height={24} stroke="#309840" opacity={0.5} />
          </Div>
        </Div>

        <Card elevation="card" padded={false} className="mt-6 overflow-hidden">
          <Div className="flex-row items-center gap-3.5 bg-brand-deep p-4">
            <Avatar src={d.photo} name={d.name} size={50} radius={16} ring />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-white">{d.name}</P>
              <P className="truncate text-body-sm text-white/65">{d.specialty}</P>
            </Div>
            <Span className="rounded-[8px] bg-white px-2 py-1.5">
              <Logo variant="wordmark" width={42} />
            </Span>
          </Div>

          <Div className=" grid-cols-2 divide-x divide-ink-100 border-b border-ink-100">
            <Div className="p-4">
              <P className="text-caption text-ink-400">Date</P>
              <P className="mt-1 text-title-sm text-ink-900">{dateLabel}</P>
              <P className="text-caption text-ink-400">{year}</P>
            </Div>
            <Div className="p-4">
              <P className="text-caption text-ink-400">Time</P>
              <P className="mt-1 text-title-sm text-ink-900">{time}</P>
              <P className="text-caption text-ink-400">{consultMinutes(mode)} min · {MODE[mode].label}</P>
            </Div>
          </Div>

          {/* Perforated tear line — ticket metaphor used once, deliberately */}
          <Div className="relative flex-row items-center">
            <Span className="flex-1 border-t border-dashed border-ink-200" />
            <Span className="absolute -left-[9px] h-[18px] w-[18px] rounded-full bg-white" />
            <Span className="absolute -right-[9px] h-[18px] w-[18px] rounded-full bg-white" />
          </Div>

          <Div className="flex-row items-center justify-between p-4">
            <Div>
              <P className="text-caption text-ink-400">Booking ID</P>
              <P className="mt-0.5 text-title-sm tabular-nums text-ink-900">{bookingId}</P>
            </Div>
            <StatusBadge tone="success" dot>
              Confirmed
            </StatusBadge>
          </Div>
        </Card>

        <Div className="mt-5 rounded-card bg-brand-50 p-4">
          <P className="text-body-sm font-bold text-brand-700">What happens next</P>
          <Div className="mt-2.5 gap-2">
            {[
              'You’ll get a reminder 30 minutes before the consultation.',
              'Join the waiting room 5 minutes early to test your camera and mic.',
              'Your prescription appears in KDC+ as soon as the consultation ends.',
            ].map((t) => (
              <Div key={t} className="flex-row gap-2.5 text-body-sm leading-[19px] text-brand-700/90">
                <Span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-brand-600" />
                {t}
              </Div>
            ))}
          </Div>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button onClick={() => nav.navigate('appointment-detail', { params: { id: lastBooked?.id } })}>
            View Appointment
          </Button>
          <Button
            variant="tertiary"
            onClick={() => {
              showToast('Added to Calendar', 'success', `${dateLabel} · ${time}`)
              nav.resetTo('home', 'home')
            }}
            icon={<CalendarPlus className="h-[17px] w-[17px]" strokeWidth={2.2} />}
          >
            Add to Calendar
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}
