import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Upload,
  Camera,
  Image as ImageIcon,
  FileText,
  ShoppingCart,
  Truck,
  ShieldCheck,
  Pill,
  ChevronRight,
  Tag,
  Clock,
  MapPin,
  Phone,
  Info,
  Check,
  Package,
  BadgeIndianRupee,
  X,
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
  Stepper,
  FilterChip,
  ProgressBar,
  StepBar,
} from '../components/ui/Display'
import { Banner, Skeleton, Timeline, Toast, type TimelineStep } from '../components/ui/Feedback'
import { MedicineCard, AddressCard, PaymentMethodRow } from '../components/cards/index'
import { AddressFormSheet } from '../components/forms/Sheets'
import { rupee } from '../mock-data/mock'
import { SCENE } from '../mock-data/media'
import { MemberDiscountLine, PlusTag, PlusUpsell } from '../components/ui/Membership'
import { useNav } from '../navigation/navigation'
import type { CartLine, Medicine } from '../types'
import { getDoctor, getMedicine, getMedicineDetail, reorderLines, useCatalog } from '../store/catalog'
import { useCart } from '../store/cart'
import { formatAddress, useAddresses } from '../store/addresses'
import { CASH_ON_DELIVERY, PAY_ONLINE, usePayments } from '../store/payments'
import { pharmacyOrderById, useOrders } from '../store/orders'
import { completedUploads, useUploads } from '../store/uploads'
import { showToast } from '../store/toast'
import { services } from '../services'
import type { PickResult } from '../services/documents'
import { orderPrescription } from '../flows/prescriptions'
import { useCheckout } from '../flows/payment'
import { usePricing } from '../hooks/usePricing'
import { useMedicineDetail, useMedicineSearch } from '../hooks/queries'
import { LIVE } from '../services/config'
import { loadPharmacyOrder } from '../services/live/pharmacy'
import '../services/live/sync-commerce'
import { useNow } from '../hooks/useNow'
import { cartSubtotal, rxCoverage, type MedicineFilter } from '../domain/catalogue'
import { currentStage, PHARMACY_STAGES, stageState } from '../domain/orderTracking'
import { EmptyCartScreen, NoResultsBody } from './states'

/** Add and quantity handlers shared by every medicine list. */
function useMedicineCardActions() {
  const nav = useNav()
  const cart = useCart.getState()
  return (m: Medicine) => ({
    onClick: () => nav.navigate('medicine-detail', { params: { id: m.id } }),
    onAdd: () => {
      cart.add(m.id)
      showToast('Added to cart', 'success', m.name)
    },
    onQty: (qty: number) => cart.setQty(m.id, qty),
  })
}

function useSubtotal(lines: CartLine[]) {
  const medicines = useCatalog((s) => s.medicines)
  return cartSubtotal(lines, medicines)
}

/* ============================================== 28 — Pharmacy home ======== */

