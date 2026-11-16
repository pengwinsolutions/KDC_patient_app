import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  User,
  Users,
  HeartPulse,
  CalendarDays,
  FileText,
  FlaskConical,
  CreditCard,
  MapPin,
  Bell,
  ShieldCheck,
  LifeBuoy,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
  Pencil,
  LogOut,
  Globe,
  Lock,
  FileCheck,
  MessageSquare,
  Phone,
  Plus,
  Droplet,
  AlertTriangle,
  Pill,
  Scissors,
  UserRound,
  Trash2,
  Download,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, LargeHeader, BottomNav, HScroll } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Field, OtpInput, RadioRow, SearchInput, TextArea, Toggle } from '../components/ui/Inputs'
import {
  Avatar,
  Card,
  Group,
  ListRow,
  SectionHeader,
  Segmented,
  MetaChip,
  Divider,
  FilterChip,
} from '../components/ui/Display'
import { Modal, SheetModal, StateBlock } from '../components/ui/Feedback'
import { NotificationCard, AddressCard, PaymentRow } from '../components/cards/index'
import { AddressFormSheet } from '../components/forms/Sheets'
import { Logo } from '../components/ui/Logo'
import { rupee } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import type { Address, HelpQuestion, NotificationCategory, NotificationItem, PaymentRecord } from '../types'
import { notificationFeed, useNotifications } from '../store/notifications'
import { useProfile } from '../store/profile'
import { useFamily } from '../store/family'
import { useAddresses } from '../store/addresses'
import { spendSummary, usePayments } from '../store/payments'
import { membershipEntryScreen, totalSaved, useMembership } from '../store/membership'
import { planById } from '../mock-data/membership'
import { LANGUAGES, useSettings, type Toggles } from '../store/settings'
import { getDoctor, useCatalog } from '../store/catalog'
import { upcomingOf, useAppointments } from '../store/appointments'
import { showToast } from '../store/toast'
import { logout } from '../store/reset'
import { useHelpSearch } from '../hooks/queries'
import { useQuery } from '@tanstack/react-query'
import { LIVE } from '../services/config'
import { errorMessage } from '../services/errors'
import { notificationRoute } from '../services/live/notifications'
import { deleteAccount, requestDeletionCode } from '../services/live/account'
import { loadRecordCounts } from '../services/live/records'
import { createTicket, loadTicketCategories } from '../services/live/support'
import { api } from '../services/live/http'
import { useRecords } from '../store/records'
import { orderPrescription } from '../flows/prescriptions'
import { pickPhoto } from '../flows/photo'

/* ============================================== 48 — Notifications ======== */

const NOTIFICATION_FILTERS: ('All' | NotificationCategory)[] = ['All', 'Appointments', 'Prescriptions', 'Diagnostics', 'Pharmacy', 'Payments', 'System']

