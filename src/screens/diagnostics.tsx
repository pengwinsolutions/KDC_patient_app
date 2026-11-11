import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import { Modal as NativeModal, ScrollView } from 'react-native'
import {
  FlaskConical,
  Maximize2,
  ZoomIn,
  FileText,
  Image as ImageIcon,
  Scan,
  Home,
  Building2,
  Clock,
  ShieldCheck,
  Check,
  Download,
  Share2,
  MapPin,
  Phone,
  Droplet,
  Activity,
  HeartPulse,
  Stethoscope,
  ChevronRight,
  AlertTriangle,
  CalendarDays,
  Microscope,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, BottomNav, HScroll } from '../components/ui/Nav'
import { SearchInput } from '../components/ui/Inputs'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import {
  Card,
  SectionHeader,
  StatusBadge,
  MetaChip,
  Divider,
  KeyValue,
  FilterChip,
} from '../components/ui/Display'
import { Banner, Modal, Skeleton, Timeline, type TimelineStep } from '../components/ui/Feedback'
import { SlotGroup, DateStrip } from '../components/ui/Scheduling'
import { TestCard, LabCard, AddressCard } from '../components/cards/index'
import { ReportPage, PAGE_W, PAGE_H } from '../components/ui/ReportPage'
import { rupee } from '../mock-data/mock'
import { SCENE } from '../mock-data/media'
import { MemberDiscountLine, PlusTag } from '../components/ui/Membership'
import { useNav } from '../navigation/navigation'
import type { LabTest } from '../types'
import { getLab, getTest, getTestDetail, labReport, useCatalog } from '../store/catalog'
import { PREVIEW_BILLED_TEST, PREVIEW_DETAIL_TEST, useDiagnosticsDraft } from '../store/diagnosticsDraft'
import { diagnosticOrderById, useOrders } from '../store/orders'
import { useAddresses } from '../store/addresses'
import { usePayments } from '../store/payments'
import { showToast } from '../store/toast'
import { usePricing } from '../hooks/usePricing'
import { useNow } from '../hooks/useNow'
import { useTestSearch } from '../hooks/queries'
import { cheapestLabPrice, searchReports, sortLabs, type LabSort, type ReportFilter, type TestFilter } from '../domain/catalogue'
import { collectionWindow, diagnosticSlots, formatShort } from '../domain/schedule'
import { currentStage, DIAGNOSTIC_STAGES, stageState } from '../domain/orderTracking'
import { labTestPrice } from '../domain/pricing'
import { NoResultsBody } from './states'

const STAGE_CAPTION = ['Booking confirmed', 'Technician assigned', 'Awaiting collection', 'Processing at lab', 'Report ready']

/** Opens a test's page, and starts a booking for it, from any list. */
function useTestActions() {
  const nav = useNav()
  return (t: LabTest) => ({
    onClick: () => nav.navigate('test-detail', { params: { id: t.id } }),
    onBook: () => {
      useDiagnosticsDraft.getState().setTest(t.id)
      nav.navigate('lab-select')
    },
  })
}

/** Lab price of the booking's test, reduced for a walk-in. */
function useDraftPrice() {
  const testId = useDiagnosticsDraft((s) => s.testId)
  const labId = useDiagnosticsDraft((s) => s.labId)
  const method = useDiagnosticsDraft((s) => s.method)
  const test = getTest(testId ?? PREVIEW_BILLED_TEST)
  const lab = getLab(labId)
  return labTestPrice(test.price, lab.price) - (method === 'Lab Visit' ? 50 : 0)
}

const CAT_ICON: Record<string, React.ComponentType<any>> = {
  'Full Body Checkup': Stethoscope,
  Diabetes: Droplet,
  Thyroid: Activity,
  Vitamin: FlaskConical,
  Cardiac: HeartPulse,
  Liver: Microscope,
  Kidney: Microscope,
  'Women’s Health': Activity,
}

/* =========================================== 35 — Diagnostics home ======== */

