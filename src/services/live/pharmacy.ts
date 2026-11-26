/**
 * Live pharmacy: the medicine catalogue (/public/medicines, /public/medicine-categories) and the
 * patient's orders (/patient/pharmacy/orders), mapped into the app's types. Medicine codes are
 * the ids. Prices, stock and prescription rules are the server's.
 */
import { create } from 'zustand'
import type { Medicine, MedicineDetail, PharmacyCategory, PharmacyOrder } from '../../types'
import type { MedicineFilter, MedicineQuery } from '../../domain/catalogue'
import { SCENE } from '../../mock-data/media'
import { mergeCatalog, useCatalog } from '../../store/catalog'
import { api, qs } from './http'
import { atToDay, atToTime, num } from './map'
import { rememberDelivered } from './returns'

export interface ApiMedicine {
  code: string
  name: string
  generic: string
  salts: string[]
  brand: string
  pack: string
  strength: string | null
  mrp: number | string
  price: number | string
  discountPct: number
  rxRequired: boolean
  inStock: boolean
  category: { name: string; slug: string } | null
  photoUrl: string | null
  about?: string | null
  sideEffects?: string[]
}

interface Page<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

/** The catalogue has no product photos yet: a generic pack image stands in, the same one each time. */
const PACK_PHOTOS = [SCENE.blister, SCENE.tablets, SCENE.pills]
const packPhoto = (code: string) => PACK_PHOTOS[[...code].reduce((n, c) => n + c.charCodeAt(0), 0) % PACK_PHOTOS.length]

export function toMedicine(m: ApiMedicine): Medicine {
  return {
    id: m.code,
    name: m.name,
    generic: m.generic,
    brand: m.brand,
    pack: m.pack,
    mrp: num(m.mrp),
    price: num(m.price),
    rx: m.rxRequired,
    inStock: m.inStock,
    photo: m.photoUrl ?? packPhoto(m.code),
    category: m.category?.name ?? '',
  }
}

/** Medicine details (about, side effects), loaded when a medicine's page opens. */
export const useMedicineDetails = create<{ byCode: Record<string, MedicineDetail> }>(() => ({ byCode: {} }))

const FILTER: Record<MedicineFilter, string> = {
  All: 'all',
  Prescription: 'rx',
  'Over the counter': 'otc',
  'In stock': 'in_stock',
  'Under ₹200': 'under_200',
}

/** A category's slug from its name (screens pass the name). */
const categorySlug = (name?: string) =>
  name ? useCatalog.getState().pharmacyCategories.find((c) => c.name === name || c.id === name)?.id ?? name : undefined

export async function searchMedicines(q: MedicineQuery): Promise<Medicine[]> {
  const page = await api.pub<Page<ApiMedicine>>(
    `public/medicines${qs({ q: q.text.trim(), category: categorySlug(q.category), filter: FILTER[q.filter], limit: 50 })}`,
  )
  const list = page.rows.map(toMedicine)
  mergeCatalog('medicines', list)
  return list
}

export async function loadMedicine(code: string): Promise<Medicine> {
  const m = await api.pub<ApiMedicine>(`public/medicines/${encodeURIComponent(code)}`)
  const medicine = toMedicine(m)
  mergeCatalog('medicines', [medicine])
  useMedicineDetails.setState((s) => ({
    byCode: { ...s.byCode, [m.code]: { about: m.about ?? '', sideEffects: m.sideEffects ?? [] } },
  }))
  return medicine
}

export async function loadMedicineCatalog() {
  const [categories, first] = await Promise.all([
    api.pub<{ name: string; slug: string; items: number }[]>('public/medicine-categories'),
    api.pub<Page<ApiMedicine>>('public/medicines?limit=50'),
  ])
  const pharmacyCategories: PharmacyCategory[] = categories.map((c) => ({ id: c.slug, name: c.name, items: c.items }))
  useCatalog.setState({ pharmacyCategories })
  mergeCatalog('medicines', first.rows.map(toMedicine))
}

/* ------------------------------------------------------------------ Orders */

export interface ApiAddressSnapshot {
  line: string
  area: string
  city?: string | null
  pincode?: string | null
  label?: string
  phone?: string
}

export interface ApiPharmacyOrder {
  code: string
  status: string
  stage: string
  bill: { subtotal: number | string; memberSaving: number | string; deliveryFee: number | string; total: number | string }
  paymentMethod: 'online' | 'cod'
  paymentStatus: string
  paidVia: string | null
  paymentRequired: boolean
  deliverySlot: string
  address: ApiAddressSnapshot | null
  rxRequired: boolean
  rxVerified: boolean
  rider: { name: string; mobile: string } | null
  placedAt: string
  deliveredAt: string | null
  cancellation: { reason?: string | null; at?: string | null; refundAmount?: number | string | null } | null
  lines: { medicineCode: string; name: string; qty: number; unitPrice: number | string }[]
  itemCount: number
  pharmacy: { name: string } | string | null
  history?: { from: string | null; to: string; at: string }[]
  /** Only while out for delivery, only to the patient, not once locked. */
  deliveryOtp?: string | null
  deliveryCodeLocked?: boolean
  /** Detail only. */
  deliveryAttempts?: { attempt: number; outAt: string | null; outcome: string; reason: string | null; endedAt: string | null }[]
}