export function NotificationsScreen() {
  const nav = useNav()
  const added = useNotifications((s) => s.added)
  const readIds = useNotifications((s) => s.readIds)
  const { markRead, markAllRead } = useNotifications.getState()
  const prescription = useCatalog((s) => s.prescription)
  const [filter, setFilter] = React.useState<(typeof NOTIFICATION_FILTERS)[number]>('All')
  const feed = notificationFeed(added, readIds)
  const allRead = feed.every((n) => !n.unread)
  const visible = feed.filter((n) => filter === 'All' || n.category === filter)
  const groups = LIVE ? ['Today', 'Yesterday', 'This week', 'Earlier'] : ['Today', 'Yesterday', 'This week']

  const act = (n: NotificationItem) => {
    markRead(n.id)
    if (LIVE) {
      const route = notificationRoute(n)
      if (route) nav.navigate(route.screen, { params: route.params })
      return
    }
    if (n.action === 'Join waiting room') nav.navigate('waiting-room', { params: { id: 'a1' } })
    else if (n.action === 'View report') nav.navigate('lab-report')
    else if (n.action === 'Reorder') {
      orderPrescription(prescription, getDoctor(prescription.doctorId).name)
      nav.navigate('cart')
    }
  }
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <ScreenHeader
          embedded
          title="Notifications"
          border={false}
          right={
            <Btn
              onPress={markAllRead}
              disabled={allRead}
              className="tap px-2 text-body-sm font-semibold text-brand-600 disabled:text-ink-300"
            >
              {allRead ? 'All read' : 'Mark all read'}
            </Btn>
          }
        />
        <Div className="pb-3">
          <HScroll gap={8}>
            {NOTIFICATION_FILTERS.map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="flex-1 pb-[40px] pt-4">
        {visible.length === 0 && (
          <StateBlock compact icon={<Bell className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="Nothing here yet" />
        )}

        {groups.map((g) => {
          const items = visible.filter((n) => n.group === g)
          if (!items.length) return null
          return (
            <Div key={g} className="mb-5">
              <P className="px-5 pb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">{g}</P>
              <Div className="gap-2.5 px-5">
                {items.map((n) => (
                  <NotificationCard key={n.id} n={n} onPress={() => markRead(n.id)} onAction={() => act(n)} />
                ))}
              </Div>
            </Div>
          )
        })}
      </Div>
    </Screen>
  )
}

/* =============================================== 49 — Patient profile ===== */

export function ProfileScreen() {
  const nav = useNav()
  const patient = useProfile((s) => s.profile)
  const setProfile = useProfile((s) => s.setProfile)
  const members = useFamily((s) => s.members)
  const addressCount = useAddresses((s) => s.items.length)
  const membership = useMembership()
  const plan = planById(membership.planId)
  const saved = totalSaved(membership.ledger)
  const active = membership.status === 'active'

  const careMenu = [
    { Icon: User, label: 'Personal information', sub: 'Name, date of birth, contact', screen: 'profile-setup' },
    { Icon: Users, label: 'Family members', sub: `${members.length} profiles`, screen: 'family' },
    { Icon: HeartPulse, label: 'Medical information', sub: 'Allergies, conditions, medication', screen: 'medical-info' },
  ]
  const liveCounts = useSelfCounts()
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  const activityMenu = [
    { Icon: CalendarDays, label: 'Appointments', sub: LIVE ? plural(liveCounts?.consultations ?? 0, 'consultation') : '17 consultations', screen: 'appointments' },
    { Icon: FileText, label: 'Prescriptions', sub: LIVE ? plural(liveCounts?.prescriptions ?? 0, 'prescription') : '12 prescriptions', screen: 'prescription-history' },
    { Icon: FlaskConical, label: 'Lab reports', sub: LIVE ? plural(liveCounts?.reports ?? 0, 'report') : '8 reports', screen: 'lab-reports' },
    { Icon: CreditCard, label: 'Payments', sub: 'Invoices and refunds', screen: 'payments' },
  ]
  const accountMenu = [
    { Icon: MapPin, label: 'Saved addresses', sub: `${addressCount} addresses`, screen: 'addresses' },
    { Icon: Bell, label: 'Notifications', sub: 'Push, SMS and email', screen: 'notifications' },
    { Icon: ShieldCheck, label: 'Privacy & security', sub: 'Data, consent and devices', screen: 'settings' },
    { Icon: LifeBuoy, label: 'Help & support', sub: 'Chat, call and FAQs', screen: 'help' },
    { Icon: SettingsIcon, label: 'Settings', sub: 'Language, legal, account', screen: 'settings' },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="pb-[112px]">
        {/* Identity */}
        <Div className="bg-clinical px-5 pb-5 pt-3">
          <Div className="flex-row items-center gap-4">
            <Div className="relative">
              <Avatar src={patient.photo} name={patient.name} size={72} radius={24} />
              {/* Live: profile photos need authenticated image loading, not built yet. */}
              {!LIVE && <IconButton
                size={26}
                tone="brand"
                label="Edit photo"
                onClick={() => pickPhoto((photo) => setProfile({ ...patient, photo }))}
                className="absolute -bottom-1 -right-1 ring-[3px] ring-white"
              >
                <Pencil className="h-[12px] w-[12px]" strokeWidth={2.4} />
              </IconButton>}
            </Div>
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-md text-ink-900">{patient.name}</P>
              <P className="mt-0.5 truncate text-body-sm text-ink-500">{patient.mobile}</P>
              <P className="truncate text-body-sm text-ink-500">{patient.email}</P>
            </Div>
          </Div>

          <Div className="mt-4 flex-row items-center gap-2">
            <MetaChip className="!bg-white shadow-tile">
              {patient.age} yrs · {patient.gender}
            </MetaChip>
            {(!LIVE || patient.bloodGroup) && (
              <MetaChip className="!bg-critical-50 !text-critical-700">
                <Droplet className="h-[11px] w-[11px]" /> {patient.bloodGroup}
              </MetaChip>
            )}
            <MetaChip className="!bg-white shadow-tile">{LIVE ? patient.code ?? '' : patient.id}</MetaChip>
          </Div>
        </Div>

        {/* Menus */}
        <Div className="gap-5 px-5 pt-5">
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
                <Span className="block text-body-lg font-bold text-white">KDC+ Plus membership</Span>
                <Span className="mt-0.5 block text-caption leading-[16px] text-white/60">
                  {active
                    ? `Renews ${membership.renews} · ${rupee(saved)} saved`
                    : `${plan.discount}% off consultations, medicines and tests`}
                </Span>
              </Span>
              <ChevronRight className="h-[17px] w-[17px] shrink-0 text-white/40" strokeWidth={2.4} />
            </Span>
          </Btn>

          <Div>
            <SectionHeader title="Your care" className="!px-0 pb-2.5" />
            <Group>
              {careMenu.map((m, i) => (
                <ListRow
                  key={m.label}
                  icon={<m.Icon className="h-[16px] w-[16px]" strokeWidth={2.1} />}
                  title={m.label}
                  subtitle={m.sub}
                  last={i === careMenu.length - 1}
                  onClick={() => nav.navigate(m.screen)}
                />
              ))}
            </Group>
          </Div>

          <Div>
            <SectionHeader title="Activity" className="!px-0 pb-2.5" />
            <Group>
              {activityMenu.map((m, i) => (
                <ListRow
                  key={m.label}
                  icon={<m.Icon className="h-[16px] w-[16px]" strokeWidth={2.1} />}
                  title={m.label}
                  subtitle={m.sub}
                  last={i === activityMenu.length - 1}
                  onClick={() => nav.navigate(m.screen)}
                />
              ))}
            </Group>
          </Div>

          <Div>
            <SectionHeader title="Account" className="!px-0 pb-2.5" />
            <Group>
              {accountMenu.map((m, i) => (
                <ListRow
                  key={m.label}
                  icon={<m.Icon className="h-[16px] w-[16px]" strokeWidth={2.1} />}
                  title={m.label}
                  subtitle={m.sub}
                  last={i === accountMenu.length - 1}
                  onClick={() => nav.navigate(m.screen)}
                />
              ))}
            </Group>
          </Div>

          <Div className=" flex-col items-center gap-2 pt-2">
            <Logo variant="wordmark" width={58} className="opacity-45" />
            <P className="text-caption text-ink-300">Version 1.0.0 (build 428)</P>
          </Div>
        </Div>
      </Div>

      <BottomNav active="profile" />
    </Screen>
  )
}

/* ========================================== 50 — Medical information ====== */

export function MedicalInfoScreen() {
  const nav = useNav()
  const patient = useProfile((s) => s.profile)
  const medicalInfo = useProfile((s) => s.medical)
  const edit = () => nav.navigate('medical-info-edit')
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Medical information"
        subtitle={patient.name}
        right={
          <Btn
            onPress={edit}
            className="tap px-2 text-body-sm font-semibold text-brand-600"
          >
            Edit
          </Btn>
        }
      />

      <Div className="flex-1 gap-3 px-5 pb-[40px] pt-4">
        {/* Vitals strip */}
        <Card elevation="tile" padded={false}>
          <Div className=" grid-cols-3 divide-x divide-ink-100">
            {[
              { label: 'Blood group', value: medicalInfo.bloodGroup || '—', tone: 'text-critical-600' },
              { label: 'Height', value: medicalInfo.height || '—', tone: 'text-ink-900' },
              { label: 'Weight', value: medicalInfo.weight || '—', tone: 'text-ink-900' },
            ].map((v) => (
              <Div key={v.label} className="px-3 py-3.5 text-center">
                <P className={`text-title-md leading-none ${v.tone}`} style={{ lineHeight: 24, marginVertical: -2 }}>{v.value}</P>
                <P className="mt-1.5 text-caption text-ink-400">{v.label}</P>
              </Div>
            ))}
          </Div>
        </Card>

        {/* Allergies — clinically critical, so it carries the red treatment */}
        <Card elevation="tile" className="!bg-critical-50">
          <Div className="flex-row items-center gap-2.5">
            <AlertTriangle className="h-[17px] w-[17px] shrink-0 text-critical-600" strokeWidth={2.2} />
            <P className="text-title-sm text-critical-700">Allergies</P>
          </Div>
          <Div className="mt-3 flex-row flex-wrap gap-2">
            {medicalInfo.allergies.map((a) => (
              <Span key={a} className="rounded-chip bg-white px-3 py-1.5 text-body-sm font-bold text-critical-700">
                {a}
              </Span>
            ))}
            {medicalInfo.allergies.length === 0 && <P className="text-body-sm text-critical-700/80">No known allergies added</P>}
          </Div>
          <P className="mt-3 text-caption leading-[17px] text-critical-700/80">
            Shown to every doctor you consult and printed on every prescription.
          </P>
        </Card>

        <InfoBlock Icon={HeartPulse} title="Existing conditions" items={medicalInfo.conditions} onAdd={edit} />
        <InfoBlock Icon={Pill} title="Current medication" items={medicalInfo.medications} onAdd={edit} />
        <InfoBlock Icon={Scissors} title="Previous surgeries" items={medicalInfo.surgeries} onAdd={edit} />

        <Card elevation="tile">
          <Div className="flex-row items-center gap-2.5">
            <UserRound className="h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
            <P className="text-title-sm text-ink-900">Emergency contact</P>
          </Div>
          <Divider className="my-3" />
          {!medicalInfo.emergency.name ? (
            <Btn onPress={edit} className="tap">
              <P className="text-body-sm font-semibold text-brand-600">Add an emergency contact</P>
            </Btn>
          ) : (
          <Div className="flex-row items-center gap-3.5">
            <Avatar name={medicalInfo.emergency.name} size={42} radius={14} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-lg font-semibold text-ink-900">{medicalInfo.emergency.name}</P>
              <P className="truncate text-body-sm text-ink-500">
                {medicalInfo.emergency.relation} · {medicalInfo.emergency.mobile}
              </P>
            </Div>
            <IconButton
              size={36}
              tone="brand"
              label="Call"
              onClick={() => showToast(`Calling ${medicalInfo.emergency.name}`, 'info', medicalInfo.emergency.mobile)}
            >
              <Phone className="h-[16px] w-[16px]" strokeWidth={2.3} />
            </IconButton>
          </Div>
          )}
        </Card>
      </Div>
    </Screen>
  )
}

