import { Btn, Div, Img, P, Span } from '../primitives/index'
import React from 'react'
import {
  Video,
  Phone,
  Building2,
  ChevronRight,
  MapPin,
  Clock,
  FlaskConical,
  FileText,
  Pill,
  CalendarDays,
  ShieldCheck,
  Home,
  Briefcase,
  CircleDot,
  CreditCard,
  Smartphone,
  Bell,
  Sparkles,
} from '../primitives/icons'
import { Avatar, Card, MetaChip, Rating, StatusBadge, Stepper, VerifiedMark } from '../ui/Display'
import { Button } from '../ui/Button'
import { rupee } from '../../mock-data/mock'
import type { Appointment, ConsultMode, Doctor, Lab, LabTest, Medicine, NotificationItem, PaymentMethod } from '../../types'
import { getDoctor } from '../../store/catalog'
import { useListQty } from '../../store/cart'
import { usePricing } from '../../hooks/usePricing'
import { PlusTag } from '../ui/Membership'
import { plural } from '../../domain/plural'

/* ------------------------------------------------------------- Mode tokens */

export const MODE = {
  video: { label: 'Video', Icon: Video, verb: 'Video consultation' },
  audio: { label: 'Audio', Icon: Phone, verb: 'Audio consultation' },
  clinic: { label: 'In-person', Icon: Building2, verb: 'In-person consultation' },
} as const

export function ModeIcon({ mode, size = 15 }: { mode: ConsultMode; size?: number }) {
  const Icon = MODE[mode].Icon
  return <Icon style={{ width: size, height: size }} strokeWidth={2.2} />
}

/* ------------------------------------------------------------- DoctorCard */

export function DoctorCard({
  doctor,
  onView,
  onBook,
  compact = false,
}: {
  doctor: Doctor
  onView?: () => void
  onBook?: () => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <Btn
        onPress={onView}
        className="tap w-[228px] shrink-0 rounded-card bg-white p-3.5 text-left shadow-tile"
      >
        <Div className="flex-row items-start gap-3">
          <Avatar src={doctor.photo} name={doctor.name} size={52} radius={16} />
          <Div className="min-w-0 flex-1">
            <Div className="flex-row items-center gap-1">
              <P className="truncate text-title-sm text-ink-900">{doctor.name}</P>
              <VerifiedMark size={14} />
            </Div>
            <P className="truncate text-body-sm text-ink-500">{doctor.specialty}</P>
            <Div className="mt-1 flex-row items-center gap-2">
              <Rating value={doctor.rating} size={12} />
              <Span className="text-caption text-ink-300">·</Span>
              <Span className="text-caption text-ink-400">{doctor.experience} yrs</Span>
            </Div>
          </Div>
        </Div>
        <Div className="mt-3 flex-row items-center justify-between border-t border-ink-100 pt-2.5">
          <Span className="text-body-sm font-bold text-ink-900">{rupee(doctor.fees.video)}</Span>
          <Span className={`text-caption font-semibold ${doctor.availableToday ? 'text-vital-600' : 'text-ink-400'}`}>
            {doctor.availableToday ? 'Available today' : doctor.nextSlot}
          </Span>
        </Div>
      </Btn>
    )
  }

  return (
    <Card elevation="tile" className="p-4">
      <Btn onPress={onView} className="tap flex-row w-full gap-3.5 text-left">
        <Avatar src={doctor.photo} name={doctor.name} size={64} radius={18} />
        <Div className="min-w-0 flex-1">
          <Div className="flex-row items-center gap-1.5">
            <P className="truncate text-title-sm text-ink-900">{doctor.name}</P>
            <VerifiedMark />
          </Div>
          <P className="mt-[1px] truncate text-body-sm font-medium text-brand-600">{doctor.specialty}</P>
          <P className="mt-[2px] truncate text-caption text-ink-400">{doctor.qualification}</P>
          <Div className="mt-1.5 flex-row items-center gap-2.5">
            <Rating value={doctor.rating} count={doctor.reviews} size={12} />
          </Div>
        </Div>
      </Btn>

      <Div className="mt-3 flex-row flex-wrap gap-1.5">
        <MetaChip>{`${doctor.experience} yrs exp`}</MetaChip>
        <MetaChip>{doctor.languages.slice(0, 2).join(', ')}</MetaChip>
        {/* Distance only when it's known (the live server has no patient location yet). */}
        {doctor.distanceKm ? (
          <MetaChip>
            <MapPin className="h-[11px] w-[11px]" /> {`${doctor.distanceKm} km`}
          </MetaChip>
        ) : null}
      </Div>

      <Div className="mt-3 flex-row items-center gap-1.5 rounded-chip bg-ink-50 px-3 py-2">
        {(['video', 'audio', 'clinic'] as ConsultMode[]).map((m, i) => (
          <React.Fragment key={m}>
            {i > 0 && <Span className="h-[14px] w-px bg-ink-200" />}
            <Span className="flex-row flex-1 items-center justify-center gap-1.5 text-caption text-ink-500">
              <ModeIcon mode={m} size={13} />
              <Span className="font-semibold text-ink-800">{rupee(doctor.fees[m])}</Span>
            </Span>
          </React.Fragment>
        ))}
      </Div>

      <Div className="mt-3.5 flex-row items-center justify-between gap-3 border-t border-ink-100 pt-3.5">
        <Div className="min-w-0">
          <P className="text-caption text-ink-400">Next available</P>
          <P
            className={`truncate text-body-sm font-bold ${
              doctor.availableToday ? 'text-vital-700' : 'text-ink-800'
            }`}
          >
            {doctor.nextSlot}
          </P>
        </Div>
        <Button size="sm" block={false} onClick={onBook} className="px-4">
          Book
        </Button>
      </Div>
    </Card>
  )
}

