import type { DiagnosticOrder, Order, PharmacyOrder } from '../types'

export const PHARMACY_STAGES = ['Order confirmed', 'Prescription verified', 'Packed at pharmacy', 'Out for delivery', 'Delivered'] as const
export const DIAGNOSTIC_STAGES = ['Booking confirmed', 'Technician assigned', 'Sample collected', 'Processing at lab', 'Report ready'] as const

/** A mock order moves one stage every 45 seconds so tracking can be watched. Live orders carry the server's stage (`fixedStage`). */
export const STAGE_INTERVAL_MS = 45_000

/** Zero-based index of the stage the order is currently in. */
export function currentStage(order: Order, now: number): number {
  if (order.fixedStage !== undefined) return order.fixedStage
  return Math.min(4, Math.max(0, Math.floor((now - order.placedAt) / STAGE_INTERVAL_MS)))
}

export type StageState = 'done' | 'active' | 'pending'

export function stageState(index: number, current: number, finished: boolean): StageState {
  if (index < current || (finished && index === current)) return 'done'
  return index === current ? 'active' : 'pending'
}

export const isDelivered = (order: PharmacyOrder, now: number) => currentStage(order, now) >= 4

export function isDiagnosticComplete(order: DiagnosticOrder, now: number): boolean {
  return order.status === 'active' && currentStage(order, now) >= 4
}

/** The fields the Orders hub prints for any kind of order. */
export interface OrderRow {
  id: string
  kind: Order['kind']
  title: string
  sub: string
  when: string
  amount: number
  status: string
  tone: 'brand' | 'success' | 'caution' | 'neutral'
  live: boolean
  screen: 'order-tracking' | 'diagnostic-tracking' | 'lab-report'
}

export function pharmacyRow(order: PharmacyOrder, medicineName: (id: string) => string, now: number): OrderRow {
  const delivered = isDelivered(order, now)
  const names = order.lines.map((l) => (l.name ?? medicineName(l.medicineId)).replace(' Tablet', '')).join(', ')
  const count = order.lines.length
  if (order.cancelled) {
    return {
      id: order.id,
      kind: 'pharmacy',
      title: `${count} ${count === 1 ? 'medicine' : 'medicines'}`,
      sub: names,
      when: order.placed,
      amount: order.amount,
      status: order.statusLabel ?? 'Cancelled',
      tone: 'neutral',
      live: false,
      screen: 'order-tracking',
    }
  }
  return {
    id: order.id,
    kind: 'pharmacy',
    title: `${count} ${count === 1 ? 'medicine' : 'medicines'}`,
    sub: names,
    when: order.etaWhen,
    amount: order.amount,
    status: delivered ? 'Delivered' : order.statusLabel ?? PHARMACY_STAGES[currentStage(order, now)],
    tone: delivered ? 'success' : 'brand',
    live: !delivered,
    screen: 'order-tracking',
  }
}

/** Long test names read poorly in a card title; the short form replaces them. */
export const orderTestTitle = (test: { name: string; short: string }) => (test.name.length <= 24 ? test.name : test.short)

export function diagnosticRow(order: DiagnosticOrder, test: string, lab: string, now: number): OrderRow {
  const complete = isDiagnosticComplete(order, now)
  const cancelled = order.status === 'cancelled'
  const live = !complete && !cancelled
  const reportDone = complete && order.reportedWhen
  return {
    id: order.id,
    kind: 'diagnostics',
    title: test,
    sub: `${lab} · ${order.method === 'Home Collection' ? 'Home collection' : 'Lab visit'}`,
    when: reportDone ? order.reportedWhen! : `${order.date.replace(/ \d{4}$/, '')} · ${order.slotCompact}`,
    amount: order.amount,
    status: cancelled ? 'Cancelled' : complete ? 'Report ready' : order.statusLabel ?? 'Confirmed',
    tone: cancelled ? 'neutral' : complete ? 'success' : 'brand',
    live,
    screen: complete ? 'lab-report' : 'diagnostic-tracking',
  }
}