/** Live: the account holder's record counts (appointments, prescriptions, reports, documents). */
function useSelfCounts() {
  const id = useProfile((s) => s.profile.id)
  const cached = useRecords((s) => s.counts[id])
  const q = useQuery({ queryKey: ['record-counts', id], queryFn: () => loadRecordCounts(id), enabled: LIVE && Boolean(id), initialData: cached })
  return q.data
}

function InfoBlock({
  Icon,
  title,
  items,
  onAdd,
}: {
  Icon: React.ComponentType<any>
  title: string
  items: string[]
  onAdd: () => void
}) {
  return (
    <Card elevation="tile">
      <Div className="flex-row items-center justify-between">
        <Div className="flex-row items-center gap-2.5">
          <Icon className="h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.1} />
          <P className="text-title-sm text-ink-900">{title}</P>
        </Div>
        <Btn className="tap" onPress={onAdd} accessibilityLabel={`Add to ${title}`}>
          <Plus className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.4} />
        </Btn>
      </Div>
      <Div className="mt-3 gap-2">
        {items.map((i) => (
          <Div key={i} className="flex-row gap-2.5">
            <Span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink-300" />
            <P className="text-body leading-[21px] text-ink-700">{i}</P>
          </Div>
        ))}
      </Div>
    </Card>
  )
}