/* ---------------------------------------------------------- AppointmentCard */

export function AppointmentCard({
  appointment,
  onClick,
  onPrimary,
  variant = 'list',
}: {
  appointment: Appointment
  onClick?: () => void
  onPrimary?: () => void
  variant?: 'list' | 'hero'
}) {
  const d = getDoctor(appointment.doctorId)
  const { Icon, verb } = MODE[appointment.mode]
  const statusTone =
    appointment.status === 'completed'
      ? 'success'
      : appointment.status === 'cancelled'
        ? 'critical'
        : appointment.status === 'in-progress'
          ? 'brand'
          : 'brand'

  /* Hero variant — the upcoming-appointment card on Home. Deep brand surface
     so it reads as the single most important thing on the screen. */
  if (variant === 'hero') {
    return (
      <Div className="overflow-hidden rounded-card bg-brand-deep shadow-lift">
        <Div className="flex-row items-center gap-2 px-4 pb-3 pt-3.5">
          <Span className="flex-row items-center gap-1.5 rounded-[7px] bg-white/15 px-2 py-[3px] text-micro font-semibold uppercase tracking-[.05em] text-white">
            <Span className={`h-[5px] w-[5px] rounded-full ${appointment.status === 'in-progress' ? 'bg-caution-500' : 'bg-vital-500'}`} />
            {/* A consultation the doctor has started reads "In progress", not "Upcoming" hours later. */}
            {appointment.status === 'in-progress' ? 'In progress' : 'Upcoming'}
          </Span>
          <Span className="text-caption text-white/55">{appointment.bookingId}</Span>
          <Span className="ml-auto flex-row items-center gap-1 text-caption font-semibold text-white/85">
            <Icon className="h-[13px] w-[13px]" strokeWidth={2.3} />
            {MODE[appointment.mode].label}
          </Span>
        </Div>

        <Div className="flex-row items-center gap-3.5 px-4 pb-4">
          <Avatar src={d.photo} name={d.name} size={56} radius={17} ring />
          <Div className="min-w-0 flex-1">
            <P className="truncate text-title-sm text-white">{d.name}</P>
            <P className="truncate text-body-sm text-white/65">
              {d.specialty} · {d.hospital}
            </P>
          </Div>
        </Div>

        <Div className="mx-4 mb-4 flex-row items-center gap-3 rounded-tile bg-white/10 px-3.5 py-2.5 ">
          <CalendarDays className="h-[17px] w-[17px] shrink-0 text-white/75" strokeWidth={2.1} />
          <Span className="text-body-sm font-semibold text-white">{appointment.date}</Span>
          <Span className="h-[12px] w-px bg-white/25" />
          <Clock className="h-[16px] w-[16px] shrink-0 text-white/75" strokeWidth={2.1} />
          <Span className="text-body-sm font-semibold text-white">{appointment.time}</Span>
        </Div>

        <Div className="flex-row gap-2.5 border-t border-white/12 p-3.5">
          <Btn
            onPress={onClick}
            className="tap h-[44px] flex-1 rounded-ctl bg-white/14 text-body font-semibold text-white ring-1 ring-inset  ring-white/20"
          >
            Details
          </Btn>
          <Btn
            onPress={onPrimary}
            className="tap h-[44px] flex-[1.35] rounded-ctl bg-white text-body font-bold text-brand-700"
          >
            {appointment.mode === 'clinic' ? 'Get directions' : 'Join waiting room'}
          </Btn>
        </Div>
      </Div>
    )
  }

  return (
    <Card onClick={onClick} elevation="tile" className="p-4">
      <Div className="flex-row items-center justify-between gap-3">
        <StatusBadge tone={statusTone as any} dot>
          {appointment.status === 'in-progress' ? 'In progress' : appointment.status}
        </StatusBadge>
        <Span className="text-caption tabular-nums text-ink-400">{appointment.bookingId}</Span>
      </Div>

      <Div className="mt-3 flex-row items-center gap-3.5">
        <Avatar src={d.photo} name={d.name} size={52} radius={16} />
        <Div className="min-w-0 flex-1">
          <P className="truncate text-title-sm text-ink-900">{d.name}</P>
          <P className="truncate text-body-sm text-ink-500">{d.specialty}</P>
          <P className="mt-[2px] flex-row items-center gap-1.5 text-caption text-ink-400">
            <Icon className="h-[12px] w-[12px]" strokeWidth={2.2} /> {verb}
            {appointment.for !== 'Aarav Sharma' && <Span>· for {appointment.for.split(' (')[0]}</Span>}
          </P>
        </Div>
      </Div>

      <Div className="mt-3 flex-row items-center gap-2 rounded-chip bg-ink-50 px-3 py-2">
        <CalendarDays className="h-[15px] w-[15px] shrink-0 text-ink-400" strokeWidth={2.1} />
        <Span className="text-body-sm font-semibold text-ink-800">{appointment.date}</Span>
        <Span className="h-[11px] w-px bg-ink-200" />
        <Span className="text-body-sm font-semibold text-ink-800">{appointment.time}</Span>
        <ChevronRight className="ml-auto h-[16px] w-[16px] text-ink-300" />
      </Div>

      {appointment.reason && <P className="mt-2.5 text-caption text-critical-600">{appointment.reason}</P>}
    </Card>
  )
}

