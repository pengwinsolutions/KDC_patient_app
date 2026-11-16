/**
 * The account holder: GET /patient/me fills the profile store and tells the app whether
 * onboarding is done; PATCH /patient/me saves it (the first save needs consent).
 */
import type { Profile } from '../../types'
import { useProfile } from '../../store/profile'
import { useSession } from '../../store/session'
import { formatMobile, maskMobile } from '../../validation/schemas'
import { api } from './http'
import { dayToIso, isoToDay, lower, titleCase } from './map'

export interface MeView {
  patientId: number
  code: string
  selfMemberId: number | null
  name: string | null
  mobile: string
  email: string | null
  city: string | null
  dob: string | null
  age: number | null
  gender: string | null
  bloodGroup: string | null
  photoFileId: number | null
  consentGiven: boolean
  profileCompleted: boolean
  memberSince: string
}

/** The account holder's member id (their own records, bookings and timeline). */
export let selfMemberId: number | null = null

export function toProfile(me: MeView): Profile {
  const name = me.name ?? ''
  return {
    id: String(me.selfMemberId ?? ''),
    code: me.code,
    name,
    firstName: name.split(' ')[0] ?? '',
    mobile: formatMobile(me.mobile),
    mobileMasked: maskMobile(me.mobile),
    email: me.email ?? '',
    dob: isoToDay(me.dob),
    age: me.age ?? 0,
    gender: titleCase(me.gender),
    bloodGroup: me.bloodGroup ?? '',
    photo: undefined,
    city: me.city ?? '',
  }
}

function adopt(me: MeView): Profile {
  selfMemberId = me.selfMemberId
  const profile = toProfile(me)
  useProfile.getState().setProfile(profile)
  useSession.setState({ profileComplete: me.profileCompleted, mobile: me.mobile })
  return profile
}

export async function loadMe(): Promise<MeView> {
  const me = await api.get<MeView>('patient/me')
  adopt(me)
  return me
}

/** Saves the profile form. `consent` is sent on the first save (onboarding). */
export async function saveProfile(p: Pick<Profile, 'name' | 'dob' | 'gender' | 'email' | 'bloodGroup'> & { city?: string }, consent = false): Promise<Profile> {
  const body: Record<string, unknown> = {
    name: p.name.trim(),
    dob: dayToIso(p.dob),
    gender: lower(p.gender),
    bloodGroup: p.bloodGroup || null,
  }
  if (p.email.trim()) body.email = p.email.trim()
  if (p.city !== undefined && p.city.trim()) body.city = p.city.trim()
  if (consent) body.consent = true
  const me = await api.patch<MeView>('patient/me', body)
  return adopt(me)
}

export function clearMe() {
  selfMemberId = null
}