/* ============================================== 51 — Saved addresses ====== */

export function AddressesScreen() {
  const nav = useNav()
  const addresses = useAddresses((s) => s.items)
  const setDefault = useAddresses((s) => s.setDefault)
  const [form, setForm] = React.useState<{ open: boolean; address?: Address }>({ open: false })
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <LargeHeader title="Saved addresses" subtitle="Used for medicine delivery and home sample collection." />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        <Div className="gap-2.5">
          {addresses.map((a) => (
            <AddressCard
              key={a.id}
              a={a}
              onClick={() => {
                setDefault(a.id)
                showToast('Default address updated', 'success', a.label)
              }}
              onEdit={() => setForm({ open: true, address: a })}
            />
          ))}
        </Div>

        <Btn
          onPress={() => setForm({ open: true })}
          className="tap mt-3 flex-row w-full items-center justify-center gap-2 rounded-card border border-dashed border-ink-200 bg-white/60 py-4 text-body font-semibold text-brand-600"
        >
          <Plus className="h-[17px] w-[17px]" strokeWidth={2.4} />
          Add a new address
        </Btn>
      </Div>

      <StickyBar>
        <Button onClick={() => nav.navigate('profile', { tab: 'profile' })}>Save changes</Button>
      </StickyBar>

      <AddressFormSheet visible={form.open} address={form.address} onClose={() => setForm({ open: false })} />
    </Screen>
  )
}

/* ============================================== 52 — Payment history ====== */

const LEDGER_SEGMENTS: Record<string, PaymentRecord['type'] | null> = {
  all: null,
  consult: 'Consultation',
  pharmacy: 'Pharmacy',
  diag: 'Diagnostics',
}