/** The server's statuses on the app's five tracking steps. */
const PHARMACY_STEP: Record<string, number> = { pending_payment: 0, placed: 0, confirmed: 1, packed: 2, out_for_delivery: 3, delivery_failed: 3, delivered: 4 }

export const addressLine = (a: ApiAddressSnapshot | null) =>
  a ? [a.line, a.area, a.city, a.pincode].filter(Boolean).join(', ') : ''

const when = (at: string) => `${atToDay(at)}, ${atToTime(at)}`

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * The delivery window as people say it: the server stores the date ("24 Nov, 9 AM–12 PM"), shown
 * as "Tomorrow · 9 AM–12 PM" while that's true and with its date otherwise. Older orders stored
 * "Today, 5–8 PM" literally; those are shown as they are.
 */
export function deliveryWindow(stored: string, now: Date = new Date()): string {
  const m = /^(\d{1,2}) ([A-Z][a-z]{2}), (.+)$/.exec(stored)
  if (!m) return stored.replace(', ', ' · ')
  const day = (offset: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`
  }
  const date = `${m[1]} ${m[2]}`
  const label = date === day(0) ? 'Today' : date === day(1) ? 'Tomorrow' : date
  return `${label} · ${m[3]}`
}

export function toPharmacyOrder(o: ApiPharmacyOrder): PharmacyOrder {
  const cancelled = o.status === 'cancelled' || o.status === 'returned'
  const delivered = o.status === 'delivered'
  const slot = deliveryWindow(o.deliverySlot)
  // When each step was reached, from the status history (detail only).
  const stageTimes: string[] = []
  for (const h of o.history ?? []) {
    const step = PHARMACY_STEP[h.to]
    if (step !== undefined && !stageTimes[step]) stageTimes[step] = when(h.at)
  }
  if (!stageTimes[0]) stageTimes[0] = when(o.placedAt)
  const pharmacy = typeof o.pharmacy === 'string' ? o.pharmacy : o.pharmacy?.name
  return {
    id: o.code,
    kind: 'pharmacy',
    placedAt: Date.parse(o.placedAt),
    placed: atToDay(o.placedAt),
    eta: o.deliverySlot,
    etaWhen: cancelled
      ? o.stage
      : delivered && o.deliveredAt
        ? `Delivered ${when(o.deliveredAt)}`
        : o.status === 'delivery_failed'
          ? 'Delivery missed · we’ll try again'
          : `Arriving ${slot}`,
    lines: o.lines.map((l) => ({ medicineId: l.medicineCode, qty: l.qty, name: l.name, price: num(l.unitPrice) })),
    amount: num(o.bill.total),
    address: addressLine(o.address),
    partner: pharmacy ?? 'a KDC+ partner pharmacy',
    rider: o.rider ?? { name: '', mobile: '' },
    fixedStage: PHARMACY_STEP[o.status] ?? 0,
    stageTimes,
    payment: o.paymentMethod === 'cod' ? 'Cash on delivery' : o.paidVia ?? 'Online',
    statusLabel: o.stage,
    cancelled,
    rxRequired: o.rxRequired,
    paymentRequired: o.paymentRequired,
    status: o.status,
    deliveryOtp: o.status === 'out_for_delivery' ? (o.deliveryOtp ?? null) : null,
    deliveryCodeLocked: o.status === 'out_for_delivery' && Boolean(o.deliveryCodeLocked),
    ...(o.deliveryAttempts ? { deliveryAttempts: o.deliveryAttempts.map((a) => ({ ...a })) } : {}),
    ...(o.cancellation ? { cancelReason: o.cancellation.reason ?? undefined, refundAmount: num(o.cancellation.refundAmount ?? 0) } : {}),
  }
}

export async function listPharmacyOrders(): Promise<PharmacyOrder[]> {
  const page = await api.get<Page<ApiPharmacyOrder>>('patient/pharmacy/orders?scope=all&limit=50')
  rememberDelivered(page.rows)
  return page.rows.map(toPharmacyOrder)
}

export async function loadPharmacyOrder(code: string): Promise<PharmacyOrder> {
  const o = await api.get<ApiPharmacyOrder>(`patient/pharmacy/orders/${encodeURIComponent(code)}`)
  rememberDelivered([o])
  return toPharmacyOrder(o)
}