/* --------------------------------------------------------- PrescriptionCard */

export function PrescriptionCard({
  rx,
  onClick,
}: {
  rx: { doctorId: string; date: string; specialty: string; items: number; status: 'active' | 'completed'; rxId: string }
  onClick?: () => void
}) {
  const d = getDoctor(rx.doctorId)
  return (
    <Card onClick={onClick} elevation="tile" className="p-4">
      <Div className="flex-row items-start gap-3.5">
        <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
          <FileText className="h-[20px] w-[20px] text-brand-600" strokeWidth={2} />
        </Span>
        <Div className="min-w-0 flex-1">
          <Div className="flex-row items-start justify-between gap-2">
            <P className="truncate text-title-sm text-ink-900">{d.name}</P>
            <StatusBadge tone={rx.status === 'active' ? 'success' : 'neutral'}>{rx.status}</StatusBadge>
          </Div>
          <P className="truncate text-body-sm text-ink-500">{rx.specialty}</P>
          <P className="mt-1.5 text-caption text-ink-400">
            {rx.date} · {plural(rx.items, 'medicine')} · {rx.rxId}
          </P>
        </Div>
      </Div>
    </Card>
  )
}

/* ------------------------------------------------------------ MedicineCard */

export function MedicineCard({
  medicine,
  qty,
  onAdd,
  onQty,
  onClick,
}: {
  medicine: Medicine
  qty?: number
  onAdd?: () => void
  onQty?: (n: number) => void
  onClick?: () => void
}) {
  const off = Math.round(((medicine.mrp - medicine.price) / medicine.mrp) * 100)
  const { memberPrice } = usePricing()
  const listQty = useListQty(medicine.id)
  const shownQty = qty ?? listQty
  return (
    <Div className="flex-row gap-3.5 rounded-card bg-white p-3.5 shadow-tile">
      <Btn onPress={onClick} className="tap shrink-0">
        <Img
          src={medicine.photo}
          alt=""
          className="h-[66px] w-[66px] rounded-tile bg-ink-50 object-cover"
        />
      </Btn>
      <Div className="min-w-0 flex-1">
        <Btn onPress={onClick} className="block w-full text-left">
          <Div className="flex-row items-start gap-2">
            <P className="min-w-0 flex-1 truncate text-title-sm text-ink-900">{medicine.name}</P>
            {medicine.rx && (
              <Span className="mt-[2px] shrink-0 rounded-[6px] bg-critical-50 px-1.5 py-[2px] text-[9.5px] font-bold uppercase tracking-wide text-critical-600">
                Rx
              </Span>
            )}
          </Div>
          <P className="truncate text-body-sm text-ink-500">{medicine.generic}</P>
          <P className="mt-[2px] truncate text-caption text-ink-400">
            {medicine.brand} · {medicine.pack}
          </P>
        </Btn>

        <Div className="mt-2.5 flex-row items-center justify-between gap-2">
          <Div className="flex-row items-baseline gap-1.5">
            <Span className="text-title-sm text-ink-900">{rupee(memberPrice(medicine.price, 'pharmacy'))}</Span>
            {memberPrice(medicine.price, 'pharmacy') !== medicine.price ? (
              <>
                <Span className="text-caption text-ink-300 line-through">{rupee(medicine.price)}</Span>
                <PlusTag size="xs" />
              </>
            ) : (
              off > 0 && (
                <>
                  <Span className="text-caption text-ink-300 line-through">{rupee(medicine.mrp)}</Span>
                  <Span className="text-caption font-bold text-vital-600">{off}% off</Span>
                </>
              )
            )}
          </Div>
          {!medicine.inStock ? (
            <Span className="text-caption font-semibold text-critical-600">Out of stock</Span>
          ) : shownQty ? (
            <Stepper value={shownQty} onChange={onQty} min={0} />
          ) : (
            <Button size="sm" variant="secondary" block={false} onClick={onAdd} className="px-4">
              Add
            </Button>
          )}
        </Div>
      </Div>
    </Div>
  )
}