export function PaymentsScreen() {
  const ledger = usePayments((s) => s.ledger)
  const serverSummary = usePayments((s) => s.summary)
  const [segment, setSegment] = React.useState('all')
  // Live: the server's totals, net of refunds; demo: the ledger shown.
  const total = LIVE ? serverSummary?.total ?? 0 : ledger.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const summary = spendSummary(ledger, serverSummary)
  const type = LEDGER_SEGMENTS[segment]
  const visible = ledger.filter((p) => !type || p.type === type)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <ScreenHeader
          embedded
          title="Payments"
          border={false}
          right={
            // Live: statements and invoice PDFs need a file viewer, which the app doesn't have yet.
            LIVE ? undefined : (
              <IconButton size={36} label="Export" onClick={() => showToast('Statement saved to Files', 'success', 'KDC-payments.pdf')}>
                <Download className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
              </IconButton>
            )
          }
        />
        <Div className="px-5 pb-3.5">
          <Segmented
            options={[
              { id: 'all', label: 'All' },
              { id: 'consult', label: 'Consults' },
              { id: 'pharmacy', label: 'Pharmacy' },
              { id: 'diag', label: 'Labs' },
            ]}
            value={segment}
            onChange={setSegment}
          />
        </Div>
      </Div>

      <Div className="flex-1 px-5 pb-[40px] pt-4">
        <Div className="rounded-card bg-brand-deep p-4 shadow-card">
          <P className="text-caption text-white/60">{LIVE ? 'Spent on KDC+' : 'Spent in the last 90 days'}</P>
          <P className="mt-1.5 font-display text-[28px] font-extrabold leading-none tabular-nums text-white">
            {rupee(total)}
          </P>
          <Div className="mt-3.5 flex-row items-center gap-4 border-t border-white/12 pt-3">
            {[
              { k: 'Consultations', v: rupee(summary.consultations) },
              { k: 'Pharmacy', v: rupee(summary.pharmacy) },
              { k: 'Diagnostics', v: rupee(summary.diagnostics) },
            ].map((x) => (
              <Div key={x.k} className="min-w-0 flex-1">
                <P className="truncate text-[10.5px] text-white/55">{x.k}</P>
                <P className="mt-0.5 truncate text-body-sm font-bold text-white">{x.v}</P>
              </Div>
            ))}
          </Div>
        </Div>

        <Div className="mt-4">
          <SectionHeader title="Transactions" className="!px-0 pb-2.5" />
          <Group>
            {visible.map((p) => (
              <PaymentRow
                key={p.id}
                p={p}
                onClick={() =>
                  LIVE
                    ? showToast(
                        p.invoiceNumber ? `Invoice ${p.invoiceNumber}` : `Payment ${p.id}`,
                        'info',
                        p.refundedAmount ? `${rupee(p.refundedAmount)} refunded to the original method` : `For ${p.ref}`,
                      )
                    : showToast('Invoice saved to Files', 'success', `${p.ref}.pdf`)
                }
              />
            ))}
          </Group>
        </Div>

        {LIVE && visible.length === 0 && <P className="px-1 py-6 text-center text-body-sm text-ink-400">No payments yet</P>}

        <P className="mt-4 px-1 text-caption leading-[17px] text-ink-400">
          Refunds are credited to the original payment method within 3–5 working days. Invoices are available for every
          paid transaction.
        </P>
      </Div>
    </Screen>
  )
}

/* ============================================== 53 — Help & support ======= */