export function DiagnosticsHomeScreen() {
  const nav = useNav()
  const labTests = useCatalog((s) => s.labTests)
  const testCategories = useCatalog((s) => s.testCategories)
  const actions = useTestActions()
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="pb-[112px]">
        <Div className="bg-white px-5 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
          <P className="pt-3 text-title-lg text-ink-900">Diagnostics made simple</P>
          <P className="mt-1 text-body text-ink-500">NABL-accredited labs, sample collected at home.</P>
          <Div className="mt-4">
            <SearchInput placeholder="Search tests" readOnly onClick={() => nav.navigate('test-search', { params: { q: '' } })} />
          </Div>
        </Div>

        {/* Home collection promo */}
        <Div className="px-5 pt-4">
          <Btn
            onPress={() => nav.navigate('collection-method')}
            className="tap relative w-full overflow-hidden rounded-card text-left shadow-card"
          >
            <Img src={SCENE.homeCollection} alt="" className="h-[134px] w-full object-cover" />
            <Div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(90deg, rgba(6,20,36,.92) 0%, rgba(6,20,36,.72) 48%, rgba(6,20,36,.2) 100%)' }}
            />
            <Div className="absolute inset-0  flex-col justify-center px-4">
              <Span className="w-fit rounded-[6px] bg-vital-600 px-2 py-[3px] text-[9.5px] font-bold uppercase tracking-[.05em] text-white">
                Free
              </Span>
              <P className="mt-2 text-title-sm text-white">Home sample collection</P>
              <P className="mt-1 max-w-[220px] text-body-sm leading-[18px] text-white/75">
                A trained phlebotomist visits you. Reports in 12 hours.
              </P>
            </Div>
          </Btn>
        </Div>

        {/* Categories */}
        <Div className="pt-6">
          <SectionHeader title="Popular categories" className="pb-3" />
          <Div className=" grid-cols-4 gap-2.5 px-5">
            {testCategories.map((c) => {
              const Icon = CAT_ICON[c.name] ?? FlaskConical
              return (
                <Btn
                  key={c.id}
                  onPress={() => nav.navigate('test-search', { params: { q: '', category: c.name } })}
                  className="tap  flex-col items-center gap-2 rounded-card bg-white px-1 py-3 shadow-tile"
                >
                  <Span className="flex-col h-[36px] w-[36px] items-center justify-center rounded-tile bg-brand-50">
                    <Icon className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
                  </Span>
                  <Span className="text-center text-[10px] font-bold leading-[12px] text-ink-900">{c.name}</Span>
                </Btn>
              )
            })}
          </Div>
        </Div>

        {/* Health packages */}
        <Div className="pt-6">
          <SectionHeader
            title="Health packages"
            subtitle="Comprehensive screening"
            action="See all"
            onAction={() => nav.navigate('test-search', { params: { q: '', category: 'Full Body Checkup' } })}
            className="pb-3"
          />
          <HScroll>
            {[labTests[7], labTests[1], labTests[3]].map((t) => (
              <Btn
                key={t.id}
                onPress={() => nav.navigate('test-detail', { params: { id: t.id } })}
                className="tap w-[250px] shrink-0 rounded-card bg-white p-4 text-left shadow-tile"
              >
                <Div className="flex-row items-start justify-between gap-2">
                  <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
                    <FlaskConical className="h-[18px] w-[18px] text-brand-600" strokeWidth={2} />
                  </Span>
                  <StatusBadge tone="success">
                    {Math.round(((t.mrp - t.price) / t.mrp) * 100)}% off
                  </StatusBadge>
                </Div>
                <P className="mt-3 text-title-sm leading-[21px] text-ink-900">{t.short}</P>
                <P className="mt-1 text-body-sm text-ink-500">{t.parameters} parameters</P>
                <Div className="mt-3 flex-row items-baseline gap-1.5 border-t border-ink-100 pt-3">
                  <Span className="text-title-sm text-ink-900">{rupee(t.price)}</Span>
                  <Span className="text-caption text-ink-300 line-through">{rupee(t.mrp)}</Span>
                </Div>
              </Btn>
            ))}
          </HScroll>
        </Div>

        {/* Frequently booked */}
        <Div className="pt-6">
          <SectionHeader title="Frequently booked tests" action="See all" onAction={() => nav.navigate('test-search', { params: { q: '' } })} className="pb-3" />
          <Div className="gap-2.5 px-5">
            {labTests.slice(0, 3).map((t) => (
              <TestCard key={t.id} test={t} {...actions(t)} />
            ))}
          </Div>
        </Div>

        {/* Trust */}
        <Div className="px-5 pt-6">
          <Div className=" grid-cols-3 gap-2.5">
            {[
              { Icon: ShieldCheck, label: 'NABL accredited' },
              { Icon: Clock, label: 'Reports in 12 hrs' },
              { Icon: Home, label: 'Free collection' },
            ].map((a) => (
              <Div key={a.label} className=" flex-col items-center gap-1.5 rounded-tile bg-white px-2 py-3 shadow-tile">
                <a.Icon className="h-[16px] w-[16px] text-vital-600" strokeWidth={2.1} />
                <Span className="text-center text-[10.5px] font-semibold leading-[13px] text-ink-700">{a.label}</Span>
              </Div>
            ))}
          </Div>
        </Div>
      </Div>

      <BottomNav active="orders" />
    </Screen>
  )
}

/* ================================================ 36 — Test search ======== */

const TEST_FILTERS: TestFilter[] = ['All', 'Home collection', 'No fasting', 'Under ₹700', 'Same-day report']

export function TestSearchScreen() {
  const nav = useNav()
  const actions = useTestActions()
  const category: string | undefined = nav.params.category
  /* The first view previews a typed query over the whole catalogue. */
  const [text, setText] = React.useState<string | null>(nav.params.q ?? null)
  const [filter, setFilter] = React.useState<TestFilter>('All')
  const result = useTestSearch({ text: text ?? '', filter, category })
  const found = result.data ?? []
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <ScreenHeader embedded title="Search tests" subtitle={category} border={false} />
        <Div className="px-5 pb-3">
          <SearchInput placeholder="Search tests" value={text ?? 'profile'} onChange={setText} />
        </Div>
        <Div className="pb-3">
          <HScroll gap={8}>
            {TEST_FILTERS.map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="px-5 pb-[40px] pt-4">
        <P className="mb-2.5 text-caption text-ink-400">{found.length} tests found</P>
        <Div className="gap-2.5">
          {result.isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[150px] w-full" rounded={20} />)
          ) : found.length ? (
            found.map((t) => <TestCard key={t.id} test={t} {...actions(t)} />)
          ) : (
            <NoResultsBody body="We couldn’t find that test. Check the spelling or browse the categories." />
          )}
        </Div>
      </Div>
    </Screen>
  )
}

/* ================================================ 37 — Test detail ======== */