export function PharmacyHomeScreen() {
  const nav = useNav()
  const medicines = useCatalog((s) => s.medicines)
  const categories = useCatalog((s) => s.pharmacyCategories)
  const prescription = useCatalog((s) => s.prescription)
  const cartLines = useCart((s) => s.lines)
  const { memberPrice } = usePricing()
  const actions = useMedicineCardActions()
  const lines = reorderLines()
  const rxDoctor = getDoctor(prescription.doctorId)
  /* Live: only when the latest KDC+ prescription has medicines in the catalogue. */
  const showReorder = !LIVE || lines.length > 0
  const reorderTotal = memberPrice(useSubtotal(lines), 'pharmacy')
  const addAll = () => {
    orderPrescription(prescription, getDoctor(prescription.doctorId).name)
    nav.navigate('cart')
  }
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="pb-[112px]">
        <Div className="bg-white px-5 pb-4" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop }}>
          <Div className="flex-row items-start justify-between pt-3">
            <Div>
              <P className="text-title-lg text-ink-900">Medicines made simple</P>
              <P className="mt-1 text-body text-ink-500">Genuine medicines, delivered to your door.</P>
            </Div>
            <IconButton size={40} label="Cart" onClick={() => nav.navigate('cart')} className="relative">
              <ShoppingCart className="h-[18px] w-[18px] text-ink-700" strokeWidth={2.1} />
              <Span className="absolute -right-0.5 -top-0.5 flex-col h-[17px] min-w-[17px] items-center justify-center rounded-full bg-critical-600 px-1 text-[9.5px] font-bold text-white ring-2 ring-white">
                {cartLines.length}
              </Span>
            </IconButton>
          </Div>
          <Div className="mt-4">
            <SearchInput placeholder="Search medicines" onClick={() => nav.navigate('medicine-search', { params: { q: '' } })} readOnly />
          </Div>
        </Div>

        {/* Upload prescription — the primary pharmacy action */}
        <Div className="px-5 pt-4">
          <Btn
            onPress={() => nav.navigate('rx-upload')}
            className="tap relative w-full overflow-hidden rounded-card bg-brand-900 p-4 text-left shadow-card"
          >
            <Div className="flex-row items-center gap-3.5">
              <Span className="flex-col h-[46px] w-[46px] shrink-0 items-center justify-center rounded-tile bg-white/15 ring-1 ring-inset  ring-white/20">
                <Upload className="h-[21px] w-[21px] text-white" strokeWidth={2.1} />
              </Span>
              <Div className="min-w-0 flex-1">
                <P className="text-title-sm text-white">Upload prescription</P>
                <P className="mt-0.5 text-body-sm text-white/70">Our pharmacist reviews it within 15 minutes</P>
              </Div>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-white/60" />
            </Div>
          </Btn>
        </Div>

        {/* Assurance strip */}
        <Div className="px-5 pt-3">
          <Div className=" grid-cols-3 gap-2.5">
            {[
              { Icon: ShieldCheck, label: '100% genuine' },
              { Icon: Truck, label: 'Same-day delivery' },
              { Icon: BadgeIndianRupee, label: 'Up to 25% off' },
            ].map((a) => (
              <Div key={a.label} className=" flex-col items-center gap-1.5 rounded-tile bg-white px-2 py-3 shadow-tile">
                <a.Icon className="h-[16px] w-[16px] text-vital-600" strokeWidth={2.1} />
                <Span className="text-center text-[10.5px] font-semibold leading-[13px] text-ink-700">{a.label}</Span>
              </Div>
            ))}
          </Div>
        </Div>

        {/* Reorder */}
        {showReorder && <Div className="pt-6">
          <SectionHeader
            title="Reorder from your prescription"
            subtitle={LIVE ? [rxDoctor.name, prescription.date].filter(Boolean).join(' · ') : 'Dr. Arjun Mehta · 22 Sep'}
            className="pb-3"
          />
          <Div className="px-5">
            <Card elevation="tile" padded={false} className="overflow-hidden">
              <Div className="gap-2.5 p-4">
                {lines.map((l) => {
                  const m = getMedicine(l.medicineId)
                  return (
                    <Div key={m.id} className="flex-row items-center gap-3">
                      <Img src={m.photo} alt="" className="h-[38px] w-[38px] rounded-[10px] object-cover" />
                      <Div className="min-w-0 flex-1">
                        <P className="truncate text-body-sm font-semibold text-ink-900">{m.name}</P>
                        <P className="truncate text-caption text-ink-400">{m.generic}</P>
                      </Div>
                      <Span className="shrink-0 text-body-sm font-bold text-ink-900">
                        {rupee(memberPrice(m.price, 'pharmacy'))}
                      </Span>
                    </Div>
                  )
                })}
              </Div>
              <Btn
                onPress={addAll}
                className="flex-row w-full items-center justify-between border-t border-ink-100 bg-brand-50/60 px-4 py-3"
              >
                <Span className="text-body-sm font-bold text-brand-700">Add all {LIVE ? lines.length : 3} to cart</Span>
                <Span className="text-body-sm font-bold text-brand-700">{rupee(reorderTotal)}</Span>
              </Btn>
            </Card>
          </Div>
        </Div>}

        {/* Categories */}
        <Div className="pt-6">
          <SectionHeader
            title="Shop by category"
            action="See all"
            onAction={() => nav.navigate('medicine-search', { params: { q: '' } })}
            className="pb-3"
          />
          <Div className=" grid-cols-2 gap-2.5 px-5">
            {categories.map((c) => (
              <Btn
                key={c.id}
                onPress={() => nav.navigate('medicine-search', { params: { q: '', category: c.name } })}
                className="tap flex-row items-center gap-3 rounded-card bg-white p-3.5 text-left shadow-tile"
              >
                <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-brand-50">
                  <Pill className="h-[16px] w-[16px] text-brand-600" strokeWidth={2.1} />
                </Span>
                <Div className="min-w-0">
                  <P className="truncate text-[12.5px] font-bold leading-[16px] text-ink-900">{c.name}</P>
                  <P className="text-[10.5px] text-ink-400">{c.items} products</P>
                </Div>
              </Btn>
            ))}
          </Div>
        </Div>

        {/* Frequently bought */}
        <Div className="pt-6">
          <SectionHeader title="Frequently bought" action="See all" onAction={() => nav.navigate('medicine-search', { params: { q: '' } })} className="pb-3" />
          <Div className="gap-2.5 px-5">
            {(LIVE ? medicines.slice(0, 4) : medicines.slice(3, 6)).map((m) => (
              <MedicineCard key={m.id} medicine={m} {...actions(m)} />
            ))}
          </Div>
        </Div>
      </Div>

      <BottomNav active="orders" />
    </Screen>
  )
}

/* ============================================= 29 — Medicine search ======= */

const MEDICINE_FILTERS: MedicineFilter[] = ['All', 'Prescription', 'Over the counter', 'In stock', 'Under ₹200']