export function HelpScreen() {
  const nav = useNav()
  const [text, setText] = React.useState('')
  const [question, setQuestion] = React.useState<HelpQuestion | null>(null)
  const appointments = useAppointments((s) => s.items)
  const recent = upcomingOf(appointments)[0]
  const result = useHelpSearch(text)
  const [contact, setContact] = React.useState(false)
  const topics = result.data?.topics ?? []
  const questions = result.data?.questions ?? []
  const nothing = result.isSuccess && topics.length === 0 && questions.length === 0
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="bg-white px-5 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
        <ScreenHeader embedded title="Help & support" border={false} />
        <Div className="pb-1">
          <SearchInput placeholder="Describe your issue" value={text} onChange={setText} />
        </Div>
      </Div>

      <Div className="flex-1 px-5 pb-[140px] pt-4">
        {/* Contextual help */}
        <SectionHeader title="Need help with something recent?" className="!px-0 pb-2.5" />
        {recent && (
        <Card
          elevation="tile"
          className="!bg-brand-50"
          onClick={() => nav.navigate('appointment-detail', { params: { id: recent.id } })}
        >
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[40px] w-[40px] shrink-0 items-center justify-center rounded-tile bg-white">
              <CalendarDays className="h-[18px] w-[18px] text-brand-600" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="truncate text-body-lg font-semibold text-ink-900">
                {getDoctor(recent.doctorId).name} — {recent.date.startsWith('Today') ? 'Today' : recent.date.replace(/ \d{4}$/, '')}, {recent.time}
              </P>
              <P className="truncate text-caption text-ink-500">Booking {recent.bookingId}</P>
            </Div>
            <ChevronRight className="h-[17px] w-[17px] shrink-0 text-ink-400" />
          </Div>
        </Card>
        )}

        {nothing && (
          <Div className="pt-6">
            <StateBlock compact icon={<LifeBuoy className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="No articles found" body="Our team can help — chat or call below." />
          </Div>
        )}

        {topics.length > 0 && (
        <Div className="mt-5">
          <SectionHeader title="Browse topics" className="!px-0 pb-2.5" />
          <Group>
            {topics.map((t, i) => (
              <ListRow
                key={t.id}
                onClick={() => setText(t.title)}
                title={t.title}
                subtitle={t.body}
                trailing={
                  <Span className="flex-row items-center gap-2">
                    <Span className="text-caption text-ink-400">{t.articles}</Span>
                    <ChevronRight className="h-[17px] w-[17px] text-ink-300" />
                  </Span>
                }
                last={i === topics.length - 1}
              />
            ))}
          </Group>
        </Div>
        )}

        {questions.length > 0 && (
        <Div className="mt-5">
          <SectionHeader title="Popular questions" className="!px-0 pb-2.5" />
          <Group>
            {questions.map((q, i, arr) => (
              <ListRow
                key={q.id}
                onClick={() => setQuestion(q)}
                title={<Span className="text-body">{q.question}</Span>}
                last={i === arr.length - 1}
              />
            ))}
          </Group>
        </Div>
        )}
      </Div>

      <SheetModal visible={question !== null} onClose={() => setQuestion(null)} title={question?.question}>
        <Div className="pb-2">
          <P className="text-body leading-[22px] text-ink-600">{question?.answer}</P>
        </Div>
      </SheetModal>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button
            variant="tertiary"
            className="flex-1"
            onClick={() => showToast('Calling KDC+ support', 'info', '1800 000 5532')}
            icon={<Phone className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          >
            Call support
          </Button>
          <Button
            className="flex-1"
            onClick={() => (LIVE ? setContact(true) : showToast('A support agent will join shortly', 'info'))}
            icon={<MessageSquare className="h-[16px] w-[16px]" strokeWidth={2.2} />}
          >
            Chat support
          </Button>
        </Div>
        <P className="mt-2.5 text-center text-caption text-ink-400">
          {LIVE ? 'Our team replies to your message by notification' : 'Available 24 × 7 · Average response under 2 minutes'}
        </P>
      </StickyBar>

      {LIVE && <SupportMessageSheet visible={contact} draft={text} bookingRef={recent?.bookingId} onClose={() => setContact(false)} />}
    </Screen>
  )
}

/** Live: "Chat support" opens a support ticket (the team answers in the ticket and by notification). */
function SupportMessageSheet({ visible, draft, bookingRef, onClose }: { visible: boolean; draft: string; bookingRef?: string; onClose: () => void }) {
  const categories = useQuery({ queryKey: ['ticket-categories'], queryFn: loadTicketCategories, enabled: visible })
  const [category, setCategory] = React.useState('Other')
  const [message, setMessage] = React.useState('')
  const [sending, setSending] = React.useState(false)
  React.useEffect(() => {
    if (visible) setMessage(draft)
  }, [visible, draft])
  // Topics for doctors and agents aren't offered to patients.
  const options = (categories.data ?? ['Other']).filter((c) => !['Payments & Payouts', 'Verification', 'Sample Collection'].includes(c))
  const send = async () => {
    const description = message.trim()
    if (description.length < 10) {
      showToast('Tell us a little more (at least 10 characters)', 'caution')
      return
    }
    setSending(true)
    try {
      const t = await createTicket({ subject: description.slice(0, 80), category, description, bookingRef })
      showToast('Message sent to KDC+ support', 'success', `Ticket ${t.id}`)
      setMessage('')
      onClose()
    } catch (e) {
      showToast(errorMessage(e, 'Could not send your message. Please try again.'), 'critical')
    } finally {
      setSending(false)
    }
  }
  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Message KDC+ support"
      footer={
        <Button loading={sending} onClick={send}>
          Send message
        </Button>
      }
    >
      <Div className="gap-4 pb-2">
        <Field label="Topic">
          <Div className="flex-row flex-wrap gap-2">
            {options.map((c) => (
              <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </FilterChip>
            ))}
          </Div>
        </Field>
        <Field label="How can we help?" required>
          <TextArea value={message} onChangeText={setMessage} placeholder="Describe the problem, with any booking or order number" />
        </Field>
      </Div>
    </SheetModal>
  )
}

/* ==================================================== 54 — Settings ======= */

const TOGGLE_LABELS: { key: keyof Toggles; label: string; sub: string; last?: boolean }[] = [
  { key: 'appointmentReminders', label: 'Appointment reminders', sub: '30 minutes before a consultation' },
  { key: 'prescriptionRefills', label: 'Prescription refills', sub: 'When a course is about to end' },
  { key: 'orderUpdates', label: 'Order and report updates', sub: 'Pharmacy and diagnostics' },
  { key: 'offers', label: 'Offers and health tips', sub: 'Occasional, never more than weekly', last: true },
]

