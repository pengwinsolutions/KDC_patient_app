/**
 * Live sync for the account: family, the medical record, addresses, the health timeline
 * and record counts, notifications and preferences. Loaded after sign-in and on every
 * launch; cleared on sign-out.
 */
import { useAddresses } from '../../store/addresses'
import { useFamily } from '../../store/family'
import { useNotifications } from '../../store/notifications'
import { NO_MEDICAL, useProfile } from '../../store/profile'
import { useRecords } from '../../store/records'
import { LANGUAGES, useSettings, type Language } from '../../store/settings'
import { loadAddresses, loadMedical, loadMembers, loadPreferences } from './account'
import { selfMemberId } from './me'
import { loadNotifications } from './notifications'
import { loadRecordCounts, loadTimeline } from './records'
import { registerDomain } from './sync'

const self = () => (selfMemberId ? String(selfMemberId) : '')

/** The records screen's counts for one member (any member, on demand). */
export async function refreshCounts(memberId: string) {
  useRecords.getState().setCounts(memberId, await loadRecordCounts(memberId))
}

registerDomain({
  name: 'family',
  load: async () => useFamily.getState().setAll(await loadMembers()),
  clear: () => useFamily.getState().reset(),
})

registerDomain({
  name: 'medical',
  load: async () => {
    if (!self()) return
    useProfile.getState().setMedical(await loadMedical())
  },
  clear: () => useProfile.getState().setMedical(NO_MEDICAL),
})

registerDomain({
  name: 'addresses',
  load: async () => useAddresses.getState().setAll(await loadAddresses()),
  clear: () => useAddresses.getState().reset(),
})

registerDomain({
  name: 'records',
  load: async () => {
    const id = self()
    if (!id) return
    const [{ events, total }] = await Promise.all([loadTimeline(id), refreshCounts(id)])
    useRecords.getState().setTimeline(id, events, total)
  },
  clear: () => useRecords.getState().reset(),
})

registerDomain({
  name: 'notifications',
  load: async () => useNotifications.getState().setAll(await loadNotifications()),
  clear: () => useNotifications.getState().reset(),
})

registerDomain({
  name: 'settings',
  load: async () => {
    const p = await loadPreferences()
    const language = (LANGUAGES.some((l) => l.label === p.language) ? p.language : 'English') as Language
    useSettings.getState().setAll({
      language,
      toggles: { ...p.notifications, faceIdLock: p.security.biometricLock },
    })
  },
  clear: () => useSettings.getState().reset(),
})