export function TestDetailScreen() {
  const nav = useNav()
  const t = getTest(nav.params.id ?? PREVIEW_DETAIL_TEST)
  const detail = getTestDetail(t.id)
  const labs = useCatalog((s) => s.labs)
  const { memberPrice } = usePricing()
  const off = Math.round(((t.mrp - t.price) / t.mrp) * 100)
  const startsFrom = nav.params.id ? cheapestLabPrice(t, labs) : 480

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Test details" />

      <Div className="flex-1 pb-[130px]">
        <Div className="bg-white px-5 pb-5 pt-2">
          <Div className="flex-row items-start gap-3.5">
            <Span className="flex-col h-[48px] w-[48px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
              <FlaskConical className="h-[22px] w-[22px] text-brand-600" strokeWidth={2} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-md leading-[25px] text-ink-900">{t.name}</P>
              <P className="mt-1 text-body-sm text-ink-500">{t.parameters} parameters included</P>
            </Div>
          </Div>

          <Div className="mt-4 flex-row items-end justify-between">
            <Div className="flex-row items-baseline gap-2">
              <Span className="font-display text-[26px] font-extrabold tabular-nums text-ink-900">
                {rupee(memberPrice(t.price, 'diagnostics'))}
              </Span>
              <Span className="text-body text-ink-300 line-through">
                {rupee(memberPrice(t.price, 'diagnostics') !== t.price ? t.price : t.mrp)}
              </Span>
              {memberPrice(t.price, 'diagnostics') !== t.price ? (
                <PlusTag size="xs" />
              ) : (
                <Span className="text-body-sm font-bold text-vital-600">{off}% off</Span>
              )}
            </Div>
            <StatusBadge tone="brand" dot>
              {t.category}
            </StatusBadge>
          </Div>

          <Div className="mt-4  grid-cols-3 divide-x divide-ink-100 rounded-tile bg-ink-50 py-3">
            <Fact label="Fasting" value={t.fasting} />
            <Fact label="Report in" value={t.reportIn} />
            <Fact label="Collection" value={t.homeCollection ? 'Home / Lab' : 'Lab only'} />
          </Div>
        </Div>

        <Div className="mt-3 gap-3 px-5">
          <Card elevation="tile">
            <P className="mb-1.5 text-title-sm text-ink-900">What this test measures</P>
            <P className="text-body leading-[22px] text-ink-600">{t.description}</P>
          </Card>

          {/* Preparation is primary clinical content, not fine print */}
          <Card elevation="tile" className="!bg-caution-50">
            <Div className="flex-row items-center gap-2.5">
              <AlertTriangle className="h-[17px] w-[17px] shrink-0 text-caution-700" strokeWidth={2.2} />
              <P className="text-title-sm text-caution-700">How to prepare</P>
            </Div>
            <Div className="mt-3 gap-2.5">
              {t.prep.map((p) => (
                <Div key={p} className="flex-row gap-2.5 text-body leading-[21px] text-caution-700/90">
                  <Span className="mt-[8px] h-[5px] w-[5px] shrink-0 rounded-full bg-caution-600" />
                  {p}
                </Div>
              ))}
            </Div>
          </Card>

          <Card elevation="tile">
            <P className="mb-2.5 text-title-sm text-ink-900">Parameters covered</P>
            <Div className="flex-row flex-wrap gap-1.5">
              {detail.covers.map((p) => (
                <MetaChip key={p}>{p}</MetaChip>
              ))}
            </Div>
          </Card>

          <Card elevation="tile">
            <P className="mb-2.5 text-title-sm text-ink-900">Who should take this test</P>
            <Div className="gap-2">
              {detail.audience.map((x) => (
                <Div key={x} className="flex-row gap-2.5 text-body leading-[21px] text-ink-600">
                  <Check className="mt-[4px] h-[14px] w-[14px] shrink-0 text-vital-600" strokeWidth={3} />
                  {x}
                </Div>
              ))}
            </Div>
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row items-center gap-3">
          <Div className="min-w-0">
            <P className="text-caption text-ink-400">Starts from</P>
            <P className="text-title-sm text-ink-900">{rupee(startsFrom)}</P>
          </Div>
          <Button
            className="flex-1"
            onClick={() => {
              useDiagnosticsDraft.getState().setTest(t.id)
              nav.navigate('lab-select')
            }}
          >
            Book Test
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Div className="px-2 text-center">
      <P className="text-[10px] font-semibold uppercase tracking-[.05em] text-ink-400">{label}</P>
      <P className="mt-1 text-[12.5px] font-bold leading-[16px] text-ink-900">{value}</P>
    </Div>
  )
}

/* =============================================== 38 — Lab selection ======= */

const LAB_SORTS: LabSort[] = ['Nearest', 'Lowest price', 'Highest rated', 'Fastest report']