export function MedicineSearchScreen() {
  const nav = useNav()
  const actions = useMedicineCardActions()
  const category: string | undefined = nav.params.category
  const [text, setText] = React.useState<string>(nav.params.q ?? (LIVE ? '' : 'tab'))
  const [filter, setFilter] = React.useState<MedicineFilter>('All')
  const result = useMedicineSearch({ text, filter, category })
  const found = result.data ?? []
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <Div className="sticky z-30 bg-white" style={{ marginTop: -DEVICE.safeTop, paddingTop: DEVICE.safeTop, top: -DEVICE.safeTop }}>
        <ScreenHeader embedded title="Search medicines" subtitle={category} border={false} />
        <Div className="px-5 pb-3">
          <SearchInput placeholder="Search medicines" value={text} onChange={setText} />
        </Div>
        <Div className="pb-3">
          <HScroll gap={8}>
            {MEDICINE_FILTERS.map((f) => (
              <FilterChip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </FilterChip>
            ))}
          </HScroll>
        </Div>
      </Div>

      <Div className="px-5 pb-[40px] pt-4">
        <P className="mb-2.5 text-caption text-ink-400">
          {found.length} results{text.trim() ? ` for “${text.trim()}”` : ''}
        </P>
        <Div className="gap-2.5">
          {result.isPending ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-[112px] w-full" rounded={20} />)
          ) : found.length ? (
            found.map((m) => <MedicineCard key={m.id} medicine={m} {...actions(m)} />)
          ) : (
            <NoResultsBody body="We couldn’t find that medicine. Check the spelling or try the generic name." />
          )}
        </Div>
      </Div>
    </Screen>
  )
}

/* ============================================= 30 — Medicine detail ======= */

export function MedicineDetailScreen() {
  const nav = useNav()
  const id: string = nav.params.id ?? (LIVE ? '' : 'm1')
  /* Live: the page's price, stock and details come from the server; this re-renders when they arrive. */
  useMedicineDetail(id)
  useCatalog((s) => s.medicines)
  const m = getMedicine(id)
  const info = getMedicineDetail(m)
  const { memberPrice } = usePricing()
  const [qty, setQty] = React.useState(1)
  const off = m.mrp ? Math.round(((m.mrp - m.price) / m.mrp) * 100) : 0

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Medicine" />

      <Div className="flex-1 pb-[130px]">
        <Div className="bg-white px-5 pb-5 pt-2">
          <Div className="mx-auto flex-col h-[190px] w-full items-center justify-center overflow-hidden rounded-card bg-ink-50">
            <Img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
          </Div>

          <Div className="mt-4 flex-row items-start gap-2">
            <P className="min-w-0 flex-1 text-title-md text-ink-900">{m.name}</P>
            {m.rx && <StatusBadge tone="critical">Rx required</StatusBadge>}
          </Div>
          <P className="mt-1 text-body-lg text-ink-500">{m.generic}</P>
          <P className="mt-0.5 text-body-sm text-ink-400">
            By {m.brand} · {m.pack}
          </P>

          <Div className="mt-4 flex-row items-end justify-between">
            <Div className="flex-row items-baseline gap-2">
              <Span className="font-display text-[26px] font-extrabold tabular-nums text-ink-900">
                {rupee(memberPrice(m.price, 'pharmacy'))}
              </Span>
              <Span className="text-body text-ink-300 line-through">
                {rupee(memberPrice(m.price, 'pharmacy') !== m.price ? m.price : m.mrp)}
              </Span>
              {memberPrice(m.price, 'pharmacy') !== m.price && <PlusTag size="xs" />}
              <Span className="text-body-sm font-bold text-vital-600">{off}% off</Span>
            </Div>
            <StatusBadge tone={m.inStock ? 'success' : 'critical'} dot>
              {m.inStock ? 'In stock' : 'Out of stock'}
            </StatusBadge>
          </Div>

          <Div className="mt-3 flex-row items-center gap-2 rounded-tile bg-vital-50 px-3.5 py-2.5">
            <Truck className="h-[15px] w-[15px] shrink-0 text-vital-600" strokeWidth={2.2} />
            <P className="text-body-sm font-semibold text-vital-700">
              {LIVE ? (m.inStock ? 'In stock · choose a delivery slot at checkout' : 'Out of stock right now') : 'Delivery by today, 7:30 PM to 500034'}
            </P>
          </Div>
        </Div>

        <Div className="mt-3 gap-3 px-5">
          <Card elevation="tile">
            <P className="mb-1.5 text-title-sm text-ink-900">About this medicine</P>
            <P className="text-body leading-[22px] text-ink-600">{info.about}</P>
          </Card>

          <Card elevation="tile">
            <P className="mb-2.5 text-title-sm text-ink-900">Key information</P>
            <KeyValue label="Composition" value={m.generic} />
            <KeyValue label="Manufacturer" value={m.brand} />
            <KeyValue label="Storage" value="Below 30°C, dry place" />
            <KeyValue label="Expiry" value="Mar 2028" />
          </Card>

          {m.rx && (
            <Banner
              tone="caution"
              icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
              title="Prescription required"
              body="This is a scheduled medicine. Upload a valid prescription at checkout; our pharmacist will verify it before dispatch."
            />
          )}

          <Card elevation="tile">
            <P className="mb-2 text-title-sm text-ink-900">Common side effects</P>
            <Div className="flex-row flex-wrap gap-1.5">
              {info.sideEffects.map((s) => (
                <MetaChip key={s}>{s}</MetaChip>
              ))}
            </Div>
            <P className="mt-3 text-caption leading-[17px] text-ink-400">
              This information is for guidance only and does not replace medical advice. Speak to your doctor before
              changing any medication.
            </P>
          </Card>
        </Div>
      </Div>

      <StickyBar>
        <Div className="flex-row items-center gap-3">
          <Stepper value={qty} onChange={setQty} />
          <Button
            className="flex-1"
            disabled={!m.inStock}
            onClick={() => {
              useCart.getState().add(m.id, qty)
              nav.navigate('cart')
            }}
            icon={<ShoppingCart className="h-[17px] w-[17px]" strokeWidth={2.2} />}
          >
            Add to cart
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}

