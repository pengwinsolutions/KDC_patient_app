/**
 * Live returns and proposed changes on medicine orders (docs/pharmacy-wave5-api.md §1–2):
 * POST/GET /patient/pharmacy/orders/:code/returns, GET /patient/pharmacy/returns, POST …/returns/:code/cancel,
 * GET /patient/pharmacy/orders/:code/changes, POST …/changes/:id/accept|reject. Photos go first to POST /files
 * (purpose return_evidence, images only). The order view doesn't embed the open proposal, so tracking asks.
 *
 * What was loaded is kept in `useAfterSales` by order code, so the screens read it like any store (and tests
 * can seed it). `deliveredAt` is remembered from the order loads (the app's order type doesn't carry it).
 */
import { create } from 'zustand'
import type { OrderChange, ReturnReason, ReturnView } from '../../domain/orderTracking'
import type { PickedFile } from '../documents'
import { api, request, upload } from './http'

interface AfterSalesState {
  returns: Record<string, ReturnView[]>
  changes: Record<string, OrderChange[]>
  mine: ReturnView[] | null
  deliveredAt: Record<string, string | null>
}

export const useAfterSales = create<AfterSalesState>(() => ({ returns: {}, changes: {}, mine: null, deliveredAt: {} }))

const enc = encodeURIComponent
const listOf = <T>(r: T[] | { rows: T[] } | null | undefined): T[] => (Array.isArray(r) ? r : (r?.rows ?? []))

/** Called with each order the app loads. */
export function rememberDelivered(orders: { code: string; deliveredAt: string | null }[]) {
  const next = { ...useAfterSales.getState().deliveredAt }
  let changed = false
  for (const o of orders)
    if (next[o.code] !== o.deliveredAt) {
      next[o.code] = o.deliveredAt
      changed = true
    }
  if (changed) useAfterSales.setState({ deliveredAt: next })
}

export async function loadOrderReturns(orderCode: string): Promise<ReturnView[]> {
  const rows = listOf(await api.get<ReturnView[] | { rows: ReturnView[] }>(`patient/pharmacy/orders/${enc(orderCode)}/returns`))
  useAfterSales.setState((s) => ({ returns: { ...s.returns, [orderCode]: rows } }))
  return rows
}

export async function loadMyReturns(): Promise<ReturnView[]> {
  const rows = listOf(await api.get<ReturnView[] | { rows: ReturnView[] }>('patient/pharmacy/returns'))
  useAfterSales.setState({ mine: rows })
  return rows
}

export interface ReturnRequest {
  reason: ReturnReason
  note?: string
  lines: { medicineCode: string; qty: number }[]
  photoFileIds?: number[]
}

/** The same `idempotencyKey` (one per return the patient is filling in) makes a retry open one return. */
export async function requestReturn(orderCode: string, body: ReturnRequest, idempotencyKey: string): Promise<ReturnView> {
  const r = await request<ReturnView>('POST', `patient/pharmacy/orders/${enc(orderCode)}/returns`, body, { headers: { 'Idempotency-Key': idempotencyKey } })
  useAfterSales.setState((s) => ({ returns: { ...s.returns, [orderCode]: [r, ...(s.returns[orderCode] ?? []).filter((x) => x.code !== r.code)] }, mine: s.mine ? [r, ...s.mine.filter((x) => x.code !== r.code)] : s.mine }))
  return r
}

const replaceReturn = (r: ReturnView) =>
  useAfterSales.setState((s) => ({
    returns: { ...s.returns, [r.orderCode]: (s.returns[r.orderCode] ?? [r]).map((x) => (x.code === r.code ? r : x)) },
    mine: s.mine ? s.mine.map((x) => (x.code === r.code ? r : x)) : s.mine,
  }))

export async function cancelReturn(code: string): Promise<ReturnView> {
  const r = await api.post<ReturnView>(`patient/pharmacy/returns/${enc(code)}/cancel`)
  replaceReturn(r)
  return r
}

/** A photo of the problem; attached when the return is requested (else the server deletes it after a day). */
export const uploadReturnPhoto = async (file: PickedFile, onProgress?: (pct: number) => void) => (await upload('return_evidence', file, onProgress)).id
export const deleteReturnPhoto = (fileId: number) => api.del(`files/${fileId}`).catch(() => undefined)

export async function loadOrderChanges(orderCode: string): Promise<OrderChange[]> {
  const rows = listOf(await api.get<OrderChange[] | { rows: OrderChange[] }>(`patient/pharmacy/orders/${enc(orderCode)}/changes`))
  useAfterSales.setState((s) => ({ changes: { ...s.changes, [orderCode]: rows } }))
  return rows
}

const replaceChange = (orderCode: string, c: OrderChange) =>
  useAfterSales.setState((s) => ({ changes: { ...s.changes, [orderCode]: (s.changes[orderCode] ?? [c]).map((x) => (x.code === c.code ? c : x)) } }))

export async function acceptChange(orderCode: string, changeCode: string): Promise<OrderChange> {
  const c = await api.post<OrderChange>(`patient/pharmacy/orders/${enc(orderCode)}/changes/${enc(changeCode)}/accept`)
  replaceChange(orderCode, c)
  return c
}

export async function rejectChange(orderCode: string, changeCode: string, body: { note?: string; cancelOrder?: boolean } = {}): Promise<OrderChange> {
  const c = await api.post<OrderChange>(`patient/pharmacy/orders/${enc(orderCode)}/changes/${enc(changeCode)}/reject`, body)
  replaceChange(orderCode, c)
  return c
}

/** A fresh key for one return being filled in. */
export const newReturnKey = () => `rt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
