import { createMMKV } from 'react-native-mmkv'
import { createJSONStorage, type StateStorage } from 'zustand/middleware'
import { LIVE } from '../services/config'

const mmkv = createMMKV({ id: 'kdc-patient' })
const INSTALL_ID_KEY = 'install-id'

/**
 * Live builds keep the patient's data in memory only: it is reloaded from the server on
 * every launch and nothing about their health, family, orders or payments is written to
 * the phone. Only these stores persist (the intro was seen; the last mobile number).
 */
const LIVE_PERSISTED = new Set(['session', INSTALL_ID_KEY])

const stateStorage: StateStorage = {
  getItem: (name) => (LIVE && !LIVE_PERSISTED.has(name) ? null : mmkv.getString(name) ?? null),
  setItem: (name, value) => {
    if (LIVE && !LIVE_PERSISTED.has(name)) return
    mmkv.set(name, value)
  },
  removeItem: (name) => {
    mmkv.remove(name)
  },
}

/** MMKV reads synchronously, so persisted stores are hydrated before first render. */
export const persistStorage = createJSONStorage(() => stateStorage)

/** Live, first launch after an update: forget anything a demo build left on the phone. */
export function purgeLegacyData() {
  if (!LIVE) return
  for (const key of mmkv.getAllKeys?.() ?? []) if (!LIVE_PERSISTED.has(key)) mmkv.remove(key)
}

/**
 * This app install's id: how the server tells this phone apart from the patient's others (push
 * goes to the phones they're signed in on). Random, no personal data, kept until uninstall.
 */
export function installId(): string {
  let id = mmkv.getString(INSTALL_ID_KEY)
  if (!id) {
    const rand = () => Math.random().toString(36).slice(2, 10)
    id = `p-${Date.now().toString(36)}-${rand()}${rand()}`
    mmkv.set(INSTALL_ID_KEY, id)
  }
  return id
}