/* ========================================== 31 — Prescription upload ====== */

export function UploadScreen() {
  const nav = useNav()
  const uploads = useUploads((s) => s.items)
  const history = useCatalog((s) => s.prescriptionHistory)
  const lines = useCart((s) => s.lines)
  const attached = useCart((s) => s.prescription)
  const medicines = useCatalog((s) => s.medicines)
  const prescription = useCatalog((s) => s.prescription)
  const [uploadedHere, setUploadedHere] = React.useState(false)
  const uploadStore = useUploads.getState()

  const receive = async (result: PickResult) => {
    if (result.status === 'picked') {
      setUploadedHere(true)
      await uploadStore.upload(result.file)
    } else if (result.status === 'denied') {
      showToast('Allow camera and photo access in Settings', 'caution')
    } else if (result.status === 'error') {
      showToast(result.message, 'critical')
    }
  }
  const sources = [
    { Icon: Camera, title: 'Take a photo', body: 'Use the camera to capture the prescription', pick: services.documents.pickFromCamera },
    { Icon: ImageIcon, title: 'Choose from gallery', body: 'Select an existing image from your phone', pick: services.documents.pickFromGallery },
    /* Live: there's no document picker yet, so a PDF can't be chosen; photos of the prescription work. */
    ...(LIVE ? [] : [{ Icon: FileText, title: 'Upload a PDF', body: 'Attach a PDF prescription, up to 10 MB', pick: services.documents.pickPdf }]),
  ]
  const latestRx = history[0]
  const latestRxDoctor = getDoctor(latestRx?.doctorId ?? '')

  const finish = () => {
    const needsPrescription = !rxCoverage(lines, medicines, attached, prescription.medicines).covered
    const latest = completedUploads(uploads).at(-1)
    if (latest && (uploadedHere || needsPrescription)) {
      useCart.getState().attachPrescription({ source: 'upload', label: latest.name, uploadId: latest.id })
    } else if (needsPrescription) {
      showToast('Add a prescription to continue', 'caution')
      return
    }
    nav.navigate('cart')
  }

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Upload prescription" />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        <Div className="gap-2.5">
          {sources.map((s) => (
            <Btn
              key={s.title}
              onPress={async () => receive(await s.pick())}
              className="tap flex-row w-full items-center gap-3.5 rounded-card bg-white p-4 text-left shadow-tile"
            >
              <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
                <s.Icon className="h-[20px] w-[20px] text-brand-600" strokeWidth={2} />
              </Span>
              <Div className="min-w-0 flex-1">
                <P className="text-title-sm text-ink-900">{s.title}</P>
                <P className="mt-0.5 truncate text-body-sm text-ink-500">{s.body}</P>
              </Div>
              <ChevronRight className="h-[18px] w-[18px] shrink-0 text-ink-300" />
            </Btn>
          ))}
        </Div>

        {(!LIVE || latestRx) && <Div className="mt-4">
          <SectionHeader title="Or use a KDC+ prescription" className="!px-0 pb-2.5" />
          <Btn
            onPress={() => nav.navigate('prescription', { params: { rxId: latestRx.rxId } })}
            className="tap flex-row w-full items-center gap-3.5 rounded-card bg-white p-4 text-left shadow-tile"
          >
            <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-vital-50">
              <FileText className="h-[20px] w-[20px] text-vital-600" strokeWidth={2} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-sm text-ink-900">
                {LIVE ? `${latestRxDoctor.name} — ${latestRx.date}` : 'Dr. Arjun Mehta — 22 Sep'}
              </P>
              <P className="mt-0.5 truncate text-body-sm text-ink-500">
                {LIVE ? `${latestRx.specialty} · ${latestRx.items} ${latestRx.items === 1 ? 'medicine' : 'medicines'}` : 'Cardiologist · 3 medicines'}
              </P>
            </Div>
            {(!LIVE || latestRx.status === 'active') && <StatusBadge tone="success">Active</StatusBadge>}
          </Btn>
        </Div>}

        {/* Uploaded preview */}
        {uploads.length > 0 && (
          <Div className="mt-5">
            <SectionHeader title={`Uploaded (${uploads.length})`} className="!px-0 pb-2.5" />
            <Div className="gap-2.5">
              {uploads.map((u) => (
                <Div key={u.id} className="flex-row items-center gap-3.5 rounded-card bg-white p-3.5 shadow-tile">
                  <Div className="flex-col h-[54px] w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-ink-50">
                    {u.uri ? (
                      <Img src={u.uri} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="h-[20px] w-[20px] text-ink-400" strokeWidth={2} />
                    )}
                  </Div>
                  <Div className="min-w-0 flex-1">
                    <P className="truncate text-body-lg font-semibold text-ink-900">{u.name}</P>
                    <P className="text-caption text-ink-400">
                      {u.size} ·{' '}
                      {u.status === 'done' ? 'Uploaded just now' : u.status === 'failed' ? 'Upload failed' : `Uploading ${Math.round(u.progress)}%`}
                    </P>
                    <Div className="mt-2">
                      <ProgressBar pct={u.progress} tone={u.status === 'done' ? 'success' : u.status === 'failed' ? 'caution' : 'brand'} />
                    </Div>
                  </Div>
                  <IconButton size={30} label="Remove" onClick={() => uploadStore.remove(u.id)}>
                    <X className="h-[15px] w-[15px] text-ink-500" strokeWidth={2.4} />
                  </IconButton>
                </Div>
              ))}
            </Div>
          </Div>
        )}

        <Div className="mt-5">
          <Banner
            tone="brand"
            icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="What makes a valid prescription"
            body="It must show the doctor’s name and registration number, the date, your name, and the medicines with dosage."
          />
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={finish}>Continue</Button>
      </StickyBar>
    </Screen>
  )
}

