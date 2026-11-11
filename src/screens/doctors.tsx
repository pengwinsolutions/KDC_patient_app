import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import { PanResponder, View } from 'react-native'
import {
  SlidersHorizontal,
  TrendingUp,
  Clock,
  X,
  Heart,
  Stethoscope,
  Baby,
  Bone,
  Brain,
  Ear,
  Eye,
  Smile,
  Droplet,
  Sparkles,
  Share2,
  MapPin,
  Languages,
  Award,
  Users,
  ThumbsUp,
  ChevronRight,
  Building2,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, BottomNav, HScroll } from '../components/ui/Nav'
import { SearchInput } from '../components/ui/Inputs'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import {
  Avatar,
  Card,
  FilterChip,
  MetaChip,
  Rating,
  SectionHeader,
  VerifiedMark,
  Divider,
} from '../components/ui/Display'
import { BottomSheet, SkeletonDoctorCard } from '../components/ui/Feedback'
import { DateStrip } from '../components/ui/Scheduling'
import { DoctorCard, MODE, ModeIcon } from '../components/cards/index'
import { rupee } from '../mock-data/mock'
import type { ConsultMode, Doctor } from '../types'
import { PlusTag } from '../components/ui/Membership'
import { useNav } from '../navigation/navigation'
import { reviewsFor, useCatalog } from '../store/catalog'
import { sheetFiltersFor, useDiscovery, type RecentSearch } from '../store/discovery'
import { useBooking, useSelectedDoctor } from '../store/booking'
import { showToast } from '../store/toast'
import { usePricing } from '../hooks/usePricing'
import { useDoctorSearch } from '../hooks/queries'
import {
  CONCERN_TO_SPECIALTY,
  FEE_CEILING,
  FEE_FLOOR,
  listingTitle,
  NO_FILTERS,
  plural,
  searchDoctors,
  type Availability,
  type DistanceBand,
  type DoctorFilters,
  type ExperienceBand,
  type GenderFilter,
  type SortKey,
} from '../domain/doctorSearch'
import { MOCK_TODAY } from '../domain/schedule'
import { ApiErrorBody, NoResultsBody } from './states'

const SPEC_ICON: Record<string, React.ComponentType<any>> = {
  stethoscope: Stethoscope,
  heart: Heart,
  sparkles: Sparkles,
  baby: Baby,
  bone: Bone,
  venus: Users,
  brain: Brain,
  ear: Ear,
  eye: Eye,
  smile: Smile,
  tooth: Smile,
  droplet: Droplet,
}

/* ================================================= 10 — Doctor search ===== */

/** Opens a doctor's profile, making them the subject of the booking flow. */
function useDoctorActions() {
  const nav = useNav()
  const select = useBooking((s) => s.selectDoctor)
  return {
    view: (d: Doctor) => {
      select(d.id)
      nav.navigate('doctor-profile')
    },
    book: (d: Doctor) => {
      select(d.id)
      nav.navigate('consult-type')
    },
  }
}

function DoctorResults({ doctors }: { doctors: Doctor[] }) {
  const actions = useDoctorActions()
  return (
    <>
      {doctors.map((d) => (
        <DoctorCard key={d.id} doctor={d} onView={() => actions.view(d)} onBook={() => actions.book(d)} />
      ))}
    </>
  )
}

