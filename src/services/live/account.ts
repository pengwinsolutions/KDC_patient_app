/**
 * The account on the backend: family members, the medical record, saved addresses and
 * preferences. Implements the app's mock service interfaces so the stores work unchanged.
 */
import type { Address, FamilyMember, MedicalInfo, Profile } from '../../types'
import type { AddressesService, FamilyService, ProfileService } from '../account'
import { formatMobile, normalizeMobile } from '../../validation/schemas'
import { ServiceError } from '../errors'
import { api } from './http'
import { dayToIso, isoToDay, lower, titleCase } from './map'
import { saveProfile, selfMemberId } from './me'

/* --------------------------------------------------------------- Family */

export interface MemberView {
  id: number
  relation: string
  isSelf: boolean
  name: string
  dob: string | null
  age: number | null
  gender: string | null
  bloodGroup: string | null
  mobile: string | null
  email: string | null
  photoFileId: number | null
  records: number
}

export function toMember(m: MemberView): FamilyMember {
  return {
    id: String(m.id),
    name: m.name,
    relation: titleCase(m.relation),
    age: m.age ?? 0,
    dob: isoToDay(m.dob),
    gender: titleCase(m.gender),
    blood: m.bloodGroup ?? '',
    primary: m.isSelf || undefined,
    records: m.records ?? 0,
    mobile: m.mobile ? formatMobile(m.mobile) : undefined,
  }
}

const RELATIONS = ['spouse', 'son', 'daughter', 'mother', 'father', 'other']
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

function memberBody(m: Pick<FamilyMember, 'name' | 'relation' | 'dob' | 'gender' | 'blood' | 'mobile'>, withRelation: boolean) {
  const relation = lower(m.relation)
  const body: Record<string, unknown> = {
    name: m.name.trim(),
    dob: dayToIso(m.dob),
    gender: lower(m.gender),
    bloodGroup: BLOOD.includes(m.blood) ? m.blood : null,
    mobile: m.mobile ? normalizeMobile(m.mobile) : null,
  }
  if (withRelation) body.relation = RELATIONS.includes(relation) ? relation : 'other'
  return body
}

export const loadMembers = async () => (await api.get<MemberView[]>('patient/members')).map(toMember)

export const liveFamilyService: FamilyService = {
  add: async (m) => toMember(await api.post<MemberView>('patient/members', memberBody(m, true))),
  update: async (m) => toMember(await api.patch<MemberView>(`patient/members/${m.id}`, memberBody(m, !m.primary))),
  // 409 (with the server's message) while the member has upcoming appointments.
  remove: async (id) => {
    await api.del(`patient/members/${id}`)
  },
}

/* -------------------------------------------------------------- Medical */

export interface MedicalView {
  memberId: number
  bloodGroup: string | null
  heightCm: number | null
  weightKg: number | null
  allergies: string[]
  conditions: string[]
  medications: string[]
  surgeries: string[]
  emergencyContact: { name: string; relation: string; mobile: string } | null
}

export function toMedical(m: MedicalView): MedicalInfo {
  return {
    bloodGroup: m.bloodGroup ?? '',
    allergies: m.allergies ?? [],
    conditions: m.conditions ?? [],
    medications: m.medications ?? [],
    surgeries: m.surgeries ?? [],
    emergency: m.emergencyContact
      ? { name: m.emergencyContact.name, relation: m.emergencyContact.relation, mobile: formatMobile(m.emergencyContact.mobile) }
      : { name: '', relation: '', mobile: '' },
    height: m.heightCm ? `${m.heightCm} cm` : '',
    weight: m.weightKg ? `${m.weightKg} kg` : '',
  }
}

const measure = (v: string) => {
  const n = parseFloat(v.replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null
}

function selfId(): number {
  if (!selfMemberId) throw new ServiceError('invalid', 'Complete your profile first.')
  return selfMemberId
}

export async function loadMedical(memberId = selfId()): Promise<MedicalInfo> {
  return toMedical(await api.get<MedicalView>(`patient/members/${memberId}/medical`))
}

export async function saveMedical(info: MedicalInfo, memberId = selfId()): Promise<MedicalInfo> {
  const e = info.emergency
  const body = {
    bloodGroup: BLOOD.includes(info.bloodGroup) ? info.bloodGroup : null,
    heightCm: measure(info.height),
    weightKg: measure(info.weight),
    allergies: info.allergies,
    conditions: info.conditions,
    medications: info.medications,
    surgeries: info.surgeries,
    emergencyContact: e.name.trim() && e.mobile.trim() ? { name: e.name.trim(), relation: e.relation.trim(), mobile: normalizeMobile(e.mobile) } : null,
  }
  return toMedical(await api.put<MedicalView>(`patient/members/${memberId}/medical`, body))
}

export const liveProfileService: ProfileService = {
  save: async (p: Profile) => saveProfile(p),
  saveMedical: (info) => saveMedical(info),
}

/* ------------------------------------------------------------ Addresses */

export interface AddressView {
  id: number
  label: 'home' | 'office' | 'other'
  line: string
  area: string
  city: string | null
  pincode: string
  phone: string
  isDefault: boolean
}

/** The app shows "area – PIN" in one line (the address form splits it again). */
export const PIN_SEPARATOR = ' – '

export function toAddress(a: AddressView): Address {
  return {
    id: String(a.id),
    label: titleCase(a.label) as Address['label'],
    line: a.line,
    area: `${a.area}${a.pincode ? `${PIN_SEPARATOR}${a.pincode}` : ''}`,
    phone: formatMobile(a.phone),
    isDefault: a.isDefault,
  }
}

function addressBody(a: Omit<Address, 'id' | 'isDefault'>) {
  const [area, pincode] = a.area.split(PIN_SEPARATOR)
  return { label: lower(a.label), line: a.line.trim(), area: (area ?? '').trim(), pincode: (pincode ?? '').trim(), phone: normalizeMobile(a.phone) }
}

export const loadAddresses = async () => (await api.get<AddressView[]>('patient/addresses')).map(toAddress)

export const liveAddressesService: AddressesService = {
  add: async (a) => toAddress(await api.post<AddressView>('patient/addresses', addressBody(a))),
  update: async (a) => toAddress(await api.patch<AddressView>(`patient/addresses/${a.id}`, addressBody(a))),
  remove: async (id) => {
    await api.del(`patient/addresses/${id}`)
  },
}

export const makeDefaultAddress = (id: string) => api.post(`patient/addresses/${id}/default`, {})

/* ---------------------------------------------------------- Preferences */

export interface PreferencesView {
  language: 'English' | 'Hindi' | 'Telugu'
  security: { biometricLock: boolean }
  notifications: { appointmentReminders: boolean; prescriptionRefills: boolean; orderUpdates: boolean; offers: boolean }
}

export const loadPreferences = () => api.get<PreferencesView>('me/preferences')
export const savePreferences = (p: Partial<{ language: string; security: Partial<PreferencesView['security']>; notifications: Partial<PreferencesView['notifications']> }>) =>
  api.put<PreferencesView>('me/preferences', p)

/* ------------------------------------------------------ Account deletion */

/** Sends the confirmation code by SMS. */
export const requestDeletionCode = () => api.post<{ codeLength: number; resendAfterSeconds: number }>('patient/me/delete/code', {})

/**
 * Erases the account on the server (profile, family, records, files, sessions), then
 * forgets everything on the phone, like signing out.
 */
export async function deleteAccount(code: string, reason?: string) {
  await api.post('patient/me/delete', { code, reason })
  const { logout } = require('../../store/reset') as typeof import('../../store/reset')
  logout()
}