/* ====================================================== 32 — Cart ========= */

function useCartBill() {
  const lines = useCart((s) => s.lines)
  const subtotal = useSubtotal(lines)
  const pricing = usePricing()
  return { lines, subtotal, pricing, bill: pricing.bill(subtotal, 'pharmacy') }
}

function useRxCoverage() {
  const lines = useCart((s) => s.lines)
  const attached = useCart((s) => s.prescription)
  const medicines = useCatalog((s) => s.medicines)
  const prescription = useCatalog((s) => s.prescription)
  return { attached, ...rxCoverage(lines, medicines, attached, prescription.medicines) }
}

export function CartScreen() {
  const nav = useNav()
  const { lines, subtotal, pricing, bill } = useCartBill()
  const coverage = useRxCoverage()
  const cart = useCart.getState()
  const total = bill.total

  if (lines.length === 0) return <EmptyCartScreen />

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Cart" subtitle={`${lines.length} items`} />

      <Div className="flex-1 gap-3 px-5 pb-[170px] pt-4">
        <StepBar step={1} total={2} />
        {coverage.required && coverage.covered && (
          <Div className="flex-row items-center gap-3 rounded-card bg-vital-50 p-3.5">
            <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-vital-600" strokeWidth={2.2} />
            <Div className="min-w-0 flex-1">
              <P className="text-body-sm font-bold text-vital-700">
                {coverage.attached?.source === 'upload' ? 'Prescription uploaded' : 'Prescription verified'}
              </P>
              <P className="truncate text-caption text-vital-700/80">{coverage.attached?.label}</P>
            </Div>
            <Check className="h-[16px] w-[16px] shrink-0 text-vital-600" strokeWidth={3} />
          </Div>
        )}
        {coverage.required && !coverage.covered && (
          <Banner
            tone="critical"
            icon={<Info className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            title="Prescription required"
            body={`Upload a prescription covering ${coverage.missing.map((m) => m.name).join(', ')} to continue.`}
            action="Upload"
            onAction={() => nav.navigate('rx-upload')}
          />
        )}

        <Div className="gap-2.5">
          {lines.map((l) => {
            const m = getMedicine(l.medicineId)
            return (
              <MedicineCard
                key={m.id}
                medicine={m}
                qty={l.qty}
                onClick={() => nav.navigate('medicine-detail', { params: { id: m.id } })}
                onQty={(qty) => cart.setQty(m.id, qty)}
              />
            )
          })}
        </Div>

        <Btn
          onPress={() => nav.navigate('medicine-search', { params: { q: '' } })}
          className="tap flex-row w-full items-center justify-center gap-2 rounded-card border border-dashed border-ink-200 bg-white/60 py-3.5 text-body font-semibold text-brand-600"
        >
          Add more medicines
        </Btn>

        {/* Live: no coupons exist on the server; only the member rate is shown. */}
        {(!LIVE || pricing.active) && <Card elevation="tile">
          <Div className="flex-row items-center gap-3">
            <Tag className="h-[17px] w-[17px] shrink-0 text-vital-600" strokeWidth={2.2} />
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-center gap-2">
                <P className="text-body-sm font-bold text-ink-900">
                  {pricing.active ? 'Member rate applied' : 'HEALTH15 applied'}
                </P>
                {pricing.active && <PlusTag size="xs" />}
              </Div>
              {bill.discount > 0 && (
                <P className="text-caption text-vital-700">You saved {rupee(bill.discount)}</P>
              )}
            </Div>
            {!LIVE && <Span className="text-body-sm font-semibold text-brand-600">Change</Span>}
          </Div>
        </Card>}

        {/* The offer belongs where a non-member is about to pay full price. */}
        {!pricing.active && (
          <PlusUpsell amount={subtotal} area="pharmacy" onJoin={() => nav.navigate('membership')} />
        )}

        <Card elevation="tile">
          <P className="mb-1.5 text-title-sm text-ink-900">Bill summary</P>
          <KeyValue label={`Item total (${lines.length})`} value={rupee(subtotal)} />
          <MemberDiscountLine amount={subtotal} area="pharmacy" />
          {LIVE ? (
            <KeyValue label="Delivery fee" value="At checkout" />
          ) : (
            <KeyValue label="Delivery fee" value="FREE" tone="success" />
          )}
          <Divider className="my-2.5" />
          <KeyValue label={LIVE ? 'Total before delivery' : 'Total payable'} value={rupee(total)} strong />
        </Card>

        <Div className="flex-row items-center gap-3 rounded-card bg-white p-3.5 shadow-tile">
          <Truck className="h-[17px] w-[17px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="min-w-0 flex-1 text-body-sm text-ink-600">
            {LIVE ? (
              'Choose a delivery slot at checkout'
            ) : (
              <>
                Delivery by <Span className="font-bold text-ink-900">today, 7:30 PM</Span>
              </>
            )}
          </P>
        </Div>
      </Div>

      <StickyBar>
        <Div className="mb-3 flex-row items-end justify-between">
          <Div>
            <P className="text-caption text-ink-400">Total</P>
            <P className="font-display text-[21px] font-extrabold leading-none tabular-nums text-ink-900">{rupee(total)}</P>
          </Div>
          {bill.discount > 0 && (
            <Span className="text-caption font-semibold text-vital-700">Saved {rupee(bill.discount)}</Span>
          )}
        </Div>
        <Button
          onClick={() =>
            coverage.covered
              ? nav.navigate('pharmacy-checkout')
              : showToast('Upload your prescription first', 'caution')
          }
        >
          Proceed to checkout
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* ================================================= 33 — Checkout ========== */

const DELIVERY_SLOTS = ['Today, 2–5 PM', 'Today, 5–8 PM', 'Tomorrow, 9–12 PM']

export function CheckoutScreen() {
  const nav = useNav()
  const { lines, subtotal, bill } = useCartBill()
  const coverage = useRxCoverage()
  const addresses = useAddresses((s) => s.items)
  const selectedAddressId = useAddresses((s) => s.selectedId)
  const selectAddress = useAddresses((s) => s.select)
  const methods = usePayments((s) => s.methods)
  const selectedMethod = usePayments((s) => s.selectedMethodId)
  const selectMethod = usePayments((s) => s.select)
  const [slot, setSlot] = React.useState(DELIVERY_SLOTS[1])
  const [addingAddress, setAddingAddress] = React.useState(false)
  const shownAddresses = addresses.filter((a, i) => i < 2 || a.id === selectedAddressId)
  const address = addresses.find((a) => a.id === selectedAddressId)
  const cod = selectedMethod === CASH_ON_DELIVERY.id

  const placeOrder = () => {
    if (!coverage.covered) {
      showToast('Upload your prescription first', 'caution')
      nav.navigate('rx-upload')
      return
    }
    if (!address) {
      showToast('Add a delivery address first', 'caution')
      return
    }
    useCheckout.getState().start({
      kind: 'pharmacy',
      amount: bill.total,
      title: 'Medicine order',
      subtitle: `${lines.length} items · ${slot}`,
      lines,
      address: formatAddress(address),
      slot,
      bill,
      itemCount: lines.length,
    })
    nav.navigate('st-payment-processing')
  }
  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Checkout" />

      <Div className="flex-1 gap-5 px-5 pb-[140px] pt-4">
        <StepBar step={2} total={2} />
        <Div>
          <SectionHeader title="Delivery address" action="Add new" onAction={() => setAddingAddress(true)} className="!px-0 pb-2.5" />
          <Div className="gap-2.5">
            {shownAddresses.map((a) => (
              <AddressCard key={a.id} a={a} selected={a.id === selectedAddressId} onClick={() => selectAddress(a.id)} />
            ))}
          </Div>
        </Div>

        <Div>
          <SectionHeader title="Delivery slot" className="!px-0 pb-2.5" />
          <Div className=" grid-cols-3 gap-2.5">
            {DELIVERY_SLOTS.map((s) => {
              const on = s === slot
              return (
                <Btn
                  key={s}
                  onPress={() => setSlot(s)}
                  className={`tap rounded-tile px-2 py-3 text-center  ${
                    on ? 'bg-brand-600 text-white shadow-cta' : 'bg-white text-ink-700 ring-1 ring-inset  ring-ink-100'
                  }`}
                >
                  <Clock className={`mx-auto h-[15px] w-[15px] ${on ? 'text-white/80' : 'text-ink-400'}`} strokeWidth={2.2} />
                  <P className="mt-1.5 text-[11px] font-bold leading-[14px]">{s.split(', ')[0]}</P>
                  <P className={`text-[10.5px] ${on ? 'text-white/75' : 'text-ink-400'}`}>{s.split(', ')[1]}</P>
                </Btn>
              )
            })}
          </Div>
        </Div>

        <Div>
          <SectionHeader title="Payment method" className="!px-0 pb-2.5" />
          <Div className="gap-2">
            {/* Live: online payment goes through Razorpay Checkout, which offers the saved and other methods itself. */}
            {(LIVE ? [PAY_ONLINE] : methods).map((p) => (
              <PaymentMethodRow key={p.id} pm={p} selected={p.id === selectedMethod} onClick={() => selectMethod(p.id)} />
            ))}
            <Btn
              onPress={() => selectMethod(CASH_ON_DELIVERY.id)}
              className={`tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-3.5 ${
                cod ? 'ring-[1.5px] ring-inset ring-brand-600' : 'ring-1 ring-inset ring-ink-100'
              }`}
            >
              <Span className="flex-col h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-ink-50">
                <BadgeIndianRupee className="h-[17px] w-[17px] text-ink-600" strokeWidth={2.1} />
              </Span>
              <Span className="min-w-0 flex-1 text-left">
                <Span className="block text-body-lg font-semibold text-ink-900">Cash on delivery</Span>
                <Span className="block text-caption text-ink-400">Pay the delivery partner directly</Span>
              </Span>
              <Span
                className={`flex-col h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full ${
                  cod ? 'bg-brand-600' : 'ring-1 ring-inset ring-ink-300'
                }`}
              >
                {cod && <Span className="h-[7px] w-[7px] rounded-full bg-white" />}
              </Span>
            </Btn>
          </Div>
        </Div>

        <Card elevation="tile">
          <P className="mb-1.5 text-title-sm text-ink-900">Order summary</P>
          <KeyValue label={`Item total (${lines.length})`} value={rupee(subtotal)} />
          <MemberDiscountLine amount={subtotal} area="pharmacy" />
          {LIVE ? (
            <KeyValue label="Delivery fee" value="Added if below the free-delivery amount" />
          ) : (
            <KeyValue label="Delivery fee" value="FREE" tone="success" />
          )}
          <Divider className="my-2.5" />
          <KeyValue label={LIVE ? 'Total before delivery' : 'Total payable'} value={rupee(bill.total)} strong />
        </Card>
      </Div>

      <StickyBar>
        <Button onClick={placeOrder}>Place order · {rupee(bill.total)}</Button>
      </StickyBar>

      <AddressFormSheet visible={addingAddress} onClose={() => setAddingAddress(false)} />
    </Screen>
  )
}

/* =========================================== 34 — Order tracking ========== */

const NOW_REFRESH_MS = 5000

export function OrderTrackingScreen() {
  const nav = useNav()
  const [saved, setSaved] = React.useState(false)
  const orders = useOrders((s) => s.pharmacy)
  const now = useNow(NOW_REFRESH_MS)
  const code: string | undefined = nav.params.id
  React.useEffect(() => {
    // Live: the server's stage and status history, reloaded while the screen is open.
    if (!LIVE || !code) return
    const reload = () => void loadPharmacyOrder(code).then((o) => useOrders.getState().upsertPharmacy(o)).catch(() => undefined)
    reload()
    const timer = setInterval(reload, 20_000)
    return () => clearInterval(timer)
  }, [code])
  const order = pharmacyOrderById(orders, code)
  const stage = currentStage(order, now)
  const finished = stage >= 4
  const riderInitials = order.rider.name.split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase()
  const stageTime = (i: number) => order.stageTimes?.[i]
  const stateFor = (i: number) => stageState(i, stage, finished)
  const paidNote = LIVE ? (order.payment === 'Cash on delivery' ? 'Cash on delivery' : order.paymentRequired ? 'Waiting for payment' : 'Payment received') : 'Payment received'
  const rxNote = LIVE
    ? order.rxRequired ? 'Checked by our registered pharmacist' : 'No prescription needed'
    : 'Reviewed by Dr. Nandini R., Registered Pharmacist'
  const steps: TimelineStep[] = [
    { title: PHARMACY_STAGES[0], time: stageTime(0), body: `${paidNote} · ${order.id}`, state: stateFor(0) },
    { title: PHARMACY_STAGES[1], time: stageTime(1), body: rxNote, state: stateFor(1) },
    { title: PHARMACY_STAGES[2], time: stageTime(2), body: order.partner, state: stateFor(2) },
    {
      title: PHARMACY_STAGES[3],
      time: stageTime(3),
      body: order.rider.name ? `${order.rider.name} is on the way with your order` : 'A delivery partner brings your order',
      state: stateFor(3),
      meta: stage === 3 && Boolean(order.rider.name) && (
        <Div className="flex-row items-center gap-2.5 rounded-tile bg-white p-2.5 shadow-tile">
          <Span className="flex-col h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-brand-50 text-body-sm font-bold text-brand-700">
            {riderInitials}
          </Span>
          <Div className="min-w-0 flex-1">
            <P className="truncate text-body-sm font-bold text-ink-900">{order.rider.name}</P>
            <P className="truncate text-caption text-ink-400">Delivery partner</P>
          </Div>
          <IconButton size={34} tone="brand" label="Call rider" onClick={() => showToast(`Calling ${order.rider.name}`, 'info', order.rider.mobile)}>
            <Phone className="h-[15px] w-[15px]" strokeWidth={2.3} />
          </IconButton>
        </Div>
      ),
    },
    { title: PHARMACY_STAGES[4], time: stageTime(4), body: finished ? order.etaWhen : `Expected ${order.eta.replace('Today by ', 'by ')}`, state: stateFor(4) },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Track order" subtitle={order.id} />

      <Div className="flex-1 gap-4 px-5 pb-[112px] pt-4">
        <Div className="rounded-card bg-brand-900 p-4 shadow-card">
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-white/15 ring-1 ring-inset  ring-white/20">
              <Truck className="h-[20px] w-[20px] text-white" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-sm text-white">{order.cancelled ? order.statusLabel : finished ? 'Delivered' : order.etaWhen}</P>
              <P className="mt-0.5 text-body-sm text-white/65">{order.lines.length} items · {rupee(order.trackedTotal ?? order.amount)}</P>
            </Div>
          </Div>
          <Div className="mt-3.5 flex-row items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Span key={i} className={`h-[4px] flex-1 rounded-full ${i <= stage + 1 ? 'bg-white/90' : 'bg-white/25'}`} />
            ))}
          </Div>
          <P className="mt-2 text-caption text-white/60">Step {stage + 1} of 5 · {PHARMACY_STAGES[stage]}</P>
        </Div>

        <Card elevation="tile">
          <Timeline steps={steps} />
        </Card>

        <Card elevation="tile">
          <P className="mb-2.5 text-title-sm text-ink-900">Delivery details</P>
          <Div className="flex-row items-start gap-2.5">
            <MapPin className="mt-[2px] h-[15px] w-[15px] shrink-0 text-ink-400" strokeWidth={2.2} />
            <P className="text-body-sm leading-[19px] text-ink-600">{order.address}</P>
          </Div>
          <Divider className="my-3" />
          <Div className="flex-row items-start gap-2.5">
            <Package className="mt-[2px] h-[15px] w-[15px] shrink-0 text-ink-400" strokeWidth={2.2} />
            <P className="text-body-sm leading-[19px] text-ink-600">Dispatched from {order.partner}</P>
          </Div>
        </Card>

        <Card elevation="tile" padded={false}>
          <Div className="p-4">
            <P className="mb-2.5 text-title-sm text-ink-900">Items in this order</P>
            <Div className="gap-2.5">
              {order.lines.map((l) => {
                const m = getMedicine(l.medicineId)
                return (
                  <Div key={l.medicineId} className="flex-row items-center gap-3">
                    <Img src={m.photo || SCENE.blister} alt="" className="h-[36px] w-[36px] rounded-[10px] object-cover" />
                    <Div className="min-w-0 flex-1">
                      <P className="truncate text-body-sm font-semibold text-ink-900">{l.name ?? m.name}</P>
                      <P className="text-caption text-ink-400">Qty {l.qty}</P>
                    </Div>
                    <Span className="text-body-sm font-bold text-ink-900">{rupee((l.price ?? m.price) * l.qty)}</Span>
                  </Div>
                )
              })}
            </Div>
          </Div>
          {/* Live: invoices are issued on the server; opening the PDF needs a file viewer the app doesn't have yet. */}
          {!LIVE && <Btn
            onPress={() => setSaved(true)}
            className="tap flex-row w-full items-center justify-center gap-2 border-t border-ink-100 py-3 text-body-sm font-semibold text-brand-600"
          >
            Download invoice
          </Btn>}
        </Card>
      </Div>

      {saved && (
        <Div className="pointer-events-none absolute inset-x-5 z-50" style={{ bottom: 128 }}>
          <Toast tone="success" title="Invoice saved to Files" body={`${order.id}.pdf`} />
        </Div>
      )}

      <BottomNav active="orders" />
    </Screen>
  )
}