export function SettingsScreen() {
  const nav = useNav()
  const patient = useProfile((s) => s.profile)
  const memberCount = useFamily((s) => s.members.length)
  const settings = useSettings()
  const [languageOpen, setLanguageOpen] = React.useState(false)
  const [confirm, setConfirm] = React.useState<'logout' | 'delete' | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const devices = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ id: number; platform: string | null; current: boolean }[]>('me/sessions'),
    enabled: LIVE,
  })
  const access = useQuery({
    queryKey: ['record-access', patient.id],
    queryFn: () => api.get<{ grants: { active: boolean; doctor: { name: string } }[] }>(`patient/members/${patient.id}/record-access`),
    enabled: LIVE && Boolean(patient.id),
  })
  const signOut = () => {
    logout()
    nav.resetTo('login')
  }
  const confirmed = async () => {
    if (confirm === 'delete' && LIVE) {
      // Live: the server sends a confirmation code by SMS before anything is erased.
      try {
        await requestDeletionCode()
        setConfirm(null)
        setDeleting(true)
      } catch (e) {
        showToast(errorMessage(e, 'Could not send the confirmation code.'), 'critical')
      }
      return
    }
    signOut()
  }
  const activeGrants = (access.data?.grants ?? []).filter((g) => g.active)
  const sessionCount = devices.data?.length ?? 0
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Settings" />

      <Div className="flex-1 gap-5 px-5 pb-[40px] pt-4">
        <Div>
          <SectionHeader title="Account" className="!px-0 pb-2.5" />
          <Group>
            <ListRow icon={<User className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Personal information" subtitle={patient.mobile} onClick={() => nav.navigate('profile-setup')} />
            <ListRow icon={<Users className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Family members" subtitle={`${memberCount} profiles`} onClick={() => nav.navigate('family')} />
            <ListRow icon={<CreditCard className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Payment methods" subtitle={LIVE ? 'UPI, cards and payment history' : 'UPI and 2 cards'} last onClick={() => nav.navigate('payments')} />
          </Group>
        </Div>

        <Div>
          <SectionHeader title="Notifications" className="!px-0 pb-2.5" />
          <Group>
            {TOGGLE_LABELS.map((t) => (
              <SettingToggle
                key={t.key}
                label={t.label}
                sub={t.sub}
                on={settings.toggles[t.key]}
                last={t.last}
                onToggle={() => settings.toggle(t.key)}
              />
            ))}
          </Group>
        </Div>

        <Div>
          <SectionHeader title="Privacy & security" className="!px-0 pb-2.5" />
          <Group>
            <SettingToggle
              label="Face ID lock"
              sub="Require Face ID to open KDC+"
              on={settings.toggles.faceIdLock}
              onToggle={() => settings.toggle('faceIdLock')}
            />
            <ListRow
              icon={<Lock className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Manage data sharing"
              subtitle="Which doctors can see your records"
              onClick={() =>
                LIVE
                  ? showToast(
                      activeGrants.length ? `${activeGrants.length} doctor${activeGrants.length === 1 ? '' : 's'} can see your records` : 'No doctor currently has access',
                      'info',
                      activeGrants.map((g) => g.doctor.name).join(', ') || undefined,
                    )
                  : showToast('No doctor currently has access', 'info')
              }
            />
            <ListRow
              icon={<ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Signed-in devices"
              subtitle={LIVE ? `${sessionCount} active session${sessionCount === 1 ? '' : 's'}` : '2 active devices'}
              onClick={() => (LIVE ? showToast(`Signed in on ${sessionCount} device${sessionCount === 1 ? '' : 's'}`, 'info', 'Log out to end this one') : showToast('iPhone 16 Pro and this device', 'info'))}
            />
            <ListRow
              icon={<Download className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Download my data"
              subtitle="Export records as PDF"
              last
              onClick={() =>
                LIVE
                  ? showToast('Not available in the app yet', 'info', 'Ask KDC+ support for a copy of your records')
                  : showToast('Export saved to Files', 'success', 'KDC-records.pdf')
              }
            />
          </Group>
        </Div>

        <Div>
          <SectionHeader title="Preferences" className="!px-0 pb-2.5" />
          <Group>
            <ListRow
              icon={<Globe className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Language"
              onClick={() => setLanguageOpen(true)}
              trailing={
                <Span className="flex-row items-center gap-2">
                  <Span className="text-body-sm text-ink-400">{settings.language}</Span>
                  <ChevronRight className="h-[17px] w-[17px] text-ink-300" />
                </Span>
              }
              last
            />
          </Group>
        </Div>

        <Div>
          <SectionHeader title="Legal" className="!px-0 pb-2.5" />
          <Group>
            <ListRow icon={<FileCheck className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Terms of Service" onClick={() => showToast('Terms of Service', 'info', 'Last updated 1 Jan 2026')} />
            <ListRow icon={<ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Privacy Policy" onClick={() => showToast('Privacy Policy', 'info', 'Last updated 1 Jan 2026')} />
            <ListRow icon={<FileText className="h-[16px] w-[16px]" strokeWidth={2.1} />} title="Licences and attributions" last onClick={() => showToast('Open-source licences', 'info')} />
          </Group>
        </Div>

        <Div>
          <Group>
            <ListRow
              icon={<LogOut className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Log out"
              danger
              trailing={<Span />}
              onClick={() => setConfirm('logout')}
            />
            <ListRow
              icon={<Trash2 className="h-[16px] w-[16px]" strokeWidth={2.1} />}
              title="Delete account"
              subtitle="Permanently removes your records"
              danger
              trailing={<Span />}
              last
              onClick={() => setConfirm('delete')}
            />
          </Group>
        </Div>

        <Div className=" flex-col items-center gap-2 pb-2">
          <Logo variant="wordmark" width={58} className="opacity-45" />
          <P className="text-caption text-ink-300">Version 1.0.0 (build 428)</P>
        </Div>
      </Div>

      <SelectLanguage
        open={languageOpen}
        current={settings.language}
        onSelect={settings.setLanguage}
        onClose={() => setLanguageOpen(false)}
      />

      {confirm && (
        <Modal
          tone="critical"
          icon={<LogOut className="h-[26px] w-[26px]" strokeWidth={2} />}
          title={confirm === 'logout' ? 'Log out of KDC+?' : 'Delete your account?'}
          body={
            confirm === 'logout'
              ? 'You will need your mobile number and a new code to sign in again.'
              : LIVE
                ? 'This permanently erases your profile, family members, medical records and uploaded files from KDC+. We will send a code to confirm. It cannot be undone.'
                : 'This permanently removes your records from this device. It cannot be undone.'
          }
          actions={
            <>
              <Button variant="danger" onClick={confirmed}>
                {confirm === 'logout' ? 'Log out' : 'Delete account'}
              </Button>
              <Button variant="tertiary" onClick={() => setConfirm(null)}>
                Stay signed in
              </Button>
            </>
          }
        />
      )}

      {LIVE && (
        <DeleteAccountSheet
          visible={deleting}
          mobile={patient.mobileMasked}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false)
            showToast('Your account has been deleted')
            nav.resetTo('login')
          }}
        />
      )}
    </Screen>
  )
}

/** Live: the SMS code that confirms deleting the account. */
function DeleteAccountSheet({ visible, mobile, onClose, onDeleted }: { visible: boolean; mobile: string; onClose: () => void; onDeleted: () => void }) {
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState<string | undefined>()
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (visible) {
      setCode('')
      setError(undefined)
    }
  }, [visible])
  const submit = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await deleteAccount(code)
      onDeleted()
    } catch (e) {
      setError(errorMessage(e, 'Could not delete the account. Please try again.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Confirm account deletion"
      footer={
        <Div className="gap-2.5">
          <Button variant="danger" loading={busy} disabled={code.length !== 6} onClick={submit}>
            Delete my account
          </Button>
          <Button variant="tertiary" onClick={onClose}>
            Keep my account
          </Button>
        </Div>
      }
    >
      <Div className="gap-4 pb-2">
        <P className="text-body leading-[22px] text-ink-600">Enter the 6-digit code we sent to {mobile}.</P>
        <Field error={error}>
          <OtpInput value={code} error={Boolean(error)} onChange={setCode} />
        </Field>
      </Div>
    </SheetModal>
  )
}

function SelectLanguage({
  open,
  current,
  onSelect,
  onClose,
}: {
  open: boolean
  current: string
  onSelect: (language: (typeof LANGUAGES)[number]['label']) => void
  onClose: () => void
}) {
  return (
    <SheetModal visible={open} onClose={onClose} title="Language">
      <Div className="gap-2 pb-2">
        {LANGUAGES.map((l) => (
          <RadioRow
            key={l.label}
            title={l.native}
            subtitle={l.label}
            selected={l.label === current}
            onClick={() => {
              onSelect(l.label)
              onClose()
            }}
          />
        ))}
      </Div>
    </SheetModal>
  )
}

function SettingToggle({
  label,
  sub,
  on,
  last,
  onToggle,
}: {
  label: string
  sub?: string
  on?: boolean
  last?: boolean
  onToggle: () => void
}) {
  return (
    <Div className={`flex-row items-center gap-3.5 bg-white px-4 py-[13px] ${last ? '' : 'border-b-[0.5px] border-ink-900/10'}`}>
      <Div className="min-w-0 flex-1">
        <P className="truncate text-body-lg text-ink-900">{label}</P>
        {sub && <P className="mt-[1px] truncate text-body-sm text-ink-400">{sub}</P>}
      </Div>
      <Toggle on={on} onClick={onToggle} />
    </Div>
  )
}
