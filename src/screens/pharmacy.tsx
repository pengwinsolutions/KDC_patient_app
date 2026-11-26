import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import { Linking } from 'react-native'
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
  AlertTriangle,
  Lock,
  Minus,
  Plus,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader, BottomNav, HScroll } from '../components/ui/Nav'
import { Field, RadioRow, SearchInput, TextArea } from '../components/ui/Inputs'
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
import { Banner, SheetModal, Skeleton, Timeline, Toast, type TimelineStep } from '../components/ui/Feedback'
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
import { checkServiceable, pincodeOf, useServiceability } from '../services/live/serviceability'
import { atToDay, atToTime } from '../services/live/map'
import { careRules } from '../services/live/doctors'
import { pharmacyDelivery } from '../domain/pricing'
import '../services/live/sync-commerce'
import { useNow } from '../hooks/useNow'
import { cartSubtotal, rxCoverage, type MedicineFilter } from '../domain/catalogue'
import {
  canRequestReturn,
  CHANGE_ACTION_LABEL,
  changeLineText,
  changeTimeLeft,
  currentStage,
  lastFailedAttempt,
  MAX_DELIVERY_ATTEMPTS,
  MAX_RETURN_PHOTOS,
  openChange,
  paiseRupees,
  PHARMACY_STAGES,
  RETURN_NOTE_MAX,
  RETURN_REASONS,
  RETURN_STATUS_LABEL,
  RETURN_STATUS_TONE,
  returnableQty,
  returnDraftErrors,
  returnReason,
  returnSteps,
  signedRupees,
  stageState,
  type OrderChange,
  type ReturnReason,
  type ReturnView,
} from '../domain/orderTracking'
import { acceptChange, cancelReturn, deleteReturnPhoto, loadOrderChanges, loadOrderReturns, newReturnKey, rejectChange, requestReturn, uploadReturnPhoto, useAfterSales } from '../services/live/returns'
import { errorMessage, ServiceError } from '../services/errors'
import type { DeliveryAttempt } from '../types'
import { EmptyCartScreen, NoResultsBody } from './states'
import { plural } from '../domain/plural'

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
                  <P className="text-[10.5px] text-ink-400">{plural(c.items, 'product')}</P>
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
          {plural(found.length, 'result')}{text.trim() ? ` for “${text.trim()}”` : ''}
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
      <CartBar />
    </Screen>
  )
}

