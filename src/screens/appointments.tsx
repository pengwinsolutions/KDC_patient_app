import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  CalendarClock,
  XCircle,
  MessageSquare,
  FileText,
  Receipt,
  Copy,
  Clock,
  AlertTriangle,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, BottomNav } from '../components/ui/Nav'
import { Button, StickyBar } from '../components/ui/Button'
import { Avatar, Card, KeyValue, Segmented, StatusBadge, Divider, VerifiedMark } from '../components/ui/Display'
import { Banner, StateBlock } from '../components/ui/Feedback'
import { AppointmentCard, MODE } from '../components/cards/index'
import { CancelAppointmentModal } from '../components/forms/AppointmentDialogs'
import { rupee } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import { appointmentById, isUpcoming, upcomingOf, useAppointments } from '../store/appointments'
import { useBooking } from '../store/booking'
import { getDoctor } from '../store/catalog'
import { showToast } from '../store/toast'
import { cancellationDeadline, consultMinutes } from '../domain/schedule'
import type { Appointment } from '../types'
import { LIVE } from '../services/config'
import { careRules } from '../services/live/doctors'
import { useCall } from '../store/call'

/** Live: the payment line the server reports for this appointment. */
const PAYMENT_LABEL: Record<string, { label: string; tone: 'success' | 'caution' | 'neutral' }> = {
  paid: { label: 'Paid', tone: 'success' },
  refunded: { label: 'Refunded', tone: 'success' },
  partially_refunded: { label: 'Partly refunded', tone: 'success' },
  waived: { label: 'Free follow-up', tone: 'success' },
  unpaid: { label: 'Unpaid', tone: 'caution' },
}

function minutesUntil(a: Appointment): number | null {
  if (!a.startsAt) return null
  return Math.round((new Date(a.startsAt).getTime() - Date.now()) / 60_000)
}

/** Live: "6:30 PM" minus the server's free-cancellation window. */
function freeCancelUntil(a: Appointment): string {
  if (!LIVE || !a.startsAt) return cancellationDeadline(a.time)
  const d = new Date(new Date(a.startsAt).getTime() - careRules.freeCancelMinutes * 60_000 + 5.5 * 3_600_000)
  const h = d.getUTCHours()
  return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/* ============================================= 20 — Appointment list ====== */

export function AppointmentListScreen() {
  const nav = useNav()
  const appointments = useAppointments((s) => s.items)
  const [segment, setSegment] = React.useState('upcoming')
  const upcoming = upcomingOf(appointments)
  const completed = appointments.filter((a) => a.status === 'completed')
  const cancelled = appointments.filter((a) => a.status === 'cancelled')
  const open = (a: Appointment) => nav.navigate('appointment-detail', { params: { id: a.id } })
  const join = (a: Appointment) =>
    a.mode === 'clinic'
      ? showToast('Opening directions', 'info', a.location)
      : nav.navigate('waiting-room', { params: { id: a.id } })

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <P className="px-5 pb-3 pt-4 text-title-lg text-ink-900">Appointments</P>
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
              { id: 'completed', label: 'Completed', count: completed.length },
              { id: 'cancelled', label: 'Cancelled', count: cancelled.length },
            ]}
            value={segment}
            onChange={setSegment}
          />
        </Div>
      </Div>

      <Div className="gap-5 px-5 pb-[112px] pt-4">
        {segment === 'upcoming' && upcoming.length === 0 && (
          <StateBlock
            tone="brand"
            icon={<Clock className="h-[32px] w-[32px]" strokeWidth={1.8} />}
            title="No appointments yet"
            body="When you book a consultation it will appear here, with everything you need to join it."
            primary={<Button onClick={() => nav.navigate('doctor-search', { tab: 'doctors' })}>Find a doctor</Button>}
          />
        )}

        {segment === 'upcoming' && upcoming.length > 0 && (
          <Div>
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">
              {upcoming[0].date.startsWith('Today') ? 'Today' : 'Next up'}
            </P>
            <AppointmentCard appointment={upcoming[0]} variant="hero" onClick={() => open(upcoming[0])} onPrimary={() => join(upcoming[0])} />
          </Div>
        )}

        {segment === 'upcoming' && upcoming.length > 1 && (
          <Div>
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">Later this week</P>
            <Div className="gap-2.5">
              {upcoming.slice(1).map((a) => (
                <AppointmentCard key={a.id} appointment={a} onClick={() => open(a)} />
              ))}
            </Div>
          </Div>
        )}

        {segment !== 'cancelled' && completed.length > 0 && (
          <Div>
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">Past consultations</P>
            <Div className="gap-2.5">
              {completed.map((a) => (
                <AppointmentCard key={a.id} appointment={a} onClick={() => open(a)} />
              ))}
            </Div>
          </Div>
        )}

        {segment === 'cancelled' && (
          cancelled.length > 0 ? (
            <Div className="gap-2.5">
              {cancelled.map((a) => (
                <AppointmentCard key={a.id} appointment={a} onClick={() => open(a)} />
              ))}
            </Div>
          ) : (
            <StateBlock compact icon={<Clock className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="No cancelled appointments" />
          )
        )}

        <Btn
          onPress={() => nav.navigate('doctor-search', { tab: 'doctors' })}
          className="tap flex-row w-full items-center justify-center gap-2 rounded-card border border-dashed border-ink-200 bg-white/60 py-4 text-body font-semibold text-brand-600"
        >
          Book a new consultation
        </Btn>
      </Div>

      <BottomNav active="appointments" />
    </Screen>
  )
}

