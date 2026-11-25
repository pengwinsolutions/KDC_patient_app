/**
 * One person's medical record, for the medical screens. The account holder's is the profile
 * store's (kept in sync from sign-in); a family member's is loaded when first opened and cached.
 * Saving goes to the right person's record and updates whichever copy the screens read.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { services } from '../services'
import { useFamily } from '../store/family'
import { useProfile } from '../store/profile'
import type { FamilyMember, MedicalInfo } from '../types'

const key = (memberId: string) => ['medical', memberId] as const

export interface MedicalRecord {
  /** Whose record this is (the account holder when the family list isn't loaded yet). */
  member: FamilyMember | null
  isSelf: boolean
  medical: MedicalInfo | undefined
  loading: boolean
  error: unknown
  reload: () => void
  save: (info: MedicalInfo) => Promise<MedicalInfo>
}

export function useMedicalRecord(memberId?: string): MedicalRecord {
  const members = useFamily((s) => s.members)
  const self = members.find((m) => m.primary) ?? null
  const member = (memberId && members.find((m) => m.id === memberId)) || self
  const isSelf = !member || member.primary === true
  const selfMedical = useProfile((s) => s.medical)
  const client = useQueryClient()
  const other = useQuery({
    queryKey: key(member?.id ?? 'self'),
    queryFn: () => services.profile.loadMedical(member!.id),
    enabled: !isSelf,
  })

  return {
    member,
    isSelf,
    medical: isSelf ? selfMedical : other.data,
    loading: !isSelf && other.isPending,
    error: isSelf ? null : other.error,
    reload: () => void other.refetch(),
    save: async (info) => {
      const saved = await services.profile.saveMedical(info, isSelf ? undefined : member!.id)
      if (isSelf) useProfile.getState().setMedical(saved)
      else client.setQueryData(key(member!.id), saved)
      return saved
    },
  }
}
