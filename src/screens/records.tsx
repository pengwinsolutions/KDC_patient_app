import { Btn, Div, P, Span } from '../components/primitives/index'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  FileText,
  FlaskConical,
  Video,
  FolderOpen,
  Plus,
  Pill,
  CalendarClock,
  ChevronRight,
  UserPlus,
  Lock,
  Filter,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, LargeHeader, HScroll } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Field } from '../components/ui/Inputs'
import { BLOOD_GROUPS, ChoiceChips, FormDate, FormInput, FormSelect } from '../components/forms/Fields'
import {
  Avatar,
  SectionHeader,
  StatusBadge,
  MetaChip,
  FilterChip,
} from '../components/ui/Display'
import { Banner, Modal, StateBlock } from '../components/ui/Feedback'
import { recordCounts } from '../mock-data/mock'
import { useNav } from '../navigation/navigation'
import { useFamily } from '../store/family'
import { filterTimeline, groupByMonth, timelineEvents, useRecords } from '../store/records'
import { showToast } from '../store/toast'
import { pickPhoto } from '../flows/photo'
import { familySchema, formatMobile, normalizeMobile, type FamilyForm } from '../validation/schemas'
import type { FamilyMember, TimelineEvent } from '../types'
import { useQuery } from '@tanstack/react-query'
import { LIVE } from '../services/config'
import { errorMessage } from '../services/errors'
import { loadRecordCounts, loadTimeline } from '../services/live/records'

const TL_ICON = { consultation: Video, followup: CalendarClock, prescription: FileText, report: FlaskConical, lab: FlaskConical, pharmacy: Pill } as const

/** Live: where tapping a timeline event (or a recent record) leads; null when there's no screen for it. */
function eventRoute(e: TimelineEvent): { screen: string; params: Record<string, unknown> } | null {
  if (!e.ref) return null
  switch (e.type) {
    case 'consultation':
    case 'followup':
      return { screen: 'appointment-detail', params: { id: e.ref } }
    case 'prescription':
      return { screen: 'prescription', params: { rxId: e.ref } }
    case 'report':
      // Uploaded documents have numeric ids and no viewer yet; lab reports have codes.
      return /^\d+$/.test(e.ref) ? null : { screen: 'lab-report', params: { id: e.ref } }
    case 'lab':
      return { screen: 'diagnostic-tracking', params: { id: e.ref } }
    case 'pharmacy':
      return { screen: 'order-tracking', params: { id: e.ref } }
  }
}

/* ============================================= 44 — Medical records ======= */

const CATEGORIES = [
  { id: 'rx', label: 'Prescriptions', Icon: FileText, key: 'prescriptions', screen: 'prescription-history', tint: 'bg-brand-50', color: 'text-brand-600' },
  { id: 'lab', label: 'Lab Reports', Icon: FlaskConical, key: 'reports', screen: 'lab-reports', tint: 'bg-vital-50', color: 'text-vital-600' },
  { id: 'consult', label: 'Consultations', Icon: Video, key: 'consultations', screen: 'appointments', tint: 'bg-caution-50', color: 'text-caution-600' },
  { id: 'doc', label: 'Documents', Icon: FolderOpen, key: 'documents', screen: 'rx-upload', tint: 'bg-ink-50', color: 'text-ink-600' },
] as const

const RECENT_RECORDS = [
  { Icon: FlaskConical, title: 'Lipid Profile report', meta: 'Dr. Lal PathLabs · 28 Sep 2025', tone: 'caution' as const, badge: '2 high', screen: 'lab-report' },
  { Icon: FileText, title: 'Prescription', meta: 'Dr. Arjun Mehta · 22 Sep 2025', tone: 'success' as const, badge: 'Active', screen: 'prescription' },
  { Icon: Video, title: 'Consultation summary', meta: 'Dr. Sanjay Iyer · 22 Sep 2025', tone: 'neutral' as const, badge: 'Completed', screen: 'appointment-detail' },
]

/** A member's records in each class: their share of the account's total. */
function memberCounts(member: FamilyMember, primaryRecords: number) {
  const ratio = member.records / primaryRecords
  return (count: number) => Math.round(count * ratio)
}

