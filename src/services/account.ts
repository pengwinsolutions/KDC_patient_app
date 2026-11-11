import type { Address, FamilyMember, HelpQuestion, HelpTopic, MedicalInfo, MembershipRecord, Plan, Profile } from '../types'
import { helpQuestions, helpTopics } from '../mock-data/mock'
import { delay } from './latency'

export type NewAddress = Omit<Address, 'id' | 'isDefault'>
export type NewFamilyMember = Omit<FamilyMember, 'id' | 'records' | 'primary' | 'age'>

export interface FamilyService {
  add(member: NewFamilyMember, age: number): Promise<FamilyMember>
  update(member: FamilyMember): Promise<FamilyMember>
  remove(id: string): Promise<void>
}

export interface AddressesService {
  add(address: NewAddress): Promise<Address>
  update(address: Address): Promise<Address>
  remove(id: string): Promise<void>
}

export interface ProfileService {
  save(profile: Profile): Promise<Profile>
  saveMedical(info: MedicalInfo): Promise<MedicalInfo>
}

export interface MembershipService {
  activate(plan: Plan, startedOn: Date): Promise<MembershipRecord>
}

export interface HelpService {
  search(text: string): Promise<{ topics: HelpTopic[]; questions: HelpQuestion[] }>
}

let serial = 0
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(serial++).toString(36)}`

export const mockFamilyService: FamilyService = {
  add: (m, age) => delay({ ...m, id: uid('f'), age, records: 0 }),
  update: (m) => delay(m),
  remove: () => delay(undefined),
}

export const mockAddressesService: AddressesService = {
  add: (a) => delay({ ...a, id: uid('ad'), isDefault: false }),
  update: (a) => delay(a),
  remove: () => delay(undefined),
}

export const mockProfileService: ProfileService = {
  save: delay,
  saveMedical: delay,
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const formatDay = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`
const DAY_MS = 86_400_000

const renewalAfter = (plan: Plan, from: Date) => new Date(from.getFullYear(), from.getMonth() + plan.months, from.getDate())

/** "12 Jan 2027", the date a plan bought on `from` renews. */
export const renewalLabel = (plan: Plan, from: Date) => formatDay(renewalAfter(plan, from))

export const mockMembershipService: MembershipService = {
  activate: (plan, startedOn) => {
    const renews = renewalAfter(plan, startedOn)
    return delay({
      status: 'active' as const,
      planId: plan.id,
      since: formatDay(startedOn),
      renews: formatDay(renews),
      daysLeft: Math.round((renews.getTime() - startedOn.getTime()) / DAY_MS),
      autoRenew: true,
      ledger: [],
    })
  },
}

export const mockHelpService: HelpService = {
  search: (text) => {
    const needle = text.trim().toLowerCase()
    const hit = (...values: string[]) => !needle || values.some((v) => v.toLowerCase().includes(needle))
    return delay({
      topics: helpTopics.filter((t) => hit(t.title, t.body)),
      questions: helpQuestions.filter((q) => hit(q.question, q.answer)),
    })
  },
}