export function DoctorSearchScreen() {
  const nav = useNav()
  const actions = useDoctorActions()
  const specialties = useCatalog((s) => s.specialties)
  const doctors = useCatalog((s) => s.doctors)
  const recents = useDiscovery((s) => s.recents)
  const discovery = useDiscovery.getState()
  const [text, setText] = React.useState('')
  const searching = text.trim().length > 0
  const results = useDoctorSearch({ text, filters: NO_FILTERS, sort: 'Relevance' }, searching)
  const trending = ['Fever & cold', 'Diabetes review', 'Back pain', 'Child vaccination', 'Thyroid']

  const openRecent = (r: RecentSearch) => {
    if (r.doctorId) {
      const doctor = doctors.find((d) => d.id === r.doctorId)
      if (doctor) actions.view(doctor)
      return
    }
    discovery.applySearch(r.label)
    nav.navigate('doctor-list')
  }

  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className="pb-[112px]">
        <Div className="bg-white px-5 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
          <P className="pt-4 text-title-lg text-ink-900">Find a doctor</P>
          <P className="mt-1 text-body text-ink-500">540+ verified specialists across 24 departments.</P>
          <Div className="mt-4 flex-row gap-2.5">
            <SearchInput
              placeholder="Search doctors or specialties"
              className="flex-1"
              value={text}
              onChange={setText}
              onSubmit={() => {
                if (!searching) return
                discovery.applySearch(text)
                nav.navigate('doctor-list')
              }}
            />
            <Btn
              onPress={() => nav.navigate('doctor-filters')}
              className="tap flex-col h-[48px] w-[48px] shrink-0 items-center justify-center rounded-ctl bg-brand-600 shadow-cta"
            >
              <SlidersHorizontal className="h-[19px] w-[19px] text-white" strokeWidth={2.2} />
            </Btn>
          </Div>
        </Div>

        {searching && (
          <Div className="gap-2.5 px-5 pt-4">
            {results.isPending ? (
              <SkeletonDoctorCard />
            ) : results.isError ? (
              <ApiErrorBody onRetry={() => results.refetch()} />
            ) : results.data?.length ? (
              <DoctorResults doctors={results.data} />
            ) : (
              <NoResultsBody body={`We couldn’t find a doctor for “${text.trim()}”. Check the spelling or browse by specialty.`} />
            )}
          </Div>
        )}

        {!searching && (
        <>
        {/* Recent searches */}
        <Div className="mt-5">
          <SectionHeader
            title="Recent searches"
            action={recents.length ? 'Clear' : undefined}
            onAction={discovery.clearRecents}
            className="pb-3"
          />
          <Div className="gap-px">
            {recents.map((r) => (
              <Btn
                key={r.label}
                onPress={() => openRecent(r)}
                className="tap flex-row w-full items-center gap-3 bg-white px-5 py-3 text-left border-b-[0.5px] border-ink-900/10"
              >
                <Clock className="h-[16px] w-[16px] shrink-0 text-ink-300" strokeWidth={2.1} />
                <Span className="min-w-0 flex-1 truncate text-body-lg text-ink-700">{r.label}</Span>
                <Btn accessibilityLabel={`Remove ${r.label}`} hitSlop={10} onPress={() => discovery.removeRecent(r.label)}>
                  <X className="h-[15px] w-[15px] shrink-0 text-ink-300" strokeWidth={2.2} />
                </Btn>
              </Btn>
            ))}
          </Div>
        </Div>

        {/* Specialties */}
        <Div className="mt-6">
          <SectionHeader title="Browse by specialty" subtitle="24 departments" className="pb-3" />
          <Div className=" grid-cols-3 gap-2.5 px-5">
            {specialties.map((s) => {
              const Icon = SPEC_ICON[s.icon] ?? Stethoscope
              return (
                <Btn
                  key={s.id}
                  onPress={() => {
                    discovery.applySpecialty(s.name)
                    nav.navigate('doctor-list')
                  }}
                  className="tap  flex-col items-start rounded-card bg-white p-3 shadow-tile"
                >
                  <Span className="flex-col h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-brand-50">
                    <Icon className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.1} />
                  </Span>
                  <P className="mt-2.5 text-[12px] font-bold leading-[15px] text-ink-900">{s.name}</P>
                  <P className="mt-[3px] text-[10.5px] text-ink-400">{s.count} doctors</P>
                </Btn>
              )
            })}
          </Div>
        </Div>

        {/* Trending */}
        <Div className="mt-7">
          <SectionHeader title="Common concerns" className="pb-3" />
          <HScroll>
            {trending.map((t) => (
              <FilterChip
                key={t}
                onClick={() => {
                  discovery.applySpecialty(CONCERN_TO_SPECIALTY[t])
                  nav.navigate('doctor-list')
                }}
                icon={<TrendingUp className="h-[13px] w-[13px]" />}
              >
                {t}
              </FilterChip>
            ))}
          </HScroll>
        </Div>

        {/* Available now */}
        <Div className="mt-7">
          <SectionHeader
            title="Available now"
            subtitle="Consult within 15 minutes"
            action="See all"
            onAction={() => {
              discovery.showAll()
              nav.navigate('doctor-list')
            }}
            className="pb-3"
          />
          <Div className="gap-2.5 px-5">
            {doctors
              .filter((d) => d.availableToday)
              .slice(0, 2)
              .map((d) => (
                <DoctorCard
                  key={d.id}
                  doctor={d}
                  onView={() => actions.view(d)}
                  onBook={() => actions.book(d)}
                />
              ))}
          </Div>
        </Div>
        </>
        )}
      </Div>

      <BottomNav active="doctors" />
    </Screen>
  )
}

