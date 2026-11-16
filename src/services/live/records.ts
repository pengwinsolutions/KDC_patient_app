/**
 * Health records on the backend: a member's timeline, the counts on the records screen,
 * and documents the patient uploads (POST /files, then POST /patient/documents).
 */
import type { TimelineEvent } from '../../types'
import type { PickedFile } from '../documents'
import { api, qs, upload } from './http'
import { atToDay, atToTime } from './map'

interface TimelineRow {
  type: TimelineEvent['type']
  title: string
  meta: string
  at: string
  ref: string
}

export const TIMELINE_PAGE = 50

export function toEvent(r: TimelineRow): TimelineEvent {
  return { id: `${r.type}:${r.ref}`, type: r.type, title: r.title, meta: r.meta, date: atToDay(r.at), time: atToTime(r.at), ref: r.ref }
}

export async function loadTimeline(memberId: string, page = 1): Promise<{ events: TimelineEvent[]; total: number }> {
  const r = await api.get<{ rows: TimelineRow[]; total: number }>(`patient/members/${memberId}/timeline${qs({ page, limit: TIMELINE_PAGE })}`)
  return { events: r.rows.map(toEvent), total: r.total }
}

export interface RecordCounts {
  prescriptions: number
  reports: number
  consultations: number
  documents: number
}

const total = async (path: string) => (await api.get<{ total: number }>(path)).total

/** What the records screen's four tiles count, for one member. */
export async function loadRecordCounts(memberId: string): Promise<RecordCounts> {
  const [prescriptions, reports, consultations, documents] = await Promise.all([
    total(`patient/prescriptions${qs({ memberId, limit: 1 })}`),
    total(`patient/reports${qs({ memberId, limit: 1 })}`),
    total(`patient/appointments${qs({ scope: 'completed', memberId, limit: 1 })}`),
    total(`patient/documents${qs({ memberId, limit: 1 })}`),
  ])
  return { prescriptions, reports, consultations, documents }
}

export interface DocumentRow {
  id: number
  kind: 'prescription' | 'report' | 'other'
  title: string
  memberId: number | null
  memberName: string | null
  file: { id: number; name: string; mime: string; sizeBytes: number }
  createdAt: string
}

export const loadDocuments = (memberId?: string) => api.get<{ rows: DocumentRow[]; total: number }>(`patient/documents${qs({ memberId, limit: 50 })}`)

/** Uploads a picked file and files it in the patient's records. */
export async function addDocument(file: PickedFile, meta: { kind: DocumentRow['kind']; title: string; memberId?: string }, onProgress?: (pct: number) => void) {
  const f = await upload('patient_document', file, onProgress)
  return api.post<DocumentRow>('patient/documents', { fileId: f.id, kind: meta.kind, title: meta.title, memberId: meta.memberId ? Number(meta.memberId) : undefined })
}

export const deleteDocument = (id: number | string) => api.del(`patient/documents/${id}`)
