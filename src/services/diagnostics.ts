import type { CollectionMethod, DiagnosticOrder, LabTest } from '../types'
import { searchTests, type TestQuery } from '../domain/catalogue'
import { collectionWindow, formatShortYear, type CalendarDate } from '../domain/schedule'
import { labTests } from '../mock-data/mock'
import { delay } from './latency'

export interface DiagnosticBookingRequest {
  testId: string
  labId: string
  method: CollectionMethod
  date: CalendarDate
  time: string
  address: string
  amount: number
  listed: number
}

export interface DiagnosticsService {
  searchTests(query: TestQuery): Promise<LabTest[]>
  book(request: DiagnosticBookingRequest): Promise<DiagnosticOrder>
  cancel(order: DiagnosticOrder): Promise<DiagnosticOrder>
}

export const mockDiagnosticsService: DiagnosticsService = {
  searchTests: (query) => delay(searchTests(labTests, query)),
  book: (r) => {
    const placedAt = Date.now()
    const window = collectionWindow(r.time)
    return delay({
      id: `KDC-DX-${String(placedAt).slice(-5)}`,
      kind: 'diagnostics' as const,
      placedAt,
      testId: r.testId,
      labId: r.labId,
      method: r.method,
      date: formatShortYear(r.date),
      slot: window.full,
      slotCompact: window.compact,
      address: r.address,
      technician: { name: 'Ravi Teja', id: 'PH-2281', mobile: '+91 93910 44217' },
      amount: r.amount,
      listed: r.listed,
      status: 'active' as const,
    })
  },
  cancel: (order) => delay({ ...order, status: 'cancelled' as const }),
}