/* ============================================= 10b — Filters sheet ======== */

const SHEET_SPECIALTIES = ['General Physician', 'Cardiology', 'Dermatology', 'Paediatrics', 'Orthopaedics']
const AVAILABILITY: Availability[] = ['Available now', 'Today', 'Tomorrow', 'Next 7 days']
const EXPERIENCE: ExperienceBand[] = ['0–5 yrs', '5–10 yrs', '10–15 yrs', '15+ yrs']
const GENDERS: GenderFilter[] = ['Any', 'Male', 'Female']
const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Marathi']
const DISTANCES: DistanceBand[] = ['Within 5 km', 'Within 10 km', 'Anywhere in Hyderabad']

/* The slider's labelled range: the left thumb sits at 8% for ₹300 and the
   right at 68% for ₹1,200, so positions and rupees convert linearly. */
const feeToPct = (fee: number) => 8 + ((fee - 300) / (FEE_CEILING - 300)) * 60
const pctToFee = (pct: number) => Math.round((300 + ((pct - 8) / 60) * (FEE_CEILING - 300)) / 50) * 50

function FeeThumb({
  pct,
  width,
  onMove,
}: {
  pct: number
  width: number
  onMove: (pct: number) => void
}) {
  const start = React.useRef(pct)
  const live = React.useRef({ pct, width, onMove })
  live.current = { pct, width, onMove }
  const responder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = live.current.pct
      },
      onPanResponderMove: (_, g) => {
        const { width: w, onMove: move } = live.current
        if (w) move(start.current + (g.dx / w) * 100)
      },
    }),
  ).current
  return (
    <Div
      className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-card border border-ink-200"
      style={{ left: `${pct}%` }}
      hitSlop={14}
      {...responder.panHandlers}
    />
  )
}

function FeeRange({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const [width, setWidth] = React.useState(0)
  const leftPct = feeToPct(min)
  const rightPct = feeToPct(max)
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Div className="relative h-[4px] rounded-full bg-ink-100">
        <Span className="absolute h-full rounded-full bg-brand-600" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />
        <FeeThumb
          pct={leftPct}
          width={width}
          onMove={(p) => onChange(Math.min(Math.max(pctToFee(p), FEE_FLOOR), max - 50), max)}
        />
        <FeeThumb
          pct={rightPct}
          width={width}
          onMove={(p) => onChange(min, Math.max(Math.min(pctToFee(p), FEE_CEILING), min + 50))}
        />
      </Div>
    </View>
  )
}