/* ------------------------------------------------------------- LabTestCard */

export function TestCard({ test, onClick, onBook }: { test: LabTest; onClick?: () => void; onBook?: () => void }) {
  const off = Math.round(((test.mrp - test.price) / test.mrp) * 100)
  const { memberPrice } = usePricing()
  return (
    <Card elevation="tile" className="p-4">
      <Btn onPress={onClick} className="tap w-full text-left">
        <Div className="flex-row items-start gap-3">
          <Span className="flex-col h-[42px] w-[42px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
            <FlaskConical className="h-[19px] w-[19px] text-brand-600" strokeWidth={2} />
          </Span>
          <Div className="min-w-0 flex-1">
            <P className="text-title-sm leading-[21px] text-ink-900">{test.name}</P>
            <P className="mt-0.5 text-body-sm text-ink-500">
              {test.parameters} parameters · Report in {test.reportIn}
            </P>
          </Div>
        </Div>
        <Div className="mt-3 flex-row flex-wrap gap-1.5">
          <MetaChip>Fasting: {test.fasting}</MetaChip>
          {test.homeCollection && (
            <MetaChip className="!bg-vital-50 !text-vital-700">
              <Home className="h-[11px] w-[11px]" /> Home collection
            </MetaChip>
          )}
        </Div>
      </Btn>
      <Div className="mt-3.5 flex-row items-center justify-between border-t border-ink-100 pt-3.5">
        <Div className="flex-row items-baseline gap-1.5">
          <Span className="text-title-sm text-ink-900">{rupee(memberPrice(test.price, 'diagnostics'))}</Span>
          {memberPrice(test.price, 'diagnostics') !== test.price ? (
            <>
              <Span className="text-caption text-ink-300 line-through">{rupee(test.price)}</Span>
              <PlusTag size="xs" />
            </>
          ) : (
            <>
              <Span className="text-caption text-ink-300 line-through">{rupee(test.mrp)}</Span>
              <Span className="text-caption font-bold text-vital-600">{off}% off</Span>
            </>
          )}
        </Div>
        <Button size="sm" block={false} onClick={onBook} className="px-4">
          Book test
        </Button>
      </Div>
    </Card>
  )
}

