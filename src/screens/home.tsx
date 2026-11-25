import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Bell,
  Video,
  Phone,
  Building2,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  ChevronRight,
  Sparkles,
  Activity,
  Droplet,
  HeartPulse,
  ArrowUpRight,
  Clock,
  Home as HomeIcon,
} from '../components/primitives/icons'
import { Screen } from '../components/ui/Screen'
import { Deferred } from '../components/ui/Deferred'
import { Logo } from '../components/ui/Logo'
import { SearchInput } from '../components/ui/Inputs'
import { Avatar, Card, SectionHeader, StatusBadge, MetaChip } from '../components/ui/Display'
import { BottomNav, HScroll } from '../components/ui/Nav'
import { AppointmentCard, DoctorCard } from '../components/cards/index'
import { rupee } from '../mock-data/mock'
import { planById } from '../mock-data/membership'
import { useNav } from '../navigation/navigation'
import { getDoctor, getLab, getTest, useCatalog } from '../store/catalog'
import { upcomingOf, useAppointments } from '../store/appointments'
import { useProfile } from '../store/profile'
import { diagnosticOrderById, useOrders } from '../store/orders'
import { membershipEntryScreen, totalSaved, useMembership } from '../store/membership'
import { useUnreadCount } from '../store/notifications'
import { useBooking } from '../store/booking'
import { useDiscovery } from '../store/discovery'
import { orderPrescription } from '../flows/prescriptions'
import { showToast } from '../store/toast'
import { StateBlock } from '../components/ui/Feedback'
import { LIVE } from '../services/config'

/** "Good morning / afternoon / evening" by the phone's clock (it said "Good morning" all day). */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours()
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/* -------------------------------------------------- Consultation launcher */

const SERVICES = [
  {
    id: 'video' as const,
    label: 'Video',
    sub: 'Face to face',
    Icon: Video,
    accent: 'bg-brand-600',
    tint: 'bg-brand-50',
    text: 'text-brand-700',
    tag: 'Popular',
  },
  { id: 'audio' as const, label: 'Audio', sub: 'Voice call', Icon: Phone, accent: 'bg-vital-600', tint: 'bg-vital-50', text: 'text-vital-700' },
  { id: 'clinic' as const, label: 'In-person', sub: 'Visit clinic', Icon: Building2, accent: 'bg-ink-700', tint: 'bg-ink-50', text: 'text-ink-700' },
]

const QUICK = [
  { label: 'Doctors', sub: LIVE ? 'Verified doctors' : '540+ verified', Icon: Stethoscope, screen: 'doctor-search' },
  { label: 'Medicines', sub: 'Delivered today', Icon: Pill, screen: 'pharmacy' },
  { label: 'Lab Tests', sub: 'Home collection', Icon: FlaskConical, screen: 'diagnostics' },
  { label: 'Records', sub: 'All in one place', Icon: FileText, screen: 'records' },
]