export function FiltersSheetScreen() {
  const nav = useNav()
  const doctors = useCatalog((s) => s.doctors)
  const discovery = useDiscovery.getState()
  const [filters, setFilters] = React.useState<DoctorFilters>(() => sheetFiltersFor(discovery))
  /* The first view quotes the blueprint's catalogue size, not this local sample. */
  const [touched, setTouched] = React.useState(!discovery.pristine)
  const update = (changes: Partial<DoctorFilters>) => {
    setFilters((f) => ({ ...f, ...changes }))
    setTouched(true)
  }
  const toggle = <K extends 'specialty' | 'availability' | 'mode' | 'experience' | 'distance'>(key: K, value: DoctorFilters[K]) =>
    update({ [key]: filters[key] === value ? null : value } as Partial<DoctorFilters>)

  const count = touched ? searchDoctors(doctors, { text: discovery.query.text, filters, sort: 'Relevance' }).length : 38
  const apply = () => {
    useDiscovery.getState().applyFilters(filters)
    if (nav.from === 'doctor-list') nav.back()
    else nav.navigate('doctor-list', { replace: true })
  }
  const reset = () => update(NO_FILTERS)

  return (
    <Screen background="bg-canvas" padBottom={false}>
      {/* Dimmed listing behind the sheet */}
      <Div className="pointer-events-none  opacity-100">
        <ScreenHeader title="Cardiologists" subtitle="38 doctors" />
        <Div className="gap-2.5 px-5 pt-3">
          {doctors.slice(0, 2).map((d) => (
            <DoctorCard key={d.id} doctor={d} />
          ))}
        </Div>
      </Div>

      <BottomSheet
        title="Filters"
        subtitle={`${count} ${count === 1 ? 'doctor matches' : 'doctors match'}`}
        onClose={() => nav.back()}
        footer={
          <Div className="flex-row gap-2.5">
            <Button variant="tertiary" onClick={reset} className="flex-1">
              Reset
            </Button>
            <Button onClick={apply} className="flex-[1.6]">
              Show {plural(count, 'doctor')}
            </Button>
          </Div>
        }
      >
        <Div className="gap-5 pb-2">
          <FilterGroup title="Specialty">
            {SHEET_SPECIALTIES.map((x) => (
              <FilterChip key={x} active={filters.specialty === x} onClick={() => toggle('specialty', x)}>
                {x}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup title="Availability">
            {AVAILABILITY.map((x) => (
              <FilterChip key={x} active={filters.availability === x} onClick={() => toggle('availability', x)}>
                {x}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup title="Consultation type">
            {(['video', 'audio', 'clinic'] as ConsultMode[]).map((m) => (
              <FilterChip key={m} active={filters.mode === m} onClick={() => toggle('mode', m)} icon={<ModeIcon mode={m} size={13} />}>
                {MODE[m].label}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup title="Experience">
            {EXPERIENCE.map((x) => (
              <FilterChip key={x} active={filters.experience === x} onClick={() => toggle('experience', x)}>
                {x}
              </FilterChip>
            ))}
          </FilterGroup>

          <Div>
            <P className="mb-3 text-title-sm text-ink-900">Consultation fee</P>
            <Div className="px-1">
              <FeeRange min={filters.feeMin} max={filters.feeMax} onChange={(feeMin, feeMax) => update({ feeMin, feeMax })} />
              <Div className="mt-3 flex-row justify-between text-body-sm font-semibold text-ink-700">
                <Span>{rupee(filters.feeMin)}</Span>
                <Span>{rupee(filters.feeMax)}{filters.feeMax >= FEE_CEILING ? '+' : ''}</Span>
              </Div>
            </Div>
          </Div>

          <FilterGroup title="Gender">
            {GENDERS.map((x) => (
              <FilterChip key={x} active={filters.gender === x} onClick={() => update({ gender: x })}>
                {x}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup title="Language">
            {LANGUAGES.map((x) => (
              <FilterChip
                key={x}
                active={filters.languages.includes(x)}
                onClick={() =>
                  update({
                    languages: filters.languages.includes(x)
                      ? filters.languages.filter((l) => l !== x)
                      : [...filters.languages, x],
                  })
                }
              >
                {x}
              </FilterChip>
            ))}
          </FilterGroup>

          <FilterGroup title="Location">
            {DISTANCES.map((x) => (
              <FilterChip key={x} active={filters.distance === x} onClick={() => toggle('distance', x)} icon={<MapPin className="h-[12px] w-[12px]" />}>
                {x}
              </FilterChip>
            ))}
          </FilterGroup>
        </Div>
      </BottomSheet>
    </Screen>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Div>
      <P className="mb-2.5 text-title-sm text-ink-900">{title}</P>
      <Div className="flex-row flex-wrap gap-2">{children}</Div>
    </Div>
  )
}

/* ================================================== 11 — Doctor list ====== */

const SORTS: SortKey[] = ['Relevance', 'Rating', 'Experience', 'Fee: low to high', 'Distance']

export function DoctorListScreen() {
  const nav = useNav()
  const pristine = useDiscovery((s) => s.pristine)
  const query = useDiscovery((s) => s.query)
  const applySort = useDiscovery((s) => s.applySort)
  const result = useDoctorSearch(query)
  const found = result.data ?? []
  const availableToday = found.filter((d) => d.availableToday).length
  const title = pristine ? 'Cardiologists' : listingTitle(query)
  const subtitle = pristine ? '38 doctors available' : `${plural(found.length, 'doctor')} available`

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <ScreenHeader
          embedded
          title={title}
          subtitle={subtitle}
          border={false}
          right={
            <IconButton size={36} label="Filters" onClick={() => nav.navigate('doctor-filters', { from: 'doctor-list' })}>
              <SlidersHorizontal className="h-[17px] w-[17px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          }
        />
        <Div className="border-b border-ink-100 pb-3">
          <HScroll gap={8}>
            {SORTS.map((s) => (
              <FilterChip key={s} active={query.sort === s} onClick={() => applySort(s)}>
                {s}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="flex-row items-center justify-between px-5 pb-2 pt-3">
        <P className="text-caption text-ink-400">Showing {found.length} of {pristine ? 38 : found.length}</P>
        <Span className="flex-row items-center gap-1 text-caption font-semibold text-vital-700">
          <Span className="h-[5px] w-[5px] rounded-full bg-vital-600" />{`${availableToday} available today`}
        </Span>
      </Div>

      <Div className="gap-2.5 px-5 pb-[112px]">
        {result.isPending ? (
          [0, 1, 2, 3].map((i) => <SkeletonDoctorCard key={i} />)
        ) : result.isError ? (
          <ApiErrorBody onRetry={() => result.refetch()} />
        ) : found.length ? (
          <DoctorResults doctors={found} />
        ) : (
          <NoResultsBody
            body={
              query.text.trim()
                ? `We couldn’t find a doctor for “${query.text.trim()}”. Try widening the distance or removing a filter.`
                : 'No doctors match these filters. Try widening the distance or removing a filter.'
            }
          />
        )}
      </Div>

      <BottomNav active="doctors" />
    </Screen>
  )
}

/* =============================================== 12 — Doctor profile ====== */

export function DoctorProfileScreen() {
  const nav = useNav()
  const d = useSelectedDoctor()
  const { memberPrice } = usePricing()
  const booking = useBooking()
  const saved = useDiscovery((s) => s.savedDoctorIds.includes(d.id))
  const toggleSaved = useDiscovery((s) => s.toggleSaved)
  const reviews = reviewsFor(d.id)
  const days = [
    { date: 5, dow: 'Sun', slots: 4 },
    { date: 6, dow: 'Mon', slots: 9 },
    { date: 7, dow: 'Tue', slots: 7 },
    { date: 8, dow: 'Wed', slots: 0, disabled: true },
    { date: 9, dow: 'Thu', slots: 11 },
    { date: 10, dow: 'Fri', slots: 6 },
  ]

  return (
    <Screen background="bg-canvas" padTop={false} padBottom={false}>
      <Div className=" h-full overflow-y-auto pb-[120px]">
        {/* Hero */}
        <Div className="relative h-[330px] w-full overflow-hidden bg-ink-100">
          <Img src={d.photo} alt={d.name} className="h-full w-full object-cover" style={{ objectPosition: 'center 20%' }} />
          <Div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(0deg, rgba(5,14,25,.93) 0%, rgba(5,14,25,.72) 26%, rgba(5,14,25,.18) 58%, rgba(5,14,25,.38) 100%)',
            }}
          />

          <Div className="absolute inset-x-0 flex-row items-center justify-between px-4" style={{ top: DEVICE.safeTop + 4 }}>
            <IconButton size={38} tone="glass" label="Back" onClick={nav.back}>
              <ChevronRight className="h-[20px] w-[20px] rotate-180" strokeWidth={2.4} />
            </IconButton>
            <Div className="flex-row gap-2">
              <IconButton size={38} tone="glass" label="Share" onClick={() => showToast('Profile link copied', 'success', d.name)}>
                <Share2 className="h-[16px] w-[16px]" strokeWidth={2.2} />
              </IconButton>
              <IconButton
                size={38}
                tone={saved ? 'glassActive' : 'glass'}
                label="Save"
                onClick={() => {
                  toggleSaved(d.id)
                  showToast(saved ? 'Removed from saved doctors' : 'Saved to your doctors')
                }}
              >
                <Heart className="h-[16px] w-[16px]" strokeWidth={2.2} />
              </IconButton>
            </Div>
          </Div>

          <Div className="absolute inset-x-0 bottom-0 px-5 pb-9">
            <Div className="flex-row items-center gap-1.5">
              <P className="text-title-lg text-white">{d.name}</P>
              <VerifiedMark size={18} />
            </Div>
            <P className="mt-1 text-body-lg font-medium text-white/85">{d.specialty}</P>
            <P className="mt-0.5 text-body-sm text-white/65">{d.qualification}</P>
            <Div className="mt-2.5 flex-row items-center gap-2 text-body-sm text-white/80">
              <Building2 className="h-[14px] w-[14px]" strokeWidth={2.1} />
              {d.hospital} · {d.locality}
            </Div>
          </Div>
        </Div>

        {/* Credibility strip */}
        <Div className="relative z-10 mx-5 -mt-6  grid-cols-4 divide-x divide-ink-100 rounded-card bg-white py-3.5 shadow-card">
          <Stat value={`${d.experience}+`} label="Years" Icon={Award} />
          <Stat value={`${(d.consults / 1000).toFixed(1)}k`} label="Consults" Icon={Users} />
          <Stat value={d.rating.toFixed(1)} label="Rating" Icon={Heart} />
          <Stat value={`${d.recommendPct}%`} label="Recommend" Icon={ThumbsUp} />
        </Div>

        {/* Fees */}
        <Div className="mt-5 px-5">
          <SectionHeader title="Consultation fees" className="!px-0 pb-3" />
          <Div className=" grid-cols-3 gap-2.5">
            {(['video', 'audio', 'clinic'] as ConsultMode[]).map((m) => (
              <Div key={m} className="rounded-tile bg-white p-3 shadow-tile">
                <ModeIcon mode={m} size={16} />
                <P className="mt-2 text-[11px] font-semibold text-ink-500">{MODE[m].label}</P>
                <P className="mt-0.5 text-title-sm text-ink-900">
                  {rupee(memberPrice(d.fees[m], 'consultations'))}
                </P>
                {memberPrice(d.fees[m], 'consultations') !== d.fees[m] && (
                  <P className="text-caption tabular-nums text-ink-300 line-through">{rupee(d.fees[m])}</P>
                )}
              </Div>
            ))}
          </Div>
        </Div>

        {/* Availability */}
        <Div className="mt-6">
          <SectionHeader title="Next availability" action="Full calendar" onAction={() => nav.navigate('select-date')} className="pb-3" />
          <DateStrip
            days={days}
            selected={booking.date.day}
            onSelect={(day) => {
              booking.setDate({ ...MOCK_TODAY, day })
              nav.navigate('select-slot')
            }}
          />
        </Div>

        {/* About */}
        <Div className="mt-6 px-5">
          <SectionHeader title="About" className="!px-0 pb-2.5" />
          <Card elevation="tile">
            <P className="text-body leading-[22px] text-ink-600">{d.about}</P>
          </Card>
        </Div>

        {/* Credentials */}
        <Div className="mt-5 px-5">
          <SectionHeader title="Qualifications & experience" className="!px-0 pb-2.5" />
          <Card elevation="tile" padded={false} className="p-4">
            {d.credentials.map((c) => (
              <React.Fragment key={c.title}>
                <Credential title={c.title} org={c.org} years={c.years} />
                <Divider className="my-3.5" />
              </React.Fragment>
            ))}
            <Div className="flex-row items-center gap-2 text-caption text-ink-400">
              <Award className="h-[13px] w-[13px]" strokeWidth={2.2} />
              Reg. No. {d.regNo} · Telangana State Medical Council
            </Div>
          </Card>
        </Div>

        {/* Specialisation */}
        <Div className="mt-5 px-5">
          <SectionHeader title="Areas of specialisation" className="!px-0 pb-2.5" />
          <Div className="flex-row flex-wrap gap-2">
            {d.areas.map((s) => (
              <MetaChip key={s} className="!bg-white !py-1.5 shadow-tile">
                {s}
              </MetaChip>
            ))}
          </Div>
        </Div>

        {/* Languages */}
        <Div className="mt-5 px-5">
          <Card elevation="tile">
            <Div className="flex-row items-center gap-3">
              <Languages className="h-[18px] w-[18px] shrink-0 text-brand-600" strokeWidth={2.1} />
              <Div className="min-w-0">
                <P className="text-body-sm font-semibold text-ink-900">Speaks {d.languages.join(', ')}</P>
                <P className="mt-0.5 text-caption text-ink-400">Consultations available in all listed languages</P>
              </Div>
            </Div>
          </Card>
        </Div>

        {/* Reviews */}
        <Div className="mt-6">
          <SectionHeader
            title={`Reviews (${d.reviews.toLocaleString('en-IN')})`}
            action="See all"
            onAction={() => showToast('Showing the most recent reviews', 'info')}
            className="pb-3"
          />
          <Div className="px-5">
            <Card elevation="tile" className="mb-2.5">
              <Div className="flex-row items-center gap-5">
                <Div className="text-center">
                  <P className="font-display text-[34px] font-extrabold leading-none tabular-nums text-ink-900">
                    {d.rating.toFixed(1)}
                  </P>
                  <Div className="mt-1.5">
                    <Rating value={d.rating} showValue={false} size={13} />
                  </Div>
                  <P className="mt-1 text-caption text-ink-400">{d.reviews.toLocaleString('en-IN')} ratings</P>
                </Div>
                <Div className="flex-1 gap-1.5">
                  {[
                    { n: 5, pct: 86 },
                    { n: 4, pct: 10 },
                    { n: 3, pct: 3 },
                    { n: 2, pct: 1 },
                    { n: 1, pct: 0 },
                  ].map((r) => (
                    <Div key={r.n} className="flex-row items-center gap-2">
                      <Span className="w-[8px] text-caption tabular-nums text-ink-400">{r.n}</Span>
                      <Div className="h-[5px] flex-1 overflow-hidden rounded-full bg-ink-100">
                        <Div className="h-full rounded-full bg-caution-600" style={{ width: `${r.pct}%` }} />
                      </Div>
                      <Span className="w-[26px] whitespace-nowrap text-right text-caption tabular-nums text-ink-400" style={{ marginLeft: -6, width: 32 }}>{r.pct}%</Span>
                    </Div>
                  ))}
                </Div>
              </Div>
            </Card>
          </Div>

          <HScroll>
            {reviews.map((r) => (
              <Div key={r.id} className="w-[290px] shrink-0 rounded-card bg-white p-4 shadow-tile">
                <Div className="flex-row items-center gap-2.5">
                  <Avatar name={r.name} size={32} />
                  <Div className="min-w-0 flex-1">
                    <P className="truncate text-body-sm font-bold text-ink-900">{r.name}</P>
                    <P className="truncate text-caption text-ink-400">
                      {r.mode} · {r.when}
                    </P>
                  </Div>
                  <Rating value={r.rating} showValue={false} size={12} />
                </Div>
                <P className="mt-3 text-body-sm leading-[19px] text-ink-600">{r.text}</P>
              </Div>
            ))}
          </HScroll>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row items-center gap-3">
          <Div className="min-w-0">
            <P className="text-caption text-ink-400">Starts from</P>
            <Span className="inline-flex flex-row items-baseline gap-1.5">
              <Span className="text-title-sm text-ink-900">{rupee(memberPrice(d.fees.audio, 'consultations'))}</Span>
              {memberPrice(d.fees.audio, 'consultations') !== d.fees.audio && (
                <>
                  <Span className="text-caption tabular-nums text-ink-300 line-through">{rupee(d.fees.audio)}</Span>
                  <PlusTag size="xs" />
                </>
              )}
            </Span>
          </Div>
          <Button className="flex-1" onClick={() => nav.navigate('consult-type')}>
            Book Consultation
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

function Stat({ value, label, Icon }: { value: string; label: string; Icon: React.ComponentType<any> }) {
  return (
    <Div className=" flex-col items-center px-1">
      <Icon className="h-[14px] w-[14px] text-brand-600" strokeWidth={2.2} />
      <P className="mt-1.5 text-title-sm tabular-nums text-ink-900">{value}</P>
      <P className="mt-[1px] text-[10.5px] text-ink-400">{label}</P>
    </Div>
  )
}

function Credential({ title, org, years }: { title: string; org: string; years: string }) {
  return (
    <Div className="flex-row gap-3">
      <Span className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-brand-600" />
      <Div className="min-w-0 flex-1">
        <P className="text-body-lg font-semibold text-ink-900">{title}</P>
        <P className="mt-0.5 text-body-sm leading-[18px] text-ink-500">{org}</P>
        <P className="mt-1 text-caption text-ink-400">{years}</P>
      </Div>
    </Div>
  )
}