export function RecordsScreen() {
  const nav = useNav()
  const members = useFamily((s) => s.members)
  const [memberId, setMemberId] = React.useState(members[0]?.id ?? '')
  const selected: FamilyMember | undefined = members.find((m) => m.id === memberId) ?? members[0]
  const selectedId = selected?.id ?? ''
  // Live: each member's counts and latest records come from the server.
  const cachedCounts = useRecords((s) => s.counts[selectedId])
  const counts = useQuery({ queryKey: ['record-counts', selectedId], queryFn: () => loadRecordCounts(selectedId), enabled: LIVE && Boolean(selectedId), initialData: cachedCounts })
  const recent = useQuery({ queryKey: ['timeline-recent', selectedId], queryFn: () => loadTimeline(selectedId), enabled: LIVE && Boolean(selectedId) })
  const recentEvents = (recent.data?.events ?? []).slice(0, 3)
  const scale = LIVE || !selected ? (n: number) => n : memberCounts(selected, members[0].records)
  const countOf = (key: (typeof CATEGORIES)[number]['key']) => (LIVE ? counts.data?.[key] ?? 0 : scale(recordCounts[key]))
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="bg-white px-5 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
        <Div className="flex-row items-start justify-between pt-3">
          <Div>
            <P className="text-title-lg text-ink-900">Medical records</P>
            <P className="mt-1 text-body text-ink-500">Everything from your care, in one place.</P>
          </Div>
          <IconButton size={40} label="Add record" tone="brand" onClick={() => nav.navigate('rx-upload')}>
            <Plus className="h-[19px] w-[19px]" strokeWidth={2.4} />
          </IconButton>
        </Div>
      </Div>

      <Div className="flex-1 pb-[40px] pt-4">
        {/* Member switcher */}
        <HScroll gap={10} className="pb-4">
          {members.map((m) => (
            <Btn
              key={m.id}
              onPress={() => setMemberId(m.id)}
              className={`tap flex-row shrink-0 items-center gap-2.5 rounded-chip py-2 pl-2 pr-3.5  ${
                m.id === selectedId ? 'bg-brand-600' : 'bg-white ring-1 ring-inset  ring-ink-100'
              }`}
            >
              <Avatar src={m.photo} name={m.name} size={28} radius={10} />
              <Span className={`text-body-sm font-semibold ${m.id === selectedId ? 'text-white' : 'text-ink-700'}`}>
                {m.relation === 'Self' ? 'You' : m.name.split(' ')[0]}
              </Span>
            </Btn>
          ))}
        </HScroll>

        {/* Categories */}
        <Div className=" grid-cols-2 gap-2.5 px-5">
          {CATEGORIES.map((c) => (
            <Btn
              key={c.id}
              onPress={() => nav.navigate(c.screen)}
              className="tap  flex-col items-start rounded-card bg-white p-4 text-left shadow-tile"
            >
              <Span className={`flex-col h-[42px] w-[42px] items-center justify-center rounded-tile ${c.tint}`}>
                <c.Icon className={`h-[19px] w-[19px] ${c.color}`} strokeWidth={2} />
              </Span>
              <P className="mt-3 text-title-sm text-ink-900">{c.label}</P>
              <P className="mt-0.5 text-body-sm text-ink-400">{countOf(c.key)} records</P>
            </Btn>
          ))}
        </Div>

        {/* Recently added */}
        <Div className="pt-6">
          <SectionHeader title="Recently added" action="Timeline" onAction={() => nav.navigate('health-timeline')} className="pb-3" />
          <Div className="gap-2.5 px-5">
            {LIVE ? (
              recentEvents.length ? (
                recentEvents.map((e) => {
                  const Icon = TL_ICON[e.type]
                  const route = eventRoute(e)
                  return (
                    <Btn
                      key={e.id}
                      onPress={() => route && nav.navigate(route.screen, { params: route.params })}
                      className="tap flex-row w-full items-center gap-3.5 rounded-card bg-white p-4 text-left shadow-tile"
                    >
                      <Span className="flex-col h-[40px] w-[40px] shrink-0 items-center justify-center rounded-tile bg-ink-50">
                        <Icon className="h-[18px] w-[18px] text-ink-500" strokeWidth={2.1} />
                      </Span>
                      <Div className="min-w-0 flex-1">
                        <P className="truncate text-body-lg font-semibold text-ink-900">{e.title}</P>
                        <P className="truncate text-caption text-ink-400">
                          {e.meta} · {e.date}
                        </P>
                      </Div>
                    </Btn>
                  )
                })
              ) : (
                <StateBlock compact icon={<FolderOpen className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="Nothing added recently" />
              )
            ) : selected?.primary ? RECENT_RECORDS.map((r) => (
              <Btn
                key={r.title}
                onPress={() => nav.navigate(r.screen)}
                className="tap flex-row w-full items-center gap-3.5 rounded-card bg-white p-4 text-left shadow-tile"
              >
                <Span className="flex-col h-[40px] w-[40px] shrink-0 items-center justify-center rounded-tile bg-ink-50">
                  <r.Icon className="h-[18px] w-[18px] text-ink-500" strokeWidth={2.1} />
                </Span>
                <Div className="min-w-0 flex-1">
                  <P className="truncate text-body-lg font-semibold text-ink-900">{r.title}</P>
                  <P className="truncate text-caption text-ink-400">{r.meta}</P>
                </Div>
                <StatusBadge tone={r.tone}>{r.badge}</StatusBadge>
              </Btn>
            )) : (
              <StateBlock compact icon={<FolderOpen className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="Nothing added recently" />
            )}
          </Div>
        </Div>

        <Div className="px-5 pt-5">
          <Banner
            tone="brand"
            icon={<Lock className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="Your records are private"
            body="Doctors see a record only when you share it, and you can revoke access at any time."
          />
        </Div>
      </Div>
    </Screen>
  )
}

/* ============================================= 45 — Health timeline ======= */

const TL_META = {
  consultation: { Icon: Video, tint: 'bg-brand-50', color: 'text-brand-600', label: 'Consultation' },
  prescription: { Icon: FileText, tint: 'bg-vital-50', color: 'text-vital-600', label: 'Prescription' },
  pharmacy: { Icon: Pill, tint: 'bg-caution-50', color: 'text-caution-600', label: 'Pharmacy' },
  lab: { Icon: FlaskConical, tint: 'bg-ink-50', color: 'text-ink-600', label: 'Diagnostics' },
  report: { Icon: FlaskConical, tint: 'bg-critical-50', color: 'text-critical-600', label: 'Report' },
  followup: { Icon: CalendarClock, tint: 'bg-brand-50', color: 'text-brand-600', label: 'Follow-up' },
} as const

const EARLIER: TimelineEvent[] = [
  { id: 'h7', type: 'consultation' as const, title: 'Video consultation — Dr. Sanjay Iyer', meta: 'General Physician · Care Hospitals', date: '14 Aug 2025', time: '6:30 PM' },
  { id: 'h8', type: 'prescription' as const, title: 'Prescription issued — 2 medicines', meta: 'Seasonal allergic rhinitis', date: '14 Aug 2025', time: '6:52 PM' },
  { id: 'h9', type: 'lab' as const, title: 'Complete Blood Count — sample collected', meta: 'Vijaya Diagnostic Centre', date: '02 Aug 2025', time: '8:05 AM' },
]

const TIMELINE_FILTERS = ['All events', 'Consultations', 'Prescriptions', 'Reports', 'Pharmacy']

export function TimelineScreen() {
  const nav = useNav()
  const added = useRecords((s) => s.added)
  const hasMore = useRecords((s) => s.added.length < s.total)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [showEarlier, setShowEarlier] = React.useState(false)
  const [filter, setFilter] = React.useState('All events')
  const [oldestFirst, setOldestFirst] = React.useState(false)
  const events = [...timelineEvents(added), ...(showEarlier && !LIVE ? EARLIER : [])]
  const open = (h: TimelineEvent) => {
    if (!LIVE) return nav.navigate(h.type === 'report' ? 'lab-report' : h.type === 'prescription' ? 'prescription' : 'appointment-detail')
    const route = eventRoute(h)
    if (route) nav.navigate(route.screen, { params: route.params })
  }
  const loadEarlier = async () => {
    if (!LIVE) return setShowEarlier(true)
    setLoadingMore(true)
    try {
      await useRecords.getState().loadMore()
    } catch (e) {
      showToast(errorMessage(e, 'Could not load earlier events.'), 'critical')
    } finally {
      setLoadingMore(false)
    }
  }
  const reachedStart = LIVE ? !hasMore : showEarlier
  const months = groupByMonth(filterTimeline(events, filter))
  const grouped = oldestFirst ? [...months].reverse() : months

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <ScreenHeader
          embedded
          title="Health timeline"
          border={false}
          right={
            <IconButton
              size={36}
              label="Filter"
              onClick={() => {
                setOldestFirst((v) => !v)
                showToast(oldestFirst ? 'Newest first' : 'Oldest first', 'info')
              }}
            >
              <Filter className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          }
        />
        <Div className="border-b border-ink-100 pb-3">
          <HScroll gap={8}>
            {TIMELINE_FILTERS.map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="flex-1 pb-[40px]">
        {grouped.length === 0 && (
          <Div className="pt-8">
            <StateBlock compact icon={<CalendarClock className="h-[26px] w-[26px]" strokeWidth={1.9} />} title="No events in this category" />
          </Div>
        )}

        {grouped.map((g) => (
          <Div key={g.month} className="pt-3">
            <P className="px-5 pb-3 text-caption font-bold uppercase tracking-[.08em] text-ink-400">{g.month}</P>
            <Div className="relative px-5">
              {/* Continuous rail behind the whole month */}
              <Span className="absolute bottom-4 left-[42px] top-2 w-[2px] rounded-full bg-ink-100" />
              <Div className="gap-2.5">
                {g.items.map((h) => {
                  const m = TL_META[h.type]
                  return (
                    <Div key={h.id} className="relative flex-row gap-3.5">
                      <Span
                        className={`relative z-10 flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile ring-[3px] ring-canvas ${m.tint}`}
                      >
                        <m.Icon className={`h-[17px] w-[17px] ${m.color}`} strokeWidth={2.1} />
                      </Span>
                      <Btn
                        onPress={() => open(h)}
                        className="tap min-w-0 flex-1 rounded-card bg-white p-3.5 text-left shadow-tile"
                      >
                        <Div className="flex-row items-start justify-between gap-3">
                          <P className="min-w-0 flex-1 text-body-lg font-semibold leading-[20px] text-ink-900">{h.title}</P>
                          <ChevronRight className="mt-[2px] h-[16px] w-[16px] shrink-0 text-ink-300" />
                        </Div>
                        <P className="mt-1 truncate text-body-sm text-ink-500">{h.meta}</P>
                        <Div className="mt-2 flex-row items-center gap-2">
                          <MetaChip>{m.label}</MetaChip>
                          <Span className="text-caption text-ink-400">
                            {h.date} · {h.time}
                          </Span>
                        </Div>
                      </Btn>
                    </Div>
                  )
                })}
              </Div>
            </Div>
          </Div>
        ))}

        <Div className="px-5 pt-5">
          {reachedStart ? (
            LIVE && events.length === 0 ? null : (
            <P className="py-2 text-center text-caption text-ink-400">
              You have reached the start of your KDC+ record.
            </P>
            )
          ) : (
            <Btn
              onPress={loadEarlier}
              disabled={loadingMore}
              className="tap flex-row w-full items-center justify-center gap-2 rounded-card border border-dashed border-ink-200 bg-white/60 py-3.5 text-body font-semibold text-brand-600"
            >
              {loadingMore ? 'Loading…' : 'Load earlier events'}
            </Btn>
          )}
        </Div>
      </Div>
    </Screen>
  )
}

/* ============================================== 46 — Family members ====== */

export function FamilyScreen() {
  const nav = useNav()
  const members = useFamily((s) => s.members)
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <LargeHeader title="Family members" subtitle="Manage care for everyone in your household." />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        <Div className="gap-2.5">
          {members.map((m) => (
            <Btn
              key={m.id}
              onPress={() => (m.primary ? nav.navigate('medical-info') : nav.navigate('add-family', { params: { id: m.id } }))}
              className="tap flex-row w-full items-center gap-3.5 rounded-card bg-white p-4 text-left shadow-tile"
            >
              <Avatar src={m.photo} name={m.name} size={50} radius={16} />
              <Div className="min-w-0 flex-1">
                <Div className="flex-row items-center gap-2">
                  <P className="truncate text-title-sm text-ink-900">{m.name}</P>
                  {m.primary && <StatusBadge tone="brand">Primary</StatusBadge>}
                </Div>
                <P className="mt-0.5 text-body-sm text-ink-500">
                  {m.relation} · {m.age} yrs · {m.gender}
                </P>
                <Div className="mt-2 flex-row items-center gap-1.5">
                  {m.blood ? <MetaChip className="!bg-critical-50 !text-critical-700">{m.blood}</MetaChip> : null}
                  <MetaChip>{m.records} records</MetaChip>
                </Div>
              </Div>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-300" />
            </Btn>
          ))}
        </Div>

        <Div className="mt-5">
          <Banner
            tone="brand"
            icon={<Lock className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="Separate records for each member"
            body="Each family member has their own prescriptions, reports and timeline. Only you can view them."
          />
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={() => nav.navigate('add-family')} icon={<UserPlus className="h-[17px] w-[17px]" strokeWidth={2.2} />}>
          Add Family Member
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* =========================================== 47 — Add family member ======= */

const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Other']

export function AddFamilyScreen() {
  const nav = useNav()
  const members = useFamily((s) => s.members)
  const existing = members.find((m) => m.id === nav.params.id && !m.primary)
  const family = useFamily.getState()
  const [photo, setPhoto] = React.useState(existing?.photo)
  const [confirmingRemoval, setConfirmingRemoval] = React.useState(false)
  const { control, handleSubmit, watch, setValue, formState } = useForm<FamilyForm>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: existing?.name ?? '',
      relation: existing?.relation ?? 'Spouse',
      dob: existing?.dob ?? '',
      gender: existing?.gender ?? '',
      blood: existing?.blood ?? '',
      mobile: existing?.mobile ? normalizeMobile(existing.mobile) : '',
    },
  })

  const save = handleSubmit(async (form) => {
    const member = {
      name: form.name.trim(),
      relation: form.relation,
      dob: form.dob,
      gender: form.gender,
      blood: form.blood || (LIVE ? '' : 'Unknown'),
      photo,
      mobile: form.mobile.trim() ? formatMobile(form.mobile) : undefined,
    }
    try {
      if (existing) await family.update(existing.id, member)
      else await family.add(member)
    } catch (e) {
      showToast(errorMessage(e, 'Could not save the family member. Please try again.'), 'critical')
      return
    }
    showToast(existing ? 'Family member updated' : 'Family member added')
    nav.navigate('family', { replace: true })
  })

  const remove = async () => {
    if (!existing) return
    try {
      await family.remove(existing.id)
    } catch (e) {
      // e.g. the member still has upcoming appointments.
      setConfirmingRemoval(false)
      showToast(errorMessage(e, 'Could not remove the family member.'), 'critical')
      return
    }
    showToast('Family member removed')
    nav.navigate('family', { replace: true })
  }

  return (
    <Screen background="bg-white" padBottom={false}>
      <ScreenHeader title={existing ? 'Edit family member' : 'Add family member'} />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        <Div className=" flex-col items-center">
          <Div className="relative">
            <Avatar src={photo} name={watch('name') || 'New Member'} size={84} radius={28} />
            {/* Live: photos need authenticated image loading, not built yet. */}
            {!LIVE && <IconButton
              size={30}
              tone="brand"
              label="Add photo"
              onClick={() => pickPhoto(setPhoto)}
              className="absolute -bottom-1 -right-1 ring-[3px] ring-white"
            >
              <Plus className="h-[15px] w-[15px]" strokeWidth={2.6} />
            </IconButton>}
          </Div>
          {!LIVE && <P className="mt-2.5 text-body-sm font-semibold text-brand-600">Add photo</P>}
        </Div>

        <Div className="mt-6 gap-4">
          <FormInput control={control} name="name" label="Full name" required placeholder="As per government ID" />

          <Field label="Relationship" required error={formState.errors.relation?.message}>
            <Div className="flex-row flex-wrap gap-2">
              <ChoiceChips
                options={RELATIONS}
                value={watch('relation')}
                onChange={(r) => setValue('relation', r)}
                chipClass="tap h-[40px] rounded-chip px-4 text-body-sm font-semibold "
              />
            </Div>
          </Field>

          <Div className=" grid-cols-2 gap-3">
            <FormDate control={control} name="dob" label="Date of birth" required placeholder="DD / MM / YYYY" />
            <FormSelect control={control} name="gender" label="Gender" required placeholder="Select" options={['Male', 'Female', 'Other']} />
          </Div>

          <Field label="Blood group" hint="Shown to doctors during emergencies.">
            <Div className="flex-row flex-wrap gap-2">
              <ChoiceChips
                options={BLOOD_GROUPS}
                value={watch('blood')}
                onChange={(b) => setValue('blood', b === watch('blood') ? '' : b)}
                chipClass="tap h-[40px] w-[58px] rounded-chip text-body-sm font-bold "
              />
            </Div>
          </Field>

          <FormInput
            control={control}
            name="mobile"
            label="Mobile number"
            hint="Optional — used for appointment reminders."
            inputMode="numeric"
            placeholder="98490 42187"
            prefix={<Span className="border-r border-ink-200 pr-3 font-semibold text-ink-900">+91</Span>}
          />

          {existing && (
            <Button variant="text" className="!text-critical-600" onClick={() => setConfirmingRemoval(true)}>
              Remove member
            </Button>
          )}
        </Div>
      </Div>

      <StickyBar>
        <Button loading={formState.isSubmitting} onClick={save}>
          {existing ? 'Save changes' : 'Add member'}
        </Button>
      </StickyBar>

      {confirmingRemoval && existing && (
        <Modal
          tone="critical"
          icon={<UserPlus className="h-[26px] w-[26px]" strokeWidth={2} />}
          title={`Remove ${existing.name}?`}
          body="Their prescriptions, reports and timeline will no longer appear in your account."
          actions={
            <>
              <Button variant="danger" onClick={remove}>
                Yes, remove
              </Button>
              <Button variant="tertiary" onClick={() => setConfirmingRemoval(false)}>
                Keep member
              </Button>
            </>
          }
        />
      )}
    </Screen>
  )
}