export function LabSelectScreen() {
  const nav = useNav()
  const labs = useCatalog((s) => s.labs)
  const draft = useDiagnosticsDraft()
  const [sort, setSort] = React.useState<LabSort>('Nearest')
  const described = getTest(draft.testId ?? PREVIEW_DETAIL_TEST)
  const billed = getTest(draft.testId ?? PREVIEW_BILLED_TEST)
  const selected = getLab(draft.labId)
  const sorted = sortLabs(labs, sort)
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Choose a lab" subtitle={described.name} />

      <Div className="flex-1 px-5 pb-[120px] pt-4">
        <Div className="mb-3.5">
          <HScroll gap={8} padX={0}>
            {LAB_SORTS.map((f) => (
              <FilterChip key={f} active={sort === f} onClick={() => setSort(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>

        <Div className="gap-2.5">
          {sorted.map((l) => (
            <LabCard
              key={l.id}
              lab={l}
              price={labTestPrice(billed.price, l.price)}
              selected={l.id === draft.labId}
              onClick={() => {
                draft.setLab(l.id)
                nav.navigate('collection-method')
              }}
            />
          ))}
        </Div>

        <Div className="mt-4">
          <Banner
            tone="brand"
            icon={<ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="All KDC+ partner labs are NABL accredited"
            body="Samples are processed under national quality standards and reviewed by a registered pathologist."
          />
        </Div>
      </Div>

      <StickyBar>
        <Div className="mb-3 flex-row items-center justify-between">
          <Span className="text-body-sm text-ink-500">{selected.name} · {selected.distanceKm} km</Span>
          <Span className="text-title-sm text-ink-900">{rupee(labTestPrice(billed.price, selected.price))}</Span>
        </Div>
        <Button onClick={() => nav.navigate('collection-method')}>Continue</Button>
      </StickyBar>
    </Screen>
  )
}

/* =========================================== 39 — Collection method ======= */

/** The address the sample will be collected from. */
function CollectionAddress() {
  const nav = useNav()
  const address = useAddresses((s) => s.items.find((a) => a.id === s.selectedId))
  return (
    <>
      <SectionHeader title="Collection address" action="Change" onAction={() => nav.navigate('addresses')} className="!px-0 pb-2.5" />
      {address && <AddressCard a={address} selected onClick={() => nav.navigate('addresses')} />}
    </>
  )
}

export function CollectionMethodScreen() {
  const nav = useNav()
  const draft = useDiagnosticsDraft()
  const lab = getLab(draft.labId)
  const options = [
    {
      id: 'Home Collection' as const,
      Icon: Home,
      title: 'Home collection',
      blurb: 'A trained phlebotomist visits your address and collects the sample.',
      price: 'Free',
      points: ['No travel, no waiting', 'Early-morning slots from 6:30 AM', 'Sealed, barcoded sample tubes'],
      tag: 'Recommended',
    },
    {
      id: 'Lab Visit' as const,
      Icon: Building2,
      title: 'Visit the lab',
      blurb: 'Walk in to the partner lab at a time that suits you.',
      price: `Save ${rupee(50)}`,
      points: ['No appointment needed', 'Report may be ready sooner', 'Open 7:00 AM – 9:00 PM'],
    },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Collection method" subtitle={lab.name} />

      <Div className="flex-1 px-5 pb-[120px] pt-4">
        <Div className="gap-3">
          {options.map((o) => {
            const selected = draft.method === o.id
            return (
            <Btn
              key={o.id}
              onPress={() => {
                draft.setMethod(o.id)
                nav.navigate('diagnostic-slot')
              }}
              className={`tap relative w-full overflow-hidden rounded-card bg-white p-4 text-left  ${
                selected ? 'ring-[1.5px] ring-inset  ring-brand-600 shadow-card' : 'shadow-tile'
              }`}
            >
              {o.tag && (
                <Span className="absolute right-0 top-0 rounded-bl-[12px] bg-brand-600 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[.05em] text-white">
                  {o.tag}
                </Span>
              )}
              <Div className="flex-row items-start gap-3.5">
                <Span
                  className={`flex-col h-[46px] w-[46px] shrink-0 items-center justify-center rounded-tile ${
                    selected ? 'bg-brand-600' : 'bg-brand-50'
                  }`}
                >
                  <o.Icon className={`h-[21px] w-[21px] ${selected ? 'text-white' : 'text-brand-600'}`} strokeWidth={2} />
                </Span>
                <Div className="min-w-0 flex-1 pr-14">
                  <P className="text-title-sm text-ink-900">{o.title}</P>
                  <P className="mt-1 text-body-sm leading-[19px] text-ink-500">{o.blurb}</P>
                </Div>
              </Div>

              <Div className="mt-3 gap-1.5">
                {o.points.map((p) => (
                  <Div key={p} className="flex-row gap-2 text-body-sm text-ink-600">
                    <Check className="mt-[3px] h-[13px] w-[13px] shrink-0 text-vital-600" strokeWidth={3} />
                    {p}
                  </Div>
                ))}
              </Div>

              <Div className="mt-3.5 flex-row items-center justify-between border-t border-ink-100 pt-3.5">
                <Span className="text-body-sm font-bold text-vital-700">{o.price}</Span>
                <ChevronRight className="h-[16px] w-[16px] text-ink-300" />
              </Div>
            </Btn>
            )
          })}
        </Div>

        {draft.method === 'Home Collection' && (
          <Div className="mt-4">
            <CollectionAddress />
          </Div>
        )}
      </Div>

      <StickyBar>
        <Button onClick={() => nav.navigate('diagnostic-slot')}>Continue</Button>
      </StickyBar>
    </Screen>
  )
}

/* ============================================== 40 — Diagnostic slot ====== */

export function DiagnosticSlotScreen() {
  const nav = useNav()
  const draft = useDiagnosticsDraft()
  const pricing = usePricing()
  const price = useDraftPrice()
  const described = getTest(draft.testId ?? PREVIEW_DETAIL_TEST)
  const groups = diagnosticSlots(draft.date.day, draft.time)
  const window = draft.time ? collectionWindow(draft.time) : null
  const member = pricing.memberPrice(price, 'diagnostics')
  const days = [
    { date: 6, dow: 'Mon', slots: 3 },
    { date: 7, dow: 'Tue', slots: 8 },
    { date: 8, dow: 'Wed', slots: 6 },
    { date: 9, dow: 'Thu', slots: 0, disabled: true },
    { date: 10, dow: 'Fri', slots: 9 },
    { date: 11, dow: 'Sat', slots: 5 },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Pick a slot" subtitle={draft.method === 'Home Collection' ? 'Home collection' : 'Lab visit'} />

      <Div className="flex-1 pb-[140px] pt-3">
        {described.fasting !== 'Not required' && (
          <Div className="mb-4 px-5">
            <Banner
              tone="caution"
              icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.2} />}
              title={`This test needs ${described.fasting} of fasting`}
              body="Early-morning slots are recommended so you can fast overnight."
            />
          </Div>
        )}

        <SectionHeader title="Select date" className="pb-3" />
        <DateStrip days={days} selected={draft.date.day} onSelect={draft.setDay} />

        <Div className="mt-6 gap-6 px-5">
          {groups.map((g) => (
            <SlotGroup key={g.period} period={g.period} slots={g.slots} onSelect={draft.setTime} />
          ))}
        </Div>

        {draft.method === 'Home Collection' && (
          <Div className="mt-6 px-5">
            <CollectionAddress />
          </Div>
        )}
      </Div>

      <StickyBar>
        <Div className="mb-3 flex-row items-center gap-2">
          <CalendarDays className="h-[15px] w-[15px] text-brand-600" strokeWidth={2.3} />
          <Span className="text-body-sm font-bold text-ink-900">
            {formatShort(draft.date)} · {window?.tight ?? 'Select a time'}
          </Span>
          <Span className="ml-auto inline-flex flex-row items-baseline gap-1.5">
            <Span className="text-body-sm font-bold text-ink-900">{rupee(member)}</Span>
            {member !== price && (
              <Span className="text-caption text-ink-300 line-through">{rupee(price)}</Span>
            )}
          </Span>
        </Div>
        <Button disabled={!draft.time} onClick={() => nav.navigate('payment', { from: 'diagnostics' })}>
          Proceed to payment
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* ========================================= 41 — Booking confirmation ====== */

export function DiagnosticConfirmScreen() {
  const nav = useNav()
  const orders = useOrders((s) => s.diagnostics)
  const lastId = useOrders((s) => s.lastDiagnosticId)
  const { memberPrice } = usePricing()
  const order = diagnosticOrderById(orders, lastId ?? undefined)
  const test = getTest(order.testId)
  const lab = getLab(order.labId)
  const listed = order.listed ?? test.price
  const paid = order.listed ? order.amount : memberPrice(test.price, 'diagnostics')
  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className="flex-1 px-6 pb-[150px]">
        <Div className=" flex-col items-center pt-9">
          <Div className="relative flex-col h-[88px] w-[88px] items-center justify-center">
            <Span className="absolute inset-0 animate-pulseRing rounded-full bg-vital-600/20" />
            <Span className="relative flex-col h-[64px] w-[64px] items-center justify-center rounded-full bg-vital-600 shadow-[0_10px_28px_-8px_rgba(48,152,64,.6)]">
              <Check className="h-[31px] w-[31px] text-white" strokeWidth={3.2} />
            </Span>
          </Div>
          <P className="mt-6 text-center font-display text-[25px] font-extrabold leading-[30px] tracking-[-0.5px] text-ink-900">
            Test booked
          </P>
          <P className="mt-2 text-center text-body-lg text-ink-500">Booking ID {order.id}</P>
        </Div>

        <Card elevation="card" padded={false} className="mt-6 overflow-hidden">
          <Div className="flex-row items-center gap-3.5 border-b border-ink-100 p-4">
            <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
              <FlaskConical className="h-[20px] w-[20px] text-brand-600" strokeWidth={2} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{test.name}</P>
              <P className="truncate text-body-sm text-ink-500">{test.parameters} parameters</P>
            </Div>
          </Div>
          <Div className="gap-0 p-4">
            <KeyValue label="Lab" value={lab.name} />
            <KeyValue label="Collection" value={order.method} />
            <KeyValue label="Date" value={order.date} />
            <KeyValue label="Slot" value={order.slot} />
            <Divider />
            <Div className="flex-row items-start justify-between gap-6 py-[7px]">
              <Span className="text-body text-ink-500">Address</Span>
              <Span className="max-w-[210px] text-right text-body-sm font-semibold leading-[18px] text-ink-900">
                {order.address}
              </Span>
            </Div>
            <Divider />
            <MemberDiscountLine amount={listed} area="diagnostics" />
            <KeyValue label="Amount paid" value={rupee(paid)} strong />
          </Div>
        </Card>

        <Div className="mt-5 rounded-card bg-caution-50 p-4">
          <Div className="flex-row items-center gap-2.5">
            <AlertTriangle className="h-[16px] w-[16px] shrink-0 text-caution-700" strokeWidth={2.2} />
            <P className="text-body-sm font-bold text-caution-700">Before your collection</P>
          </Div>
          <Div className="mt-2.5 gap-2">
            {test.prep.map((p) => (
              <Div key={p} className="flex-row gap-2.5 text-body-sm leading-[19px] text-caution-700/90">
                <Span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-caution-600" />
                {p}
              </Div>
            ))}
          </Div>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button onClick={() => nav.navigate('diagnostic-tracking', { params: { id: order.id } })}>Track booking</Button>
          <Button variant="tertiary" onClick={() => nav.resetTo('home', 'home')}>
            Back to home
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ============================================ 42 — Diagnostic tracking ==== */

export function DiagnosticTrackingScreen() {
  const nav = useNav()
  const [confirming, setConfirming] = React.useState(false)
  const orders = useOrders((s) => s.diagnostics)
  const now = useNow(5000)
  const b = diagnosticOrderById(orders, nav.params.id)
  const test = getTest(b.testId)
  const lab = getLab(b.labId)
  const stage = currentStage(b, now)
  const finished = stage >= 4
  const cancelled = b.status === 'cancelled'
  const stateFor = (i: number) => stageState(i, stage, finished)
  const initials = b.technician.name.split(' ').map((p) => p[0]).join('').toUpperCase()
  /* Seeded previews show the banner regardless, as the blueprint does. */
  const needsFastingReminder = !cancelled && !finished && (test.fasting !== 'Not required' || b.fixedStage !== undefined)
  const cancelBooking = async () => {
    await useOrders.getState().cancelDiagnostic(b.id)
    usePayments.getState().markRefunded(b.id)
    showToast('Booking cancelled', 'success', 'Your refund is on its way')
    nav.navigate('orders-home', { tab: 'orders' })
  }
  const steps: TimelineStep[] = [
    { title: DIAGNOSTIC_STAGES[0], time: b.stageTimes?.[0], body: `${lab.name} · ${b.method}`, state: stateFor(0) },
    {
      title: DIAGNOSTIC_STAGES[1],
      time: b.stageTimes?.[1],
      body: `${b.technician.name} will collect your sample`,
      state: stateFor(1),
      meta: stage >= 1 && (
        <Div className="flex-row items-center gap-2.5 rounded-tile bg-white p-2.5 shadow-tile">
          <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-brand-50 text-body-sm font-bold text-brand-700">
            {initials}
          </Span>
          <Div className="min-w-0 flex-1">
            <P className="truncate text-body-sm font-bold text-ink-900">{b.technician.name}</P>
            <P className="truncate text-caption text-ink-400">Phlebotomist · ID {b.technician.id}</P>
          </Div>
          <IconButton size={34} tone="brand" label="Call technician" onClick={() => showToast(`Calling ${b.technician.name}`, 'info', b.technician.mobile)}>
            <Phone className="h-[15px] w-[15px]" strokeWidth={2.3} />
          </IconButton>
        </Div>
      ),
    },
    { title: DIAGNOSTIC_STAGES[2], time: b.stageTimes?.[2], body: `Scheduled for ${b.date}, ${b.slot}`, state: stateFor(2) },
    { title: DIAGNOSTIC_STAGES[3], time: b.stageTimes?.[3], body: 'Analysis and pathologist review', state: stateFor(3) },
    {
      title: DIAGNOSTIC_STAGES[4],
      time: b.stageTimes?.[4],
      body: finished ? 'Your report is ready to view' : 'Expected within 12 hours of collection',
      state: stateFor(4),
      meta: (
        <Btn
          onPress={() => nav.navigate(finished ? 'lab-report' : 'st-report-pending')}
          className="tap text-body-sm font-bold text-brand-600"
        >
          {finished ? 'View report →' : 'Check status →'}
        </Btn>
      ),
    },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Track booking" subtitle={b.id} />

      <Div className="flex-1 gap-4 px-5 pb-[112px] pt-4">
        <Div className="rounded-card bg-brand-deep p-4 shadow-card">
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-white/15 ring-1 ring-inset  ring-white/20">
              <Home className="h-[20px] w-[20px] text-white" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-sm text-white">
                {cancelled ? 'Booking cancelled' : `Collection on ${b.date}`}
              </P>
              <P className="mt-0.5 text-body-sm text-white/65">{b.slot} · {b.technician.name}</P>
            </Div>
          </Div>
          <Div className="mt-3.5 flex-row items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Span key={i} className={`h-[4px] flex-1 rounded-full ${i <= stage + 1 ? 'bg-white/90' : 'bg-white/25'}`} />
            ))}
          </Div>
          <P className="mt-2 text-caption text-white/60">Step {stage + 1} of 5 · {STAGE_CAPTION[stage]}</P>
        </Div>

        {needsFastingReminder && (
          <Banner
            tone="caution"
            icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="Fasting required from 9:00 PM tonight"
            body="Water is permitted. Avoid tea, coffee and medication until the sample is drawn."
          />
        )}

        <Card elevation="tile">
          <Timeline steps={steps} />
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-title-sm text-ink-900">Booking details</P>
          <KeyValue label="Test" value={test.short} />
          <KeyValue label="Lab" value={lab.name} />
          <KeyValue label="Amount paid" value={rupee(b.amount)} />
          <Divider className="my-2.5" />
          <Div className="flex-row items-start gap-2.5">
            <MapPin className="mt-[2px] h-[15px] w-[15px] shrink-0 text-ink-400" strokeWidth={2.2} />
            <P className="text-body-sm leading-[19px] text-ink-600">{b.address}</P>
          </Div>
        </Card>

        {!cancelled && !finished && (
          <Button variant="tertiary" className="!text-critical-600" onClick={() => setConfirming(true)}>
            Cancel booking
          </Button>
        )}
      </Div>

      {confirming && (
        <Modal
          tone="critical"
          icon={<AlertTriangle className="h-[26px] w-[26px]" strokeWidth={2} />}
          title="Cancel this collection?"
          body={`${b.technician.name} is already assigned for ${b.date}. ${rupee(b.amount)} will be refunded to the original payment method within 3–5 working days.`}
          actions={
            <>
              <Button variant="danger" onClick={cancelBooking}>
                Yes, cancel booking
              </Button>
              <Button variant="tertiary" onClick={() => setConfirming(false)}>
                Keep my booking
              </Button>
            </>
          }
        />
      )}

      <BottomNav active="orders" />
    </Screen>
  )
}

/* ================================================= 43 — Lab report ======== */

/**
 * A lab issues a document, not a data feed. This screen shows the file the lab
 * actually sent — paged, zoomable, downloadable, forwardable — rather than
 * re-typesetting values the app cannot be certain it parsed correctly.
 */
export function LabReportScreen() {
  const nav = useNav()
  const r = labReport
  const reports = useCatalog((s) => s.labReports)
  const report = reports.find((x) => x.id === nav.params.id)
  const [page, setPage] = React.useState<1 | 2 | 3>(1)
  const [fullScreen, setFullScreen] = React.useState(false)
  const download = (name: string) => showToast('Saved to Files', 'success', name)
  const share = () => showToast('Report link copied', 'success', r.id)
  const pdf = r.files[0]
  /* The preview keeps the blueprint's phone-width page, as the design shows it. */
  const scale = (Math.min(DEVICE.width, 402) - 40) / PAGE_W
  const thumb = 92 / PAGE_W

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader
        title="Lab report"
        subtitle={report?.id ?? r.id}
        right={
          <>
            <IconButton size={36} label="Share" onClick={share}>
              <Share2 className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
            <IconButton size={36} label="Download" onClick={() => download(pdf.name)}>
              <Download className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          </>
        }
      />

      <Div className="flex-1 gap-3 px-5 pb-[130px] pt-4">
        {/* What this is */}
        <Card elevation="tile" padded={false}>
          <Div className="flex-row items-start gap-3.5 p-4">
            <Span className="flex-col h-[42px] w-[42px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
              <FlaskConical className="h-[19px] w-[19px] text-brand-600" strokeWidth={2} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-sm leading-[21px] text-ink-900">{report?.name ?? r.test}</P>
              <P className="mt-0.5 text-body-sm text-ink-500">
                {report?.lab ?? r.lab} · {r.branch.split(',')[0]}
              </P>
            </Div>
            <StatusBadge tone="success" dot>
              Ready
            </StatusBadge>
          </Div>
          <Div className=" grid-cols-2 divide-x divide-ink-100 border-t border-ink-100">
            <Div className="px-4 py-3">
              <P className="text-caption text-ink-400">Sample collected</P>
              <P className="mt-0.5 text-body-sm font-semibold text-ink-900">{r.collected}</P>
            </Div>
            <Div className="px-4 py-3">
              <P className="text-caption text-ink-400">Reported</P>
              <P className="mt-0.5 text-body-sm font-semibold text-ink-900">{r.reported}</P>
            </Div>
          </Div>
        </Card>

        {/* The document itself */}
        <Div>
          <SectionHeader
            title="Report document"
            subtitle={`${pdf.pages} pages · ${pdf.size}`}
            className="!px-0 pb-2.5"
          />

          {/* Viewer chrome sits beside the page, never on top of it — nothing the
              lab printed should be hidden behind an app control. */}
          <Div className="overflow-hidden rounded-tile bg-white shadow-card border border-ink-100">
            <Div className="relative overflow-hidden" style={{ height: PAGE_H * scale }}>
              <Div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                <ReportPage page={page} />
              </Div>
            </Div>

            <Div className="flex-row items-center gap-2 border-t border-ink-100 bg-ink-50/70 px-3 py-2">
              <Span className="text-caption font-semibold tabular-nums text-ink-600">Page {page} of {pdf.pages}</Span>
              <Span className="flex-row items-center gap-1 text-caption text-ink-400">
                <ZoomIn className="h-[12px] w-[12px]" strokeWidth={2.2} />
                Pinch to zoom
              </Span>
              <Btn
                onPress={() => setFullScreen(true)}
                className="tap ml-auto flex-row items-center gap-1.5 rounded-chip bg-ink-900 px-2.5 py-1.5"
              >
                <Maximize2 className="h-[12px] w-[12px] text-white" strokeWidth={2.4} />
                <Span className="text-caption font-semibold text-white">Full screen</Span>
              </Btn>
            </Div>
          </Div>

          {/* Pages */}
          <Div className="mt-3">
            <HScroll gap={10} padX={0}>
              {([1, 2, 3] as const).map((n) => (
                <Btn
                  key={n}
                  onPress={() => setPage(n)}
                  className={`tap relative shrink-0 overflow-hidden rounded-[8px] bg-white  ${
                    n === page ? 'border-[1.5px] border-brand-600' : 'border border-ink-200'
                  }`}
                  style={{ width: 92, height: PAGE_H * thumb, justifyContent: 'flex-start' }}
                >
                  <Div style={{ transform: `scale(${thumb})`, transformOrigin: 'top left' }}>
                    <ReportPage page={n} />
                  </Div>
                  <Span className="absolute inset-x-0 bottom-0 bg-ink-900/70 py-[2px] text-center text-[9px] font-bold text-white">
                    {n}
                  </Span>
                </Btn>
              ))}
            </HScroll>
          </Div>
        </Div>

        {/* Everything the lab sent */}
        <Div>
          <SectionHeader title="Files" className="!px-0 pb-2.5" />
          <Card elevation="tile" padded={false} className="overflow-hidden">
            {r.files.map((f, i, arr) => (
              <Btn
                key={f.id}
                onPress={() => download(f.name)}
                className={`tap flex-row w-full items-center gap-3.5 px-4 py-3.5 text-left ${
                  i < arr.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''
                }`}
              >
                <Span
                  className={`flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${
                    f.kind === 'pdf' ? 'bg-critical-50' : 'bg-ink-50'
                  }`}
                >
                  {f.kind === 'pdf' ? (
                    <FileText className="h-[17px] w-[17px] text-critical-600" strokeWidth={2.1} />
                  ) : (
                    <ImageIcon className="h-[17px] w-[17px] text-ink-500" strokeWidth={2.1} />
                  )}
                </Span>
                <Span className="min-w-0 flex-1">
                  <Span className="block truncate text-body-lg font-semibold text-ink-900">{f.name}</Span>
                  <Span className="block truncate text-caption uppercase tracking-[.04em] text-ink-400">
                    {f.kind} · {f.pages} {f.pages === 1 ? 'page' : 'pages'} · {f.size}
                  </Span>
                </Span>
                <Download className="h-[17px] w-[17px] shrink-0 text-ink-300" strokeWidth={2.2} />
              </Btn>
            ))}
          </Card>
        </Div>

        <Div className="flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
          <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-brand-700">
            This is the original signed report from {r.lab}, stored unaltered. Share it with any doctor, inside KDC+ or
            outside it.
          </P>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row gap-2.5">
          <Button variant="tertiary" block={false} className="w-[54px] !px-0" aria-label="Download" onClick={() => download(pdf.name)}>
            <Download className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Button>
          <Button className="flex-1" onClick={() => nav.navigate('doctor-list', { tab: 'doctors' })}>
            Share with Doctor
          </Button>
        </Div>
      </StickyBar>

      <NativeModal visible={fullScreen} animationType="slide" onRequestClose={() => setFullScreen(false)}>
        <Div className="flex-1 bg-ink-900" style={{ paddingTop: DEVICE.safeTop }}>
          <ScreenHeader embedded tone="dark" transparent title="Page" subtitle={`${page} of ${pdf.pages}`} onBack={() => setFullScreen(false)} />
          <ScrollView maximumZoomScale={3} minimumZoomScale={1} contentContainerStyle={{ alignItems: 'center' }}>
            <Div style={{ width: DEVICE.width, height: PAGE_H * (DEVICE.width / PAGE_W) }}>
              <Div style={{ transform: `scale(${DEVICE.width / PAGE_W})`, transformOrigin: 'top left' }}>
                <ReportPage page={page} />
              </Div>
            </Div>
          </ScrollView>
        </Div>
      </NativeModal>
    </Screen>
  )
}

/* =============================================== 43a — Lab reports ======== */

/**
 * The collection behind "Lab Reports". Tapping a record class should land on
 * everything in it; a single report is a destination you choose from here.
 */
const REPORT_FILTERS: ReportFilter[] = ['All', 'Blood tests', 'Imaging', 'Needs attention', 'This year']

export function LabReportsScreen() {
  const nav = useNav()
  const labReports = useCatalog((s) => s.labReports)
  const [text, setText] = React.useState('')
  const [filter, setFilter] = React.useState<ReportFilter>('All')
  const visible = searchReports(labReports, text, filter)
  const processing = visible.filter((r) => r.status === 'processing')
  const months = [...new Set(visible.map((r) => r.month))]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div
        className="sticky z-30 bg-white"
        style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}
      >
        <ScreenHeader
          embedded
          title="Lab reports"
          subtitle={`${labReports.length} reports`}
          border={false}
          right={
            <IconButton size={36} label="Share" onClick={() => showToast('Report list link copied')}>
              <Share2 className="h-[16px] w-[16px] text-ink-700" strokeWidth={2.2} />
            </IconButton>
          }
        />
        <Div className="px-5 pb-3">
          <SearchInput placeholder="Search by test or lab" value={text} onChange={setText} />
        </Div>
        <Div className="pb-3">
          <HScroll gap={8}>
            {REPORT_FILTERS.map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="flex-1 px-5 pb-[40px] pt-4">
        {processing.length > 0 && (
          <Div className="mb-4 flex-row items-start gap-3 rounded-tile bg-brand-50 p-3.5">
            <Clock className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
            <P className="text-body-sm leading-[19px] text-brand-700">
              <Span className="font-bold">{processing.length} report is still being prepared.</Span> We’ll notify you
              the moment it is released.
            </P>
          </Div>
        )}

        {visible.length === 0 && (
          <NoResultsBody body="No reports match this search. Try the test name or the lab." />
        )}

        {months.map((m) => (
          <Div key={m} className="mb-5">
            <P className="mb-2.5 text-caption font-bold uppercase tracking-[.08em] text-ink-400">{m}</P>
            <Div className="gap-2.5">
              {visible
                .filter((r) => r.month === m)
                .map((r) => (
                  <Btn
                    key={r.id}
                    onPress={() =>
                      r.status === 'processing'
                        ? nav.navigate('st-report-pending')
                        : nav.navigate('lab-report', { params: { id: r.id } })
                    }
                    className="tap flex-row w-full items-start gap-3.5 rounded-tile bg-white p-3.5 text-left shadow-tile"
                  >
                    <Span
                      className={`flex-col h-[40px] w-[40px] shrink-0 items-center justify-center rounded-tile ${
                        r.status === 'processing' ? 'bg-ink-50' : r.kind === 'imaging' ? 'bg-brand-50' : 'bg-vital-50'
                      }`}
                    >
                      {r.kind === 'imaging' ? (
                        <Scan
                          className={`h-[18px] w-[18px] ${r.status === 'processing' ? 'text-ink-400' : 'text-brand-600'}`}
                          strokeWidth={2}
                        />
                      ) : (
                        <FlaskConical
                          className={`h-[18px] w-[18px] ${r.status === 'processing' ? 'text-ink-400' : 'text-vital-600'}`}
                          strokeWidth={2}
                        />
                      )}
                    </Span>

                    <Div className="min-w-0 flex-1">
                      <Div className="flex-row items-start justify-between gap-2">
                        <P className="min-w-0 flex-1 text-body-lg font-semibold leading-[20px] text-ink-900">
                          {r.name}
                        </P>
                        <StatusBadge tone={r.status === 'processing' ? 'neutral' : 'success'} dot={r.status === 'ready'}>
                          {r.status === 'processing' ? 'Processing' : 'Ready'}
                        </StatusBadge>
                      </Div>
                      <P className="mt-0.5 truncate text-caption text-ink-400">
                        {r.lab} · {r.date}
                      </P>

                      <Div className="mt-2 flex-row items-center gap-2.5">
                        {r.status === 'ready' ? (
                          <>
                            <Span className="flex-row items-center gap-1 text-caption text-ink-500">
                              <FileText className="h-[12px] w-[12px]" strokeWidth={2.2} />
                              PDF · {r.pages} {r.pages === 1 ? 'page' : 'pages'}
                            </Span>
                            {r.flagged > 0 && (
                              <Span className="flex-row items-center gap-1 text-caption font-semibold text-caution-700">
                                <AlertTriangle className="h-[12px] w-[12px]" strokeWidth={2.4} />
                                {r.flagged} {r.flagged === 1 ? 'value' : 'values'} to review
                              </Span>
                            )}
                          </>
                        ) : (
                          <Span className="text-caption text-ink-400">Expected today, 7:00 PM</Span>
                        )}
                      </Div>
                    </Div>
                  </Btn>
                ))}
            </Div>
          </Div>
        ))}

        <Div className="flex-row items-start gap-2.5 rounded-tile bg-white p-3.5 shadow-tile">
          <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-ink-600">
            Reports booked through KDC+ arrive here automatically. You can also upload a report from an outside lab.
          </P>
        </Div>

        <Btn
          onPress={() => nav.navigate('rx-upload')}
          className="tap mt-2.5 flex-row w-full items-center justify-center gap-2 rounded-tile border border-dashed border-ink-200 bg-white/60 py-3.5 text-body font-semibold text-brand-600"
        >
          Upload a report
        </Btn>
      </Div>
    </Screen>
  )
}