/* ----------------------------------------------------------------- LabCard */

export function LabCard({
  lab,
  selected,
  onClick,
  price,
}: {
  lab: Lab
  selected?: boolean
  onClick?: () => void
  /** Price of the chosen test at this lab; defaults to the lab's listed rate. */
  price?: number
}) {
  return (
    <Btn
      onPress={onClick}
      className={`tap w-full rounded-card bg-white p-4 text-left  ${
        selected ? 'ring-[1.5px] ring-inset  ring-brand-600' : 'shadow-tile'
      }`}
    >
      <Div className="flex-row items-start gap-3.5">
        <Img src={lab.photo} alt="" className="h-[52px] w-[52px] shrink-0 rounded-tile object-cover" />
        <Div className="min-w-0 flex-1">
          <Div className="flex-row items-center gap-1.5">
            <P className="truncate text-title-sm text-ink-900">{lab.name}</P>
            {lab.nabl && <ShieldCheck className="h-[14px] w-[14px] shrink-0 text-vital-600" strokeWidth={2.3} />}
          </Div>
          <Div className="mt-0.5 flex-row items-center gap-2">
            <Rating value={lab.rating} count={lab.reviews} size={12} />
          </Div>
          <P className="mt-[3px] flex-row items-center gap-1 text-caption text-ink-400">
            <MapPin className="h-[11px] w-[11px]" /> {lab.locality}{lab.distanceKm ? ` · ${lab.distanceKm} km` : ''}
          </P>
        </Div>
        <Div className="shrink-0 text-right">
          <P className="text-title-sm text-ink-900">{rupee(price ?? lab.price)}</P>
          {/* Live labs carry their report time instead of a slot count (slots are shared across labs). */}
          <P className="mt-0.5 text-caption font-semibold text-vital-600">
            {lab.testPrices && lab.reportHours ? `Report in ${lab.reportHours} h` : plural(lab.slots, 'slot')}
          </P>
        </Div>
      </Div>
      {lab.homeCollection && (
        <Div className="mt-3 flex-row items-center gap-1.5 border-t border-ink-100 pt-2.5 text-caption font-medium text-vital-700">
          <Home className="h-[12px] w-[12px]" strokeWidth={2.3} /> Free home sample collection available
        </Div>
      )}
    </Btn>
  )
}

/* -------------------------------------------------------- NotificationCard */

const NOTI_ICON = {
  Appointments: CalendarDays,
  Prescriptions: FileText,
  Diagnostics: FlaskConical,
  Pharmacy: Pill,
  Payments: CreditCard,
  System: Bell,
} as const

