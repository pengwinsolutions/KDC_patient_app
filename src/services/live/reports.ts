/**
 * Live lab reports: /patient/reports (the list, into the catalogue's labReports) and a report's
 * detail (results, pathologist, doctors' reviews, files). Report files can't be opened in the app
 * yet: that needs an authenticated file viewer.
 */
import { create } from 'zustand'
import type { PatientReport } from '../../types'
import { istParts, MONTH_NAMES } from '../../domain/schedule'
import { useCatalog } from '../../store/catalog'
import { api } from './http'
import { atToDay } from './map'

/** "October 2026", the month heading a report is listed under. */
const monthOf = (at: string) => {
  const { date } = istParts(at)
  return `${MONTH_NAMES[date.month]} ${date.year}`
}

export interface ApiReport {
  code: string
  name: string
  category: 'blood' | 'imaging' | 'other'
  status: 'processing' | 'ready'
  lab: string | null
  memberId: number | null
  collectedAt: string | null
  reportedAt: string | null
  flagged: number
  params: number
  pages: number
}

export interface ApiReportDetail extends ApiReport {
  pathologist: string | null
  summary: string | null
  nabl: string | null
  branch: string | null
  results: { name: string; value: string; unit: string | null; range: string | null; flag: 'normal' | 'borderline' | 'high' | 'low' }[]
  files: { fileId: number; kind: string; pages: number; primary: boolean }[]
  reviews: { doctor: { code: string; name: string }; note: string | null; reviewedAt: string }[]
}

export function toReport(r: ApiReport): PatientReport {
  const at = r.reportedAt ?? r.collectedAt
  return {
    id: r.code,
    name: r.name,
    kind: r.category === 'imaging' ? 'imaging' : 'blood',
    lab: r.lab ?? '',
    date: atToDay(at),
    month: at ? monthOf(at) : '',
    status: r.status,
    flagged: r.flagged,
    pages: r.pages,
  }
}

export async function loadReports(): Promise<PatientReport[]> {
  const page = await api.get<{ rows: ApiReport[] }>('patient/reports?limit=50')
  const labReports = page.rows.map(toReport)
  useCatalog.setState({ labReports })
  return labReports
}

/** Report details by code, loaded when a report opens. */
export const useReportDetails = create<{ byCode: Record<string, ApiReportDetail> }>(() => ({ byCode: {} }))

export async function loadReport(code: string): Promise<ApiReportDetail> {
  const r = await api.get<ApiReportDetail>(`patient/reports/${encodeURIComponent(code)}`)
  useReportDetails.setState((s) => ({ byCode: { ...s.byCode, [code]: r } }))
  return r
}

export function clearReportDetails() {
  useReportDetails.setState({ byCode: {} })
}
