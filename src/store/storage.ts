import { createMMKV } from 'react-native-mmkv'
import { createJSONStorage, type StateStorage } from 'zustand/middleware'

const mmkv = createMMKV({ id: 'kdc-patient' })

const stateStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => {
    mmkv.remove(name)
  },
}

/** MMKV reads synchronously, so persisted stores are hydrated before first render. */
export const persistStorage = createJSONStorage(() => stateStorage)