export function NotificationCard({
  n,
  onAction,
  onPress,
}: {
  n: NotificationItem
  onAction?: () => void
  onPress?: () => void
}) {
  const Icon = NOTI_ICON[n.category]
  return (
    <Div onPress={onPress} className={`flex-row gap-3.5 rounded-card p-3.5 ${n.unread ? 'bg-brand-50/70' : 'bg-white'} shadow-tile`}>
      <Span
        className={`flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile ${
          n.unread ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-500'
        }`}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />
      </Span>
      <Div className="min-w-0 flex-1">
        <Div className="flex-row items-start justify-between gap-3">
          <P className="text-body-lg font-semibold leading-[21px] text-ink-900">{n.title}</P>
          <Span className="shrink-0 pt-[3px] text-caption text-ink-400">{n.time}</Span>
        </Div>
        <P className="mt-0.5 text-body-sm leading-[19px] text-ink-500">{n.body}</P>
        {n.action && (
          <Btn onPress={onAction} className="text-left tap mt-2 text-body-sm font-bold text-brand-600">
            {n.action} →
          </Btn>
        )}
      </Div>
      {n.unread && <Span className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-brand-600" />}
    </Div>
  )
}

/* ------------------------------------------------------------- AddressCard */

export function AddressCard({
  a,
  selected,
  onClick,
  onEdit,
}: {
  a: { label: 'Home' | 'Office' | 'Other'; line: string; area: string; phone: string; isDefault?: boolean }
  selected?: boolean
  onClick?: () => void
  onEdit?: () => void
}) {
  const Icon = a.label === 'Home' ? Home : a.label === 'Office' ? Briefcase : CircleDot
  return (
    <Btn
      onPress={onClick}
      className={`tap w-full rounded-card bg-white p-4 text-left  ${
        selected ? 'ring-[1.5px] ring-inset  ring-brand-600' : 'shadow-tile'
      }`}
    >
      <Div className="flex-row items-start gap-3.5">
        <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
          <Icon className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
        </Span>
        <Div className="min-w-0 flex-1">
          <Div className="flex-row items-center gap-2">
            <P className="text-title-sm text-ink-900">{a.label}</P>
            {a.isDefault && <StatusBadge tone="brand">Default</StatusBadge>}
          </Div>
          <P className="mt-1 text-body-sm leading-[19px] text-ink-500">
            {a.line}, {a.area}
          </P>
          <P className="mt-1.5 text-caption text-ink-400">{a.phone}</P>
        </Div>
        {onEdit && (
          <Span
            onPress={(e: any) => {
              e.stopPropagation()
              onEdit()
            }}
            className="shrink-0 text-body-sm font-semibold text-brand-600"
          >
            Edit
          </Span>
        )}
      </Div>
    </Btn>
  )
}

/* ------------------------------------------------------------- PaymentRow */

export function PaymentRow({
  p,
  onClick,
}: {
  p: { type: string; title: string; date: string; amount: number; status: 'paid' | 'refunded' | 'failed'; method: string }
  onClick?: () => void
}) {
  const Icon = p.type === 'Pharmacy' ? Pill : p.type === 'Diagnostics' ? FlaskConical : p.type === 'Membership' ? Sparkles : Video
  return (
    <Btn onPress={onClick} className="tap flex-row w-full items-center gap-3.5 bg-white px-4 py-3.5 text-left border-b-[0.5px] border-ink-900/10">
      <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile bg-ink-50">
        <Icon className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.1} />
      </Span>
      <Div className="min-w-0 flex-1">
        <P className="truncate text-body-lg font-semibold text-ink-900">{p.title}</P>
        <P className="truncate text-caption text-ink-400">
          {p.date} · {p.method}
        </P>
      </Div>
      <Div className="shrink-0 text-right">
        <P className={`text-body-lg font-bold ${p.status === 'refunded' ? 'text-ink-400' : 'text-ink-900'}`}>
          {rupee(p.amount)}
        </P>
        <P
          className={`text-caption font-semibold capitalize ${
            p.status === 'paid' ? 'text-vital-600' : p.status === 'refunded' ? 'text-ink-400' : 'text-critical-600'
          }`}
        >
          {p.status}
        </P>
      </Div>
    </Btn>
  )
}

/* ---------------------------------------------------------- PaymentMethodRow */

export function PaymentMethodRow({
  pm,
  selected,
  onClick,
}: {
  pm: PaymentMethod
  selected?: boolean
  onClick?: () => void
}) {
  const Icon = pm.kind === 'upi' ? Smartphone : CreditCard
  return (
    <Btn
      onPress={onClick}
      className={`tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-3.5 text-left  ${
        selected ? 'ring-[1.5px] ring-inset  ring-brand-600' : 'ring-1 ring-inset  ring-ink-100'
      }`}
    >
      <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
        <Icon className="h-[17px] w-[17px] text-ink-600" strokeWidth={2.1} />
      </Span>
      <Div className="min-w-0 flex-1">
        <P className="truncate text-body-lg font-semibold text-ink-900">{pm.label}</P>
        <P className="truncate text-caption text-ink-400">{pm.sub}</P>
      </Div>
      <Span
        className={`flex-col h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full ${
          selected ? 'bg-brand-600' : 'ring-1 ring-inset  ring-ink-300'
        }`}
      >
        {selected && <Span className="h-[7px] w-[7px] rounded-full bg-white" />}
      </Span>
    </Btn>
  )
}