/** Once something is in the cart: what's in it and the way to it, without going back. */
function CartBar() {
  const nav = useNav()
  const { lines, bill } = useCartBill()
  const count = lines.reduce((n, l) => n + l.qty, 0)
  if (!count) return null
  return (
    <StickyBar>
      <Div className="flex-row items-center gap-3">
        <Div className="min-w-0 flex-1">
          <P className="text-caption text-ink-500">{plural(count, 'item')} in your cart</P>
          <P className="text-title-sm tabular-nums text-ink-900">{rupee(bill.total)}</P>
        </Div>
        <Button className="flex-1" onClick={() => nav.navigate('cart')} icon={<ShoppingCart className="h-[17px] w-[17px]" strokeWidth={2.2} />}>
          View cart
        </Button>
      </Div>
    </StickyBar>
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
      <ScreenHeader title="Cart" subtitle={plural(lines.length, 'item')} />

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
                  {pricing.active ? 'Subscriber rate applied' : 'HEALTH15 applied'}
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

/**
 * Delivery windows as the server knows them (KDC_backend pharmacy/delivery-slots.ts). Today's are
 * offered only while at least an hour is left (time to pack and send; the server refuses later),
 * so tomorrow morning is always there. The order is tracked with the actual date.
 */
const DELIVERY_WINDOWS: { value: string; day: string; time: string; endHour: number | null }[] = [
  { value: 'Today, 2–5 PM', day: 'Today', time: '2–5 PM', endHour: 17 },
  { value: 'Today, 5–8 PM', day: 'Today', time: '5–8 PM', endHour: 20 },
  // Sent as the original value, which every server version accepts; shown with the correct wording.
  { value: 'Tomorrow, 9–12 PM', day: 'Tomorrow', time: '9 AM–12 PM', endHour: null },
]
const windowOf = (value: string) => DELIVERY_WINDOWS.find((w) => w.value === value)!
const SLOT_CUTOFF_MS = 60 * 60_000

export function openDeliverySlots(now: Date = new Date()): string[] {
  return DELIVERY_WINDOWS.filter((w) => w.endHour === null || new Date(now).setHours(w.endHour, 0, 0, 0) - now.getTime() >= SLOT_CUTOFF_MS).map((w) => w.value)
}

export function CheckoutScreen() {
  const nav = useNav()
  const { lines, subtotal, bill } = useCartBill()
  const delivery = LIVE ? pharmacyDelivery(bill.total, careRules.pharmacyDeliveryFee, careRules.pharmacyFreeDeliveryAbove) : { fee: 0, toFree: 0 }
  const payable = bill.total + delivery.fee
  const coverage = useRxCoverage()
  const addresses = useAddresses((s) => s.items)
  const selectedAddressId = useAddresses((s) => s.selectedId)
  const selectAddress = useAddresses((s) => s.select)
  const methods = usePayments((s) => s.methods)
  const selectedMethod = usePayments((s) => s.selectedMethodId)
  const selectMethod = usePayments((s) => s.select)
  const slots = React.useMemo(() => openDeliverySlots(), [])
  const [slot, setSlot] = React.useState(slots[0])
  const [addingAddress, setAddingAddress] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const address = addresses.find((a) => a.id === selectedAddressId)
  const cod = selectedMethod === CASH_ON_DELIVERY.id

  // Live: can medicines be delivered to each saved address's pincode? (A failed lookup stays
  // unknown; the server checks again when the order is placed.)
  const served = useServiceability((s) => s.byPin)
  const pincodes = addresses.map(pincodeOf).filter(Boolean).join(',')
  React.useEffect(() => {
    if (!LIVE) return
    for (const pin of new Set(pincodes.split(',').filter(Boolean))) checkServiceable(pin).catch(() => undefined)
  }, [pincodes])
  const unserved = (a: { area: string }) => LIVE && served[pincodeOf(a)]?.ok === false
  const pin = pincodeOf(address)
  const blocked = Boolean(address && unserved(address))
  const alternative = blocked ? addresses.find((a) => a.id !== address?.id && served[pincodeOf(a)]?.ok === true) : undefined
  // While the chosen address can't be served, show every address so another can be picked.
  const shownAddresses = blocked ? addresses : addresses.filter((a, i) => i < 2 || a.id === selectedAddressId)

  const placeOrder = async () => {
    if (!coverage.covered) {
      showToast('Upload your prescription first', 'caution')
      nav.navigate('rx-upload')
      return
    }
    if (!address) {
      showToast('Add a delivery address first', 'caution')
      return
    }
    if (blocked) {
      showToast(`We don’t deliver medicines to ${pin} yet`, 'critical', 'Choose another address or add a new one.')
      return
    }
    if (LIVE && pin) {
      // Ask again just before placing (delivery areas change); the server has the last word.
      setChecking(true)
      const now = await checkServiceable(pin, { fresh: true }).catch(() => null)
      setChecking(false)
      if (now && !now.ok) {
        showToast(`We don’t deliver medicines to ${pin} yet`, 'critical', 'Choose another address or add a new one.')
        return
      }
    }
    useCheckout.getState().start({
      kind: 'pharmacy',
      amount: payable,
      title: 'Medicine order',
      subtitle: `${plural(lines.length, 'item')} · ${windowOf(slot).day}, ${windowOf(slot).time}`,
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
            {blocked && (
              <Div className="gap-2">
                <Banner
                  tone="critical"
                  icon={<AlertTriangle className="h-[16px] w-[16px]" strokeWidth={2.3} />}
                  title={`We don’t deliver medicines to ${pin} yet`}
                  body="Choose another address or add a new one. Your cart is kept."
                />
                <Div className="flex-row flex-wrap gap-2">
                  {alternative && (
                    <Button size="sm" onClick={() => selectAddress(alternative.id)}>
                      {`Deliver to ${alternative.label} (${pincodeOf(alternative)})`}
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => setAddingAddress(true)}>
                    Add another address
                  </Button>
                </Div>
              </Div>
            )}
            {shownAddresses.map((a) => (
              <Div key={a.id} className="gap-1">
                <AddressCard a={a} selected={a.id === selectedAddressId} onClick={() => selectAddress(a.id)} />
                {unserved(a) && (
                  <P className="px-1 text-caption font-medium text-critical-700">No medicine delivery to {pincodeOf(a)} yet</P>
                )}
              </Div>
            ))}
          </Div>
        </Div>

        <Div>
          <SectionHeader title="Delivery slot" className="!px-0 pb-2.5" />
          <Div className=" grid-cols-3 gap-2.5">
            {slots.map((s) => {
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
                  <P className="mt-1.5 text-[11px] font-bold leading-[14px]">{windowOf(s).day}</P>
                  <P className={`text-[10.5px] ${on ? 'text-white/75' : 'text-ink-400'}`}>{windowOf(s).time}</P>
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
          {delivery.fee > 0 ? (
            <KeyValue label="Delivery fee" value={rupee(delivery.fee)} />
          ) : (
            <KeyValue label="Delivery fee" value="FREE" tone="success" />
          )}
          {delivery.toFree > 0 && (
            <P className="mt-1 text-caption text-brand-700">Add {rupee(delivery.toFree)} more for free delivery</P>
          )}
          <Divider className="my-2.5" />
          {/* The same total the server charges: what you see is what you pay. */}
          <KeyValue label="Total payable" value={rupee(payable)} strong />
        </Card>
      </Div>

      <StickyBar>
        <Button onClick={placeOrder} loading={checking}>
          {blocked ? 'Choose a delivery address' : `Place order · ${rupee(payable)}`}
        </Button>
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
  useAfterSalesRefresh(code, order.status)
  const stage = currentStage(order, now)
  const finished = stage >= 4
  const riderInitials = order.rider.name.split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase()
  const stageTime = (i: number) => order.stageTimes?.[i]
  /** Live: the rider couldn't deliver it; it goes out again or back to the pharmacy. */
  const failed = order.status === 'delivery_failed'
  const returned = order.status === 'returned'
  const out = order.status === 'out_for_delivery'
  const attempts = order.deliveryAttempts ?? []
  const lastFail = lastFailedAttempt(attempts)
  const failReason = lastFail?.reason ?? 'the rider couldn’t complete it'
  const retryLeft = Math.max(0, MAX_DELIVERY_ATTEMPTS - attempts.length)
  const stateFor = (i: number) => (failed && i === stage ? 'failed' : stageState(i, stage, finished))
  const callRider = () => {
    if (!LIVE) return showToast(`Calling ${order.rider.name}`, 'info', order.rider.mobile)
    const digits = order.rider.mobile.replace(/\D/g, '').slice(-10)
    Linking.openURL(`tel:+91${digits}`).catch(() => showToast('Calling isn’t available on this device', 'critical', order.rider.mobile))
  }
  const orderAgain = () => {
    const cart = useCart.getState()
    order.lines.forEach((l) => cart.add(l.medicineId, l.qty))
    nav.navigate('cart')
  }
  const paidNote = LIVE ? (order.payment === 'Cash on delivery' ? 'Cash on delivery' : order.paymentRequired ? 'Waiting for payment' : 'Payment received') : 'Payment received'
  const rxNote = LIVE
    ? order.rxRequired ? 'Checked by our registered pharmacist' : 'No prescription needed'
    : 'Reviewed by Dr. Nandini R., Registered Pharmacist'
  const steps: TimelineStep[] = [
    { title: PHARMACY_STAGES[0], time: stageTime(0), body: `${paidNote} · ${order.id}`, state: stateFor(0) },
    { title: PHARMACY_STAGES[1], time: stageTime(1), body: rxNote, state: stateFor(1) },
    { title: PHARMACY_STAGES[2], time: stageTime(2), body: order.partner, state: stateFor(2) },
    {
      title: failed ? 'Delivery attempt failed' : PHARMACY_STAGES[3],
      time: failed && lastFail?.endedAt ? when(lastFail.endedAt) : stageTime(3),
      body: failed
        ? `We couldn’t deliver it: ${failReason}. ${retryLeft ? 'We’ll try again, or call you to arrange a better time.' : 'The pharmacy will call you about what happens next.'}`
        : order.rider.name ? `${order.rider.name} is on the way with your order` : 'A delivery partner brings your order',
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
          <IconButton size={34} tone="brand" label="Call rider" onClick={callRider}>
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
        <Div className={`rounded-card p-4 shadow-card ${failed ? 'bg-caution-700' : returned ? 'bg-ink-700' : 'bg-brand-900'}`}>
          <Div className="flex-row items-center gap-3.5">
            <Span className="flex-col h-[44px] w-[44px] shrink-0 items-center justify-center rounded-tile bg-white/15 ring-1 ring-inset  ring-white/20">
              {failed ? (
                <AlertTriangle className="h-[20px] w-[20px] text-white" strokeWidth={2.1} />
              ) : (
                <Truck className="h-[20px] w-[20px] text-white" strokeWidth={2.1} />
              )}
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-title-sm text-white">{order.cancelled ? order.statusLabel : failed ? 'Delivery attempt failed' : finished ? 'Delivered' : order.etaWhen}</P>
              <P className="mt-0.5 text-body-sm text-white/65">{plural(order.lines.length, 'item')} · {rupee(order.trackedTotal ?? order.amount)}</P>
            </Div>
          </Div>
          <Div className="mt-3.5 flex-row items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Span key={i} className={`h-[4px] flex-1 rounded-full ${i <= stage + 1 ? 'bg-white/90' : 'bg-white/25'}`} />
            ))}
          </Div>
          <P className="mt-2 text-caption text-white/60">
            {failed
              ? `Attempt ${attempts.length || 1} of ${MAX_DELIVERY_ATTEMPTS} didn’t go through · ${retryLeft ? 'we’ll try again' : 'the pharmacy will call you'}`
              : `Step ${stage + 1} of 5 · ${PHARMACY_STAGES[stage]}`}
          </P>
        </Div>

        <OrderChangeCard code={order.id} status={order.status} cod={order.payment === 'Cash on delivery'} />

        {out && order.deliveryOtp ? <DeliveryCodeCard code={order.deliveryOtp} /> : null}
        {out && order.deliveryCodeLocked ? (
          <Banner
            tone="caution"
            icon={<Lock className="h-[16px] w-[16px] text-caution-700" strokeWidth={2.2} />}
            title="Your delivery code is locked"
            body="A wrong code was entered too many times. Contact KDC+ support and we’ll send you a new code."
            action="Help"
            onAction={() => nav.navigate('help')}
          />
        ) : null}
        {failed ? (
          <Banner
            tone="caution"
            icon={<AlertTriangle className="h-[16px] w-[16px] text-caution-700" strokeWidth={2.2} />}
            title="We couldn’t deliver your order"
            body={`Reason: ${failReason}. ${
              retryLeft
                ? `We’ll try again: the pharmacy will send it out again or call you to arrange a better time. You’ll get a new delivery code when it’s on the way (${plural(retryLeft, 'attempt')} left).`
                : 'This was the last attempt. The pharmacy will call you; if it can’t be delivered it goes back and any online payment is refunded.'
            }`}
            action="Help"
            onAction={() => nav.navigate('help')}
          />
        ) : null}
        {returned ? (
          <Card elevation="tile">
            <P className="text-title-sm text-ink-900">Your order went back to the pharmacy</P>
            <P className="mt-1 text-body-sm leading-[19px] text-ink-600">
              We couldn’t deliver it{returnReason(order.cancelReason) ? `: ${returnReason(order.cancelReason)}` : ''}, so the order was cancelled.{' '}
              {order.refundAmount
                ? `${rupee(order.refundAmount)} is being refunded to your original payment method; it usually arrives in 5–7 working days.`
                : order.payment === 'Cash on delivery'
                  ? 'It was cash on delivery, so nothing was charged.'
                  : 'Nothing was charged.'}
            </P>
            <Div className="mt-3">
              <Button variant="secondary" onClick={orderAgain}>
                Order again
              </Button>
            </Div>
          </Card>
        ) : null}

        <Card elevation="tile">
          <Timeline steps={steps} />
        </Card>

        {attempts.length > 1 || lastFail ? <DeliveryAttemptsCard attempts={attempts} /> : null}

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

        <OrderReturnsCard code={order.id} status={order.status} lines={order.lines} />
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

/** A server timestamp as the tracking steps show it ("25 Nov 2026, 5:30 PM", IST). */
const when = (at: string) => `${atToDay(at)}, ${atToTime(at)}`

/** Out for delivery: the 4-digit code the patient gives the rider at the door. */
function DeliveryCodeCard({ code }: { code: string }) {
  return (
    <Card elevation="card" className="border border-brand-100">
      <P className="text-caption font-bold uppercase tracking-[.08em] text-brand-700">Delivery code</P>
      <Div className="mt-2.5 flex-row gap-2" accessibilityLabel={`Delivery code ${code.split('').join(' ')}`} testID="delivery-code">
        {code.split('').map((d, i) => (
          <Span key={i} className="flex-col h-[56px] w-[48px] items-center justify-center rounded-tile bg-brand-50 text-[28px] font-bold tabular-nums text-brand-900">
            {d}
          </Span>
        ))}
      </Div>
      <P className="mt-3 text-body-sm leading-[19px] text-ink-600">Share this code with the delivery partner only when you receive your order.</P>
    </Card>
  )
}

const ATTEMPT_OUTCOME: Record<string, { label: string; tone: 'success' | 'caution' | 'brand' }> = {
  delivered: { label: 'Delivered', tone: 'success' },
  failed: { label: 'Not delivered', tone: 'caution' },
  out: { label: 'On the way', tone: 'brand' },
}

/** Each time the order went out, and how it ended. */
function DeliveryAttemptsCard({ attempts }: { attempts: DeliveryAttempt[] }) {
  return (
    <Card elevation="tile">
      <P className="mb-2.5 text-title-sm text-ink-900">Delivery attempts</P>
      <Div className="gap-3">
        {[...attempts]
          .sort((a, b) => a.attempt - b.attempt)
          .map((a) => {
            const o = ATTEMPT_OUTCOME[a.outcome] ?? { label: a.outcome, tone: 'brand' as const }
            return (
              <Div key={a.attempt} className="flex-row items-start gap-2.5">
                <Div className="min-w-0 flex-1">
                  <P className="text-body-sm font-semibold text-ink-900">
                    Attempt {a.attempt}
                    {a.outAt ? ` · out ${when(a.outAt)}` : ''}
                  </P>
                  {a.outcome === 'failed' && <P className="text-caption text-ink-500">{a.reason ? `Reason: ${a.reason}` : 'The rider couldn’t complete it'}</P>}
                </Div>
                <StatusBadge tone={o.tone} dot={a.outcome === 'out'}>
                  {o.label}
                </StatusBadge>
              </Div>
            )
          })}
      </Div>
    </Card>
  )
}

/* ============================ 34b — Returns and proposed changes (Wave 5) == */

const AFTER_SALES_REFRESH_MS = 20_000
const STOPPED = ['cancelled', 'returned', 'pending_payment']

/** Live: the order's returns (once delivered) or the pharmacy's proposals (before that), reloaded while open. */
function useAfterSalesRefresh(code: string | undefined, status: string | undefined) {
  React.useEffect(() => {
    if (!LIVE || !code || !status || STOPPED.includes(status)) return
    const load = () => void (status === 'delivered' ? loadOrderReturns(code) : loadOrderChanges(code)).catch(() => undefined)
    load()
    const timer = setInterval(load, AFTER_SALES_REFRESH_MS)
    return () => clearInterval(timer)
  }, [code, status])
}

/** After a decision the order itself may have changed (lines, total, cancelled). */
const reloadOrder = (code: string) => {
  if (!LIVE) return
  void loadPharmacyOrder(code).then((o) => useOrders.getState().upsertPharmacy(o)).catch(() => undefined)
  void loadOrderChanges(code).catch(() => undefined)
}

/** The pharmacy's proposal on this order, waiting for the patient; or, after a decision, what happened. */
function OrderChangeCard({ code, status, cod }: { code: string; status?: string; cod: boolean }) {
  const changes = useAfterSales((s) => s.changes[code])
  const open = changes ? openChange(changes) : null
  const latest = changes?.[0] ?? null
  if (open) return <ProposalCard key={open.code} code={code} change={open} cod={cod} />
  if (!latest || latest.status === 'proposed') return null
  const accepted = latest.status === 'accepted'
  if (!accepted && (status === 'delivered' || STOPPED.includes(status ?? ''))) return null
  return (
    <Banner
      tone={accepted ? 'success' : 'brand'}
      icon={accepted ? <Check className="h-[16px] w-[16px] text-vital-700" strokeWidth={2.6} /> : <Info className="h-[16px] w-[16px] text-brand-700" strokeWidth={2.2} />}
      title={{ accepted: 'You accepted the pharmacy’s change', rejected: 'You rejected the pharmacy’s change', expired: 'The pharmacy’s proposed change expired', withdrawn: 'The pharmacy withdrew its proposed change' }[latest.status]}
      body={accepted ? `New total ${paiseRupees(latest.newTotalPaise)}${latest.refundPaise ? ` · ${paiseRupees(latest.refundPaise)} refunded to your original payment method` : ''}.` : 'Your order stays as you placed it.'}
    />
  )
}

function ProposalCard({ code, change: c, cod }: { code: string; change: OrderChange; cod: boolean }) {
  const now = useNow(1000)
  const [sheet, setSheet] = React.useState<'accept' | 'reject' | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [note, setNote] = React.useState('')
  const [cancelOrder, setCancelOrder] = React.useState(false)
  const left = changeTimeLeft(c.expiresAt, now)
  const dearer = c.differencePaise > 0
  const decide = async (accept: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      if (accept) {
        const r = await acceptChange(code, c.code)
        showToast('Change accepted', 'success', r.refundPaise ? `Your order is updated. ${paiseRupees(r.refundPaise)} is being refunded.` : 'Your order is updated.')
      } else {
        const n = note.trim()
        await rejectChange(code, c.code, { ...(n.length >= 2 ? { note: n } : {}), ...(cancelOrder ? { cancelOrder: true } : {}) })
        showToast(cancelOrder ? 'Change rejected and order cancelled' : 'Change rejected', 'success', cancelOrder ? (cod ? 'Nothing was charged.' : 'Your online payment is refunded in full.') : 'The pharmacy sends the order as placed, or hands it to another pharmacy.')
      }
      setSheet(null)
    } catch (e) {
      showToast(errorMessage(e), 'critical')
      setSheet(null)
    } finally {
      setBusy(false)
      reloadOrder(code)
    }
  }
  return (
    <Card elevation="card" className="bg-caution-50 ring-1 ring-inset ring-caution-100">
      <Div className="flex-row items-start gap-3">
        <AlertTriangle className="mt-[2px] h-[18px] w-[18px] shrink-0 text-caution-700" strokeWidth={2.2} />
        <Div className="min-w-0 flex-1">
          <P className="text-title-sm text-ink-900">The pharmacy needs your OK to change this order</P>
          <P className="mt-0.5 text-body-sm leading-[19px] text-ink-600">{c.note ? `“${c.note}”` : 'Some medicines can’t be sent exactly as ordered.'}</P>
        </Div>
      </Div>
      <Div className="mt-2.5 flex-row">
        <StatusBadge tone={left ? 'caution' : 'neutral'} icon={<Clock className="h-[12px] w-[12px] text-caution-700" strokeWidth={2.4} />}>
          {left ? `${left} left` : 'Expired'}
        </StatusBadge>
      </Div>
      <Div className="mt-3 gap-2.5">
        {c.lines.map((l) => (
          <Div key={l.orderItemId} className="flex-row items-start gap-3 rounded-tile bg-white p-3">
            <Div className="min-w-0 flex-1">
              <P className="text-caption font-bold uppercase tracking-[.06em] text-caution-700">{CHANGE_ACTION_LABEL[l.action]}</P>
              <P className="mt-0.5 text-body-sm leading-[19px] text-ink-800">{changeLineText(l)}</P>
            </Div>
            <Span className={`shrink-0 text-body-sm font-bold tabular-nums ${l.differencePaise > 0 ? 'text-critical-700' : l.differencePaise < 0 ? 'text-vital-700' : 'text-ink-500'}`}>{signedRupees(l.differencePaise)}</Span>
          </Div>
        ))}
      </Div>
      <Div className="mt-3 gap-1.5">
        <KeyValue label="Was" value={paiseRupees(c.oldTotalPaise)} />
        <KeyValue label="New total" value={paiseRupees(c.newTotalPaise)} />
        <KeyValue label="Difference" value={signedRupees(c.differencePaise)} />
        {c.refundPaise ? <KeyValue label="Refund" value={`${paiseRupees(c.refundPaise)} to your payment method`} /> : null}
      </Div>
      {dearer && cod ? <P className="mt-2 text-caption text-caution-700">It costs more: you’d pay {paiseRupees(c.newTotalPaise)} on delivery.</P> : null}
      <P className="mt-3 text-caption leading-[17px] text-ink-500">
        {left ? `If you don’t answer in time, the pharmacy sends the order as placed or hands it to another pharmacy.` : 'This proposal has expired.'}
      </P>
      <Div className="mt-3 flex-row gap-2.5">
        <Div className="flex-1">
          <Button variant="tertiary" size="md" disabled={!left} onClick={() => left && setSheet('reject')}>
            Reject
          </Button>
        </Div>
        <Div className="flex-1">
          <Button variant="success" size="md" disabled={!left} onClick={() => left && setSheet('accept')}>
            Accept change
          </Button>
        </Div>
      </Div>

      <SheetModal
        visible={sheet === 'accept'}
        onClose={() => !busy && setSheet(null)}
        title="Accept the change?"
        subtitle={`New total ${paiseRupees(c.newTotalPaise)}${c.refundPaise ? ` · ${paiseRupees(c.refundPaise)} refunded` : cod ? ' · paid on delivery' : ''}`}
        footer={
          <Button variant="success" loading={busy} onClick={() => void decide(true)}>
            Yes, accept change
          </Button>
        }
      >
        <P className="text-body-sm leading-[19px] text-ink-600">
          Your order is updated as shown{c.refundPaise ? ` and ${paiseRupees(c.refundPaise)} goes back to your original payment method (usually 5–7 working days)` : ''}.
        </P>
      </SheetModal>

      <SheetModal
        visible={sheet === 'reject'}
        onClose={() => !busy && setSheet(null)}
        title="Reject the change?"
        subtitle="Your order stays as you placed it."
        footer={
          <Button variant="danger" loading={busy} onClick={() => void decide(false)}>
            {cancelOrder ? 'Reject and cancel order' : 'Reject change'}
          </Button>
        }
      >
        <Div className="gap-3.5">
          <P className="text-body-sm leading-[19px] text-ink-600">The pharmacy sends it as placed if it can, or hands it to another KDC+ pharmacy. That may take a little longer.</P>
          <Field label="Reason (optional)">
            <TextArea value={note} onChangeText={setNote} maxLength={255} placeholder="e.g. I’d rather wait for the original brand" />
          </Field>
          <Btn onPress={() => setCancelOrder((v) => !v)} accessibilityLabel="Cancel the whole order instead" className="tap flex-row items-start gap-3 rounded-tile bg-ink-50 p-3 text-left">
            <Span className={`mt-[1px] flex-col h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[7px] ${cancelOrder ? 'bg-brand-600' : 'bg-white ring-1 ring-inset ring-ink-300'}`}>
              {cancelOrder && <Check className="h-[13px] w-[13px] text-white" strokeWidth={3.4} />}
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-body-sm font-semibold text-ink-900">Cancel the whole order instead</P>
              <P className="text-caption text-ink-500">{cod ? 'Nothing is charged.' : 'Your online payment is refunded in full.'}</P>
            </Div>
          </Btn>
        </Div>
      </SheetModal>
    </Card>
  )
}

/** A delivered order's returns, and "Return or report a problem" while the return window is open. */
function OrderReturnsCard({ code, status, lines }: { code: string; status?: string; lines: { medicineId: string; qty: number; name?: string; price?: number }[] }) {
  const returns = useAfterSales((s) => s.returns[code])
  const deliveredAt = useAfterSales((s) => s.deliveredAt[code])
  const now = useNow(60_000)
  const [flow, setFlow] = React.useState(false)
  const [withdrawing, setWithdrawing] = React.useState<ReturnView | null>(null)
  const [busy, setBusy] = React.useState(false)
  const can = canRequestReturn(status, deliveredAt, now)
  const left = returnableQty(lines.map((l) => ({ name: l.name ?? getMedicine(l.medicineId).name, qty: l.qty })), returns ?? [])
  const any = left.some((n) => n > 0)
  if (status !== 'delivered' || (!can && !returns?.length)) return null
  const withdraw = async () => {
    if (!withdrawing || busy) return
    setBusy(true)
    try {
      await cancelReturn(withdrawing.code)
      showToast('Return withdrawn', 'success')
      setWithdrawing(null)
    } catch (e) {
      showToast(errorMessage(e), 'critical')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card elevation="tile">
      <P className="text-title-sm text-ink-900">Returns</P>
      <P className="mt-0.5 text-body-sm leading-[19px] text-ink-500">
        {can ? (returns?.length ? 'Your returns on this order.' : 'Something wrong with a medicine? Tell us and the pharmacy will sort it out.') : 'The return window for this order has closed.'}
      </P>
      {can && returns && any ? (
        <Div className="mt-3">
          <Button variant="secondary" size="md" icon={<Package className="h-[16px] w-[16px] text-brand-700" strokeWidth={2.2} />} onClick={() => setFlow(true)}>
            Return or report a problem
          </Button>
        </Div>
      ) : null}
      {(returns ?? []).map((r) => (
        <Div key={r.code} className="mt-3.5 rounded-tile bg-ink-50/60 p-3.5">
          <Div className="flex-row items-start justify-between gap-2">
            <Div className="min-w-0 flex-1">
              <P className="text-body-sm font-semibold text-ink-900">{r.lines.map((l) => `${l.name} × ${l.qty}`).join(', ')}</P>
              <P className="text-caption tabular-nums text-ink-400">{r.code}</P>
            </Div>
            <StatusBadge tone={RETURN_STATUS_TONE[r.status]} dot={r.status === 'requested' || r.status === 'approved' || r.status === 'received'}>
              {RETURN_STATUS_LABEL[r.status]}
            </StatusBadge>
          </Div>
          <Div className="mt-3">
            <Timeline steps={returnSteps(r, when)} />
          </Div>
          {r.status === 'requested' ? (
            <Div className="mt-2">
              <Button variant="text" size="sm" block={false} className="!text-critical-600" onClick={() => setWithdrawing(r)}>
                Withdraw return
              </Button>
            </Div>
          ) : null}
        </Div>
      ))}
      {can && returns?.length && !any ? <P className="mt-2 text-caption text-ink-400">Every pack on this order is already in a return.</P> : null}

      {flow ? <ReturnSheet code={code} lines={lines} left={left} onClose={() => setFlow(false)} /> : null}
      <SheetModal
        visible={Boolean(withdrawing)}
        onClose={() => !busy && setWithdrawing(null)}
        title="Withdraw this return?"
        subtitle="The pharmacy won’t act on it."
        footer={
          <Button variant="danger" loading={busy} onClick={() => void withdraw()}>
            Yes, withdraw
          </Button>
        }
      >
        <P className="text-body-sm leading-[19px] text-ink-600">You can ask again while the order is within its return window.</P>
      </SheetModal>
    </Card>
  )
}

const RETURN_STEPS = ['Medicines', 'What happened', 'Review'] as const

/** Picking the medicines and packs, the reason, a note and photos, then sending the return (one sheet, three steps). */
function ReturnSheet({ code, lines, left, onClose }: { code: string; lines: { medicineId: string; qty: number; name?: string; price?: number }[]; left: number[]; onClose: () => void }) {
  const [step, setStep] = React.useState(0)
  const [qty, setQty] = React.useState<number[]>(() => lines.map(() => 0))
  const [reason, setReason] = React.useState<ReturnReason | null>(null)
  const [note, setNote] = React.useState('')
  const [photos, setPhotos] = React.useState<{ id: number; uri?: string; name: string }[]>([])
  const [uploading, setUploading] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [key] = React.useState(newReturnKey)
  const nameOf = (l: (typeof lines)[number]) => l.name ?? getMedicine(l.medicineId).name
  const priceOf = (l: (typeof lines)[number]) => l.price ?? getMedicine(l.medicineId).price
  const picked = lines.map((l, i) => ({ l, q: qty[i] })).filter((x) => x.q > 0)
  const value = picked.reduce((t, x) => t + priceOf(x.l) * x.q, 0)
  const meta = RETURN_REASONS.find((r) => r.id === reason)
  const draft = { qty, reason, note, photos: photos.length, uploading }

  const close = () => {
    if (busy) return
    // Photos not sent with a return are removed (the server would delete them after a day anyway).
    photos.forEach((p) => void deleteReturnPhoto(p.id))
    onClose()
  }
  const next = () => {
    const e = returnDraftErrors(draft, step === 0 ? 0 : 1)
    setErrors(e)
    if (!Object.keys(e).length) setStep((s) => Math.min(2, s + 1))
  }
  const setLine = (i: number, n: number) => setQty((q) => q.map((v, j) => (j === i ? Math.max(0, Math.min(left[i], n)) : v)))
  const addPhoto = async (pick: () => Promise<PickResult>) => {
    if (photos.length + uploading >= MAX_RETURN_PHOTOS) return showToast(`Up to ${MAX_RETURN_PHOTOS} photos per return`, 'caution')
    const result = await pick()
    if (result.status === 'denied') return showToast('Allow camera and photo access in Settings', 'caution')
    if (result.status === 'error') return showToast(result.message, 'critical')
    if (result.status !== 'picked') return
    setUploading((n) => n + 1)
    try {
      const id = await uploadReturnPhoto(result.file)
      setPhotos((p) => [...p, { id, uri: result.file.uri, name: result.file.name }])
      setErrors(({ photos: _p, ...rest }) => rest)
    } catch (e) {
      showToast(errorMessage(e), 'critical')
    } finally {
      setUploading((n) => n - 1)
    }
  }
  const removePhoto = (id: number) => {
    setPhotos((p) => p.filter((x) => x.id !== id))
    void deleteReturnPhoto(id)
  }
  const submit = async () => {
    const e = returnDraftErrors(draft, 1)
    setErrors(e)
    if (Object.keys(e).length || !reason || busy) return
    setBusy(true)
    try {
      const n = note.trim()
      await requestReturn(code, { reason, ...(n ? { note: n } : {}), lines: picked.map((x) => ({ medicineCode: x.l.medicineId, qty: x.q })), ...(photos.length ? { photoFileIds: photos.map((p) => p.id) } : {}) }, key)
      showToast('Return requested', 'success', 'The pharmacy will review it. We’ll let you know.')
      onClose()
    } catch (err) {
      const field = err instanceof ServiceError ? err.field : undefined
      if (field?.startsWith('lines')) setStep(0)
      else if (field === 'photoFileIds' || field === 'note' || field === 'reason') setStep(1)
      if (field) setErrors({ [field.startsWith('lines') ? 'lines' : field === 'photoFileIds' ? 'photos' : field]: errorMessage(err) })
      showToast(errorMessage(err), 'critical')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetModal
      visible
      onClose={close}
      title="Return or report a problem"
      subtitle={`Step ${step + 1} of 3 · ${RETURN_STEPS[step]}`}
      footer={
        <Div className="flex-row gap-2.5">
          {step > 0 ? (
            <Div className="flex-1">
              <Button variant="tertiary" size="md" disabled={busy} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            </Div>
          ) : null}
          <Div className="flex-1">
            {step < 2 ? (
              <Button size="md" onClick={next}>
                Continue
              </Button>
            ) : (
              <Button size="md" loading={busy} onClick={() => void submit()}>
                Send return request
              </Button>
            )}
          </Div>
        </Div>
      }
    >
      {step === 0 ? (
        <Div className="gap-2.5">
          <P className="text-body-sm text-ink-500">Choose each medicine with a problem and how many packs to return.</P>
          {lines.map((l, i) => (
            <Div key={l.medicineId} className={`flex-row items-center gap-3 rounded-tile bg-white p-3 ring-1 ring-inset ${qty[i] ? 'ring-brand-600' : 'ring-ink-100'}`}>
              <Div className="min-w-0 flex-1">
                <P className="truncate text-body-sm font-semibold text-ink-900">{nameOf(l)}</P>
                <P className="text-caption text-ink-400">{left[i] ? `${l.qty} delivered${left[i] < l.qty ? ` · ${left[i]} can be returned` : ''}` : 'Already in a return'}</P>
              </Div>
              {left[i] ? (
                <Div className="flex-row h-[32px] items-center gap-0.5 rounded-[10px] bg-brand-50 p-0.5">
                  <Btn onPress={() => setLine(i, qty[i] - 1)} disabled={!qty[i]} accessibilityLabel={`One less ${nameOf(l)}`} className="tap flex-col h-[28px] w-[28px] items-center justify-center rounded-[8px] text-brand-700 disabled:opacity-40">
                    <Minus className="h-[14px] w-[14px] text-brand-700" strokeWidth={2.6} />
                  </Btn>
                  <Span className="w-[22px] text-center text-body-sm font-bold tabular-nums text-ink-900">{qty[i]}</Span>
                  <Btn onPress={() => setLine(i, qty[i] + 1)} disabled={qty[i] >= left[i]} accessibilityLabel={`Return one more ${nameOf(l)}`} className="tap flex-col h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-white text-brand-700 shadow-tile disabled:opacity-40">
                    <Plus className="h-[14px] w-[14px] text-brand-700" strokeWidth={2.6} />
                  </Btn>
                </Div>
              ) : null}
            </Div>
          ))}
          {errors.lines ? <P className="text-caption text-critical-600">{errors.lines}</P> : null}
        </Div>
      ) : null}

      {step === 1 ? (
        <Div className="gap-3.5">
          <Div className="gap-2">
            {RETURN_REASONS.map((r) => (
              <RadioRow key={r.id} selected={reason === r.id} title={r.label} subtitle={r.hint} onClick={() => setReason(r.id)} />
            ))}
            {errors.reason ? <P className="text-caption text-critical-600">{errors.reason}</P> : null}
          </Div>
          <Field label={reason === 'other' ? 'Tell us what happened' : 'Anything to add? (optional)'} required={reason === 'other'} error={errors.note} hint={`${note.trim().length}/${RETURN_NOTE_MAX}`}>
            <TextArea value={note} onChangeText={setNote} maxLength={RETURN_NOTE_MAX} placeholder="e.g. The strip was crushed and two tablets were broken" />
          </Field>
          <Div className="gap-2">
            <P className="text-body-sm font-semibold text-ink-600">
              {meta?.photo ? 'Photos' : 'Photos (optional)'} · {photos.length}/{MAX_RETURN_PHOTOS}
            </P>
            <P className="text-caption text-ink-400">Show the pack, the problem and the label with the batch and expiry.</P>
            {photos.length || uploading ? (
              <Div className="flex-row flex-wrap gap-2">
                {photos.map((p) => (
                  <Div key={p.id} className="relative h-[64px] w-[64px] overflow-hidden rounded-tile bg-ink-50">
                    <Img src={p.uri || SCENE.blister} alt={p.name} className="h-[64px] w-[64px] object-cover" />
                    <Btn onPress={() => removePhoto(p.id)} accessibilityLabel={`Remove ${p.name}`} className="tap absolute right-[3px] top-[3px] flex-col h-[22px] w-[22px] items-center justify-center rounded-full bg-ink-900/70">
                      <X className="h-[12px] w-[12px] text-white" strokeWidth={2.8} />
                    </Btn>
                  </Div>
                ))}
                {Array.from({ length: uploading }, (_, i) => (
                  <Div key={`u${i}`} className="flex-col h-[64px] w-[64px] items-center justify-center rounded-tile bg-ink-50">
                    <P className="text-caption text-ink-400">Uploading…</P>
                  </Div>
                ))}
              </Div>
            ) : null}
            {photos.length + uploading < MAX_RETURN_PHOTOS ? (
              <Div className="flex-row gap-2.5">
                <Div className="flex-1">
                  <Button variant="tertiary" size="sm" icon={<Camera className="h-[15px] w-[15px] text-ink-700" strokeWidth={2.2} />} onClick={() => void addPhoto(services.documents.pickFromCamera)}>
                    Take a photo
                  </Button>
                </Div>
                <Div className="flex-1">
                  <Button variant="tertiary" size="sm" icon={<ImageIcon className="h-[15px] w-[15px] text-ink-700" strokeWidth={2.2} />} onClick={() => void addPhoto(services.documents.pickFromGallery)}>
                    From gallery
                  </Button>
                </Div>
              </Div>
            ) : null}
            {errors.photos ? <P className="text-caption text-critical-600">{errors.photos}</P> : null}
          </Div>
        </Div>
      ) : null}

      {step === 2 ? (
        <Div className="gap-3">
          <Div className="gap-1.5">
            {picked.map((x) => (
              <KeyValue key={x.l.medicineId} label={nameOf(x.l)} value={`${x.q} ${x.q === 1 ? 'pack' : 'packs'}`} />
            ))}
          </Div>
          <Divider />
          <KeyValue label="Reason" value={meta?.label ?? ''} />
          {note.trim() ? <P className="text-body-sm text-ink-500">“{note.trim()}”</P> : null}
          <KeyValue label="Photos" value={photos.length ? String(photos.length) : 'None'} />
          <KeyValue label="Up to" value={rupee(value)} />
          <P className="text-caption leading-[17px] text-ink-500">
            The pharmacy checks the packs when they come back; the refund is what it accepts, on a credit note. The delivery fee isn’t refunded. Keep the medicines in their packs until they’re collected.
          </P>
        </Div>
      ) : null}
    </SheetModal>
  )
}