/* =========================================== 21 — Appointment details ===== */

function statusHeadline(a: Appointment): string {
  if (a.status === 'cancelled') return 'Appointment cancelled'
  if (a.status === 'completed') return 'Consultation completed'
  if (!LIVE) return a.id === 'a1' ? 'Starting in 28 minutes' : 'Scheduled'
  if (a.status === 'in-progress') return 'In progress'
  if (a.lateMinutes) return `The doctor is running ${a.lateMinutes} minutes late`
  const mins = minutesUntil(a)
  return mins !== null && mins > 0 && mins <= 120 ? `Starting in ${mins} minute${mins === 1 ? '' : 's'}` : 'Scheduled'
}

export function AppointmentDetailScreen() {
  const nav = useNav()
  const items = useAppointments((s) => s.items)
  const a = appointmentById(items, nav.params.id)
  const d = getDoctor(a.doctorId)
  const { Icon, verb } = MODE[a.mode]
  const total = a.fee + a.platformFee - a.discount
  const upcoming = isUpcoming(a)
  const payment = LIVE ? PAYMENT_LABEL[a.paymentStatus ?? ''] ?? { label: 'Paid', tone: 'success' as const } : null
  const canReschedule = LIVE ? Boolean(a.canReschedule) : upcoming
  const canCancel = LIVE ? Boolean(a.canCancel) : upcoming
  const rate = () => {
    useCall.getState().beginWaiting(a.id)
    nav.navigate('consult-complete')
  }
  const [confirmingCancel, setConfirmingCancel] = React.useState(false)
  const selectDoctor = useBooking((s) => s.selectDoctor)
  const startReschedule = useBooking((s) => s.startReschedule)
  const openDoctor = () => {
    selectDoctor(d.id)
    nav.navigate('doctor-profile')
  }
  const reschedule = () => {
    startReschedule(a.id, d.id, a.mode)
    nav.navigate('select-date')
  }
  const copyId = () => showToast('Booking ID copied', 'success', a.bookingId)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Appointment"
        subtitle={a.bookingId}
        right={
          <Btn
            onPress={() => nav.navigate('help')}
            className="tap px-2 text-body-sm font-semibold text-brand-600"
          >
            Help
          </Btn>
        }
      />

      <Div className="flex-1 gap-4 px-5 pb-[150px] pt-4">
        {/* Live status */}
        <Div className="flex-row items-center gap-3 rounded-card bg-brand-deep p-4 shadow-card">
          <Span className="relative flex-col h-[40px] w-[40px] shrink-0 items-center justify-center">
            <Span className="absolute inset-0 animate-pulseRing rounded-full bg-white/30" />
            <Span className="relative flex-col h-[40px] w-[40px] items-center justify-center rounded-full bg-white/15 ring-1 ring-inset  ring-white/25">
              <Clock className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </Span>
          </Span>
          <Div className="min-w-0 flex-1">
            <P className="text-title-sm text-white">{statusHeadline(a)}</P>
            <P className="mt-0.5 text-body-sm text-white/65">{a.date} · {a.time}</P>
          </Div>
        </Div>

        {/* Doctor */}
        <Card elevation="tile" padded={false}>
          <Btn
            onPress={openDoctor}
            className="tap flex-row w-full items-center gap-3.5 p-4 text-left"
          >
            <Avatar src={d.photo} name={d.name} size={54} radius={17} />
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-center gap-1">
                <P className="truncate text-title-sm text-ink-900">{d.name}</P>
                <VerifiedMark size={14} />
              </Div>
              <P className="truncate text-body-sm text-ink-500">{d.specialty}</P>
              <P className="mt-0.5 truncate text-caption text-ink-400">
                {d.hospital} · {d.locality}
              </P>
            </Div>
          </Btn>
          <Divider />
          <Div className=" grid-cols-2 divide-x divide-ink-100">
            <Btn
              onPress={() => showToast('Messaging opens once the consultation starts', 'info')}
              className="tap flex-row items-center justify-center gap-2 py-3 text-body-sm font-semibold text-brand-600"
            >
              <MessageSquare className="h-[15px] w-[15px]" strokeWidth={2.2} /> Message
            </Btn>
            <Btn
              onPress={openDoctor}
              className="tap flex-row items-center justify-center gap-2 py-3 text-body-sm font-semibold text-brand-600"
            >
              <FileText className="h-[15px] w-[15px]" strokeWidth={2.2} /> View profile
            </Btn>
          </Div>
        </Card>

        {/* Details */}
        <Card elevation="tile">
          <P className="mb-2 text-title-sm text-ink-900">Appointment details</P>
          <KeyValue label="Consultation type" value={verb} />
          <KeyValue label="Date" value={a.date} />
          <KeyValue label="Time" value={a.time} />
          <KeyValue label="Duration" value={`${consultMinutes(a.mode)} minutes`} />
          {a.location && <KeyValue label="Location" value={a.location} />}
          <KeyValue label="Patient" value={a.for} />
          <Divider className="my-2.5" />
          <Div className="flex-row items-center justify-between">
            <Span className="text-body text-ink-500">Booking ID</Span>
            <Btn onPress={copyId} className="tap flex-row items-center gap-1.5 text-body font-semibold tabular-nums text-ink-900">
              {a.bookingId}
              <Copy className="h-[13px] w-[13px] text-ink-400" strokeWidth={2.2} />
            </Btn>
          </Div>
        </Card>

        {/* Payment */}
        <Card elevation="tile">
          <Div className="mb-2 flex-row items-center justify-between">
            <P className="text-title-sm text-ink-900">Payment</P>
            {payment ? (
              <StatusBadge tone={payment.tone}>{payment.label}</StatusBadge>
            ) : (
              <StatusBadge tone="success">{a.status === 'cancelled' ? 'Refunded' : 'Paid'}</StatusBadge>
            )}
          </Div>
          <KeyValue label="Consultation fee" value={rupee(a.fee)} />
          <KeyValue label="Platform fee" value={rupee(a.platformFee)} />
          {a.discount > 0 && (
            <KeyValue label={a.discountLabel ?? 'Discount'} value={`− ${rupee(a.discount)}`} tone="success" />
          )}
          <Divider className="my-2.5" />
          <KeyValue label="Total paid" value={rupee(total)} strong />
          {LIVE && a.refundAmount !== undefined && a.status === 'cancelled' && (
            <KeyValue label="Refunded" value={rupee(a.refundAmount)} tone="success" />
          )}
          {LIVE && a.lateFee ? <KeyValue label="Late-cancellation fee" value={rupee(a.lateFee)} /> : null}
          {a.paidVia ? <P className="mt-2 text-caption text-ink-400">{a.paidVia}</P> : null}
          {/* Live: invoices need a file viewer, which the app doesn't have yet. */}
          {!LIVE && (
            <Btn
              onPress={() => showToast('Invoice saved to Files', 'success', `${a.bookingId}.pdf`)}
              className="tap mt-3 flex-row items-center gap-2 text-body-sm font-semibold text-brand-600"
            >
              <Receipt className="h-[15px] w-[15px]" strokeWidth={2.2} /> Download invoice
            </Btn>
          )}
        </Card>

        {canCancel && (
          <Banner
            tone="caution"
            icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title={`Free cancellation until ${freeCancelUntil(a)}`}
            body={`Cancelling after this time is charged at ${LIVE ? careRules.lateCancelFeePercent : 50}% of the consultation fee.`}
          />
        )}

        {/* Secondary actions */}
        {(canReschedule || canCancel) && (
          <Div className=" grid-cols-2 gap-2.5">
            {canReschedule && (
              <Button variant="tertiary" onClick={reschedule} icon={<CalendarClock className="h-[16px] w-[16px]" strokeWidth={2.2} />}>
                Reschedule
              </Button>
            )}
            {canCancel && (
              <Button
                variant="tertiary"
                className="!text-critical-600"
                onClick={() => setConfirmingCancel(true)}
                icon={<XCircle className="h-[16px] w-[16px]" strokeWidth={2.2} />}
              >
                Cancel
              </Button>
            )}
          </Div>
        )}

        {LIVE && a.status === 'completed' && a.canGiveFeedback && (
          <Button variant="tertiary" onClick={rate}>
            Rate this consultation
          </Button>
        )}
      </Div>

      {upcoming && a.mode !== 'clinic' && (
        <StickyBar>
          <Button onClick={() => nav.navigate('waiting-room', { params: { id: a.id } })} icon={<Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />}>
            Join Waiting Room
          </Button>
        </StickyBar>
      )}
      {upcoming && a.mode === 'clinic' && (
        <StickyBar>
          <Button onClick={() => showToast('Opening directions', 'info', a.location)} icon={<Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />}>
            Get directions
          </Button>
        </StickyBar>
      )}
      {!upcoming && (
        <StickyBar>
          {LIVE ? (
            <Button
              onClick={() =>
                a.prescriptionCode ? nav.navigate('prescription', { params: { rxId: a.prescriptionCode } }) : openDoctor()
              }
            >
              {a.prescriptionCode ? 'View Prescription' : 'Book again'}
            </Button>
          ) : (
            <Button
              onClick={() => (a.status === 'completed' ? nav.navigate('prescription') : openDoctor())}
            >
              {a.status === 'completed' ? 'View Prescription' : 'Book again'}
            </Button>
          )}
        </StickyBar>
      )}

      {confirmingCancel && <CancelAppointmentModal appointment={a} onClose={() => setConfirmingCancel(false)} />}
    </Screen>
  )
}