export function HomeScreen() {
  const nav = useNav()
  const appointments = useAppointments((s) => s.items)
  const upcoming = upcomingOf(appointments)[0]
  const prescription = useCatalog((s) => s.prescription)
  const doctors = useCatalog((s) => s.doctors)
  const rxDoctor = getDoctor(prescription.doctorId)
  const rxActive = useCatalog((s) => s.prescriptionHistory.find((p) => p.rxId === s.prescription.id)?.status === 'active')
  const patient = useProfile((s) => s.profile)
  const unread = useUnreadCount()
  const diagnostics = useOrders((s) => s.diagnostics)
  /* Live: the patient's next active lab booking, if any. */
  const nextTest = LIVE ? diagnostics.find((o) => o.status === 'active') : diagnosticOrderById(diagnostics, undefined)
  const membership = useMembership()
  const plan = planById(membership.planId)
  const saved = totalSaved(membership.ledger)
  const active = membership.status === 'active'
  const openDoctor = (id: string) => {
    useBooking.getState().selectDoctor(id)
    nav.navigate('doctor-profile')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="pb-[112px]">
        {/* ---------------------------------------------------------- Header */}
        <Div className="bg-clinical pb-5">
          <Div className="flex-row items-center gap-3 px-5 pt-2">
            <Btn onPress={() => nav.navigate('profile', { tab: 'profile' })} className="tap">
              <Avatar src={patient.photo} name={patient.name} size={44} radius={15} />
            </Btn>
            <Div className="min-w-0 flex-1">
              <P className="text-caption font-medium text-ink-400">{greeting()}</P>
              <P className="truncate text-title-sm text-ink-900">{patient.name}</P>
            </Div>
            <Logo variant="wordmark" width={62} className="opacity-90" />
            <Btn
              onPress={() => nav.navigate('notifications')}
              className="tap relative flex-col h-[42px] w-[42px] items-center justify-center rounded-full bg-white shadow-tile"
            >
              <Bell className="h-[19px] w-[19px] text-ink-700" strokeWidth={2} />
              {unread > 0 && (
                <Span className="absolute right-[10px] top-[10px] h-[8px] w-[8px] rounded-full bg-critical-600 ring-2 ring-white" />
              )}
            </Btn>
          </Div>

          <Div className="mt-4 px-5">
            <SearchInput
              placeholder="Search doctors, specialties, tests…"
              readOnly
              onClick={() => nav.navigate('doctor-search', { tab: 'doctors' })}
              className="!bg-white shadow-tile"
            />
          </Div>
        </Div>

        {/* ------------------------------------------ Consultation launcher */}
        <Div className="-mt-1 px-5">
          <P className="text-title-md text-ink-900">How can we help you today?</P>
          <P className="mt-1 text-body-sm text-ink-500">Choose how you would like to consult a doctor.</P>

          <Div className="mt-3.5  grid-cols-3 gap-2.5">
            {SERVICES.map((s) => (
              <Btn
                key={s.id}
                onPress={() => {
                  useBooking.getState().setMode(s.id)
                  nav.navigate('doctor-search', { tab: 'doctors' })
                }}
                className="tap relative  flex-col items-start rounded-card bg-white p-3.5 shadow-tile"
              >
                {s.tag && (
                  <Span className="absolute -top-[6px] left-1/2 -translate-x-1/2 rounded-[6px] bg-ink-900 px-2 py-[2.5px] text-[9px] font-bold uppercase tracking-[.05em] text-white">
                    {s.tag}
                  </Span>
                )}
                <Span className={`flex-col h-[38px] w-[38px] items-center justify-center rounded-tile ${s.tint}`}>
                  <s.Icon className={`h-[18px] w-[18px] ${s.text}`} strokeWidth={2.1} />
                </Span>
                <P className="mt-2.5 text-body-sm font-bold leading-[17px] text-ink-900">{s.label}</P>
                <P className="mt-[2px] text-[11px] leading-[14px] text-ink-400">{s.sub}</P>
              </Btn>
            ))}
          </Div>
        </Div>

        {/* ------------------------------------------------------ Membership */}
        {/* A member's entry point reports what the plan has returned; it is a
            statement of value, not an advertisement. */}
        <Div className="mt-6 px-5">
          <Btn
            onPress={() => nav.navigate(membershipEntryScreen(membership.status))}
            className="tap relative w-full overflow-hidden rounded-card bg-ink-900 p-4 text-left shadow-card"
          >
            <Span className="pointer-events-none absolute -right-10 -top-10 h-[140px] w-[140px] rounded-full bg-gold-500/15 blur-2xl" />
            <Span className="relative flex-row items-center gap-3">
              <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-gold-500">
                <Sparkles className="h-[18px] w-[18px] text-white" strokeWidth={2.4} />
              </Span>
              <Span className="min-w-0 flex-1">
                <Span className="flex-row items-center gap-2">
                  <Span className="text-body-lg font-bold text-white">KDC+ Plus</Span>
                  <Span className="rounded-[5px] bg-white/15 px-1.5 py-[1px] text-[9.5px] font-bold uppercase tracking-[.08em] text-white/80">
                    {active ? 'Active' : `${plan.discount}% off`}
                  </Span>
                </Span>
                <Span className="mt-0.5 block text-caption leading-[16px] text-white/60">
                  {active
                    ? `${rupee(saved)} saved so far · ${plan.discount}% off every bill`
                    : 'Save on every consultation, medicine and test'}
                </Span>
              </Span>
              <ChevronRight className="h-[17px] w-[17px] shrink-0 text-white/40" strokeWidth={2.4} />
            </Span>
          </Btn>
        </Div>

        {/* -------------------------------------------- Upcoming appointment */}
        <Div className="mt-6 px-5">
          <SectionHeader
            title="Your next appointment"
            action="All"
            onAction={() => nav.navigate('appointments', { tab: 'appointments' })}
            className="!px-0 pb-3"
          />
          {upcoming ? (
            <AppointmentCard
              appointment={upcoming}
              variant="hero"
              onClick={() => nav.navigate('appointment-detail', { params: { id: upcoming.id } })}
              onPrimary={() =>
                upcoming.mode === 'clinic'
                  ? showToast('Opening directions', 'info', upcoming.location)
                  : nav.navigate('waiting-room', { params: { id: upcoming.id } })
              }
            />
          ) : (
            <StateBlock compact tone="brand" icon={<Clock className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="No upcoming appointments" />
          )}
        </Div>

        {/* ----------------------------------------------------- Quick grid */}
        <Div className="mt-6 px-5">
          <Div className=" grid-cols-4 gap-2.5">
            {QUICK.map((q) => (
              <Btn
                key={q.label}
                onPress={() => nav.navigate(q.screen)}
                className="tap  flex-col items-center gap-2 rounded-card bg-white px-1.5 py-3.5 shadow-tile"
              >
                <Span className="flex-col h-[40px] w-[40px] items-center justify-center rounded-tile bg-brand-50">
                  <q.Icon className="h-[19px] w-[19px] text-brand-600" strokeWidth={2} />
                </Span>
                <Span className="text-center text-[11.5px] font-bold leading-[14px] text-ink-900">{q.label}</Span>
              </Btn>
            ))}
          </Div>
        </Div>

        {/* Below the first screen: drawn right after it (src/components/ui/Deferred). */}
        <Deferred minHeight={900}>
        {/* ------------------------------------------------- Health snapshot */}
        {/* Live: hidden. These are the blueprint's sample readings; the app has no source for real ones yet. */}
        {!LIVE && <Div className="mt-7">
          <SectionHeader
            title="Recent health activity"
            action="Timeline"
            onAction={() => nav.navigate('health-timeline')}
            className="pb-3"
          />
          <Div className="px-5">
            <Card elevation="tile" padded={false} className="overflow-hidden">
              <Div className=" grid-cols-3 divide-x divide-ink-100">
                <Vital Icon={HeartPulse} label="Blood pressure" value="138/88" unit="mmHg" tone="caution" />
                <Vital Icon={Droplet} label="HbA1c" value="5.4" unit="%" tone="success" />
                <Vital Icon={Activity} label="Cholesterol" value="214" unit="mg/dL" tone="critical" />
              </Div>
              <Btn
                onPress={() => nav.navigate('lab-report')}
                className="tap flex-row w-full items-center gap-2.5 border-t border-ink-100 bg-ink-50/60 px-4 py-3 text-left"
              >
                <FlaskConical className="h-[15px] w-[15px] shrink-0 text-ink-500" strokeWidth={2.1} />
                <Span className="min-w-0 flex-1 truncate text-body-sm text-ink-600">
                  Last updated from <Span className="font-semibold text-ink-900">Lipid Profile</Span> · 28 Sep
                </Span>
                <ChevronRight className="h-[16px] w-[16px] shrink-0 text-ink-300" />
              </Btn>
            </Card>
          </Div>
        </Div>}

        {/* ------------------------------------------- Latest prescription */}
        {(!LIVE || prescription.id !== '') && <Div className="mt-6 px-5">
          <SectionHeader title="Latest prescription" className="!px-0 pb-3" />
          <Card onClick={() => nav.navigate('prescription', { params: { rxId: prescription.id } })} elevation="tile" padded={false} className="overflow-hidden">
            <Div className="flex-row items-center gap-3.5 p-4">
              <Avatar src={rxDoctor.photo} name={rxDoctor.name} size={46} radius={15} />
              <Div className="min-w-0 flex-1">
                <P className="truncate text-title-sm text-ink-900">{rxDoctor.name}</P>
                <P className="truncate text-body-sm text-ink-500">
                  {rxDoctor.specialty} · {LIVE ? prescription.date : '22 Sep 2025'}
                </P>
              </Div>
              {(!LIVE || rxActive) && <StatusBadge tone="success">Active</StatusBadge>}
            </Div>
            <Div className="flex-row flex-wrap gap-1.5 px-4 pb-3.5">
              {prescription.medicines.map((m) => (
                <MetaChip key={m.name}>{m.name.replace(' Tablet', '')}</MetaChip>
              ))}
            </Div>
            <Div
              className="flex-row items-center justify-between border-t border-ink-100 bg-brand-50/60 px-4 py-3"
              onPress={(e: any) => {
                e.stopPropagation()
                orderPrescription(prescription, rxDoctor.name)
                nav.navigate('cart')
              }}
            >
              <Span className="text-body-sm font-semibold text-brand-700">Reorder these medicines</Span>
              <ArrowUpRight className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.4} />
            </Div>
          </Card>
        </Div>}

        {/* --------------------------------------- Upcoming diagnostic test */}
        {nextTest && <Div className="mt-6 px-5">
          <SectionHeader title="Upcoming diagnostic test" className="!px-0 pb-3" />
          <Card onClick={() => nav.navigate('diagnostic-tracking', { params: { id: nextTest.id } })} elevation="tile">
            <Div className="flex-row items-start gap-3.5">
              <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-vital-50">
                <HomeIcon className="h-[19px] w-[19px] text-vital-600" strokeWidth={2} />
              </Span>
              <Div className="min-w-0 flex-1">
                <Div className="flex-row items-start justify-between gap-2">
                  <P className="min-w-0 flex-1 truncate text-title-sm text-ink-900">{getTest(nextTest.testId).short} test</P>
                  <StatusBadge tone="brand" dot>
                    Confirmed
                  </StatusBadge>
                </Div>
                <P className="mt-0.5 truncate text-body-sm text-ink-500">
                  {`${nextTest.method === 'Home Collection' ? 'Home collection' : 'Lab visit'} · ${getLab(nextTest.labId).name}`}
                </P>
                <Div className="mt-2 flex-row items-center gap-1.5 whitespace-nowrap text-caption font-semibold text-ink-700">
                  <Clock className="h-[13px] w-[13px] shrink-0 text-ink-400" strokeWidth={2.2} />
                  {`${nextTest.date.replace(/ \d{4}$/, '')} · ${nextTest.slotCompact}`}
                </Div>
              </Div>
            </Div>
          </Card>
        </Div>}

        {/* ---------------------------------------------------- Top doctors */}
        <Div className="mt-7">
          <SectionHeader
            title="Top doctors for you"
            subtitle={LIVE ? 'Highest rated on KDC+' : 'Based on your care history'}
            action="See all"
            onAction={() => {
              useDiscovery.getState().showAll()
              nav.navigate('doctor-list', { tab: 'doctors' })
            }}
            className="pb-3"
          />
          <HScroll>
            {doctors.slice(0, 4).map((d) => (
              <DoctorCard key={d.id} doctor={d} compact onView={() => openDoctor(d.id)} />
            ))}
          </HScroll>
        </Div>

        {/* ------------------------------------------------------ Assurance */}
        <Div className="mt-7 px-5">
          <Div className="flex-row items-center gap-3 rounded-card bg-white px-4 py-3.5 shadow-tile">
            <Logo variant="wordmark" width={48} />
            <Div className="h-[26px] w-px bg-ink-100" />
            <P className="text-body-sm leading-[18px] text-ink-500">
              Verified doctors · Licensed pharmacy · <Span className="font-semibold text-ink-800">NABL labs</Span>
            </P>
          </Div>
        </Div>
        </Deferred>
      </Div>

      <BottomNav active="home" />
    </Screen>
  )
}

function Vital({
  Icon,
  label,
  value,
  unit,
  tone,
}: {
  Icon: React.ComponentType<any>
  label: string
  value: string
  unit: string
  tone: 'success' | 'caution' | 'critical'
}) {
  const color = { success: 'text-vital-600', caution: 'text-caution-600', critical: 'text-critical-600' }[tone]
  const dot = { success: 'bg-vital-600', caution: 'bg-caution-600', critical: 'bg-critical-600' }[tone]
  return (
    <Div className="px-3 py-3.5">
      <Div className="flex-row items-center gap-1.5">
        <Icon className={`h-[14px] w-[14px] ${color}`} strokeWidth={2.2} />
        <Span className={`h-[5px] w-[5px] rounded-full ${dot}`} />
      </Div>
      <P className="mt-2 text-title-md leading-none tabular-nums text-ink-900">{value}</P>
      <P className="mt-1 text-[10.5px] font-medium text-ink-400">{unit}</P>
      <P className="mt-1.5 text-[11px] leading-[14px] text-ink-500">{label}</P>
    </Div>
  )
}
