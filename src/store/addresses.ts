import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Address } from '../types'
import { addresses as seedAddresses } from '../mock-data/mock'
import { services } from '../services'
import type { NewAddress } from '../services/account'
import { persistStorage } from './storage'
import { LIVE } from '../services/config'
import { loadAddresses, makeDefaultAddress } from '../services/live/account'
import { showToast } from './toast'
import { errorMessage } from '../services/errors'

interface AddressesState {
  items: Address[]
  selectedId: string
  add: (address: NewAddress) => Promise<Address>
  update: (id: string, changes: NewAddress) => Promise<void>
  remove: (id: string) => Promise<void>
  select: (id: string) => void
  setDefault: (id: string) => void
  /** Live: replaces the list with the server's, keeping the selection when it still exists. */
  setAll: (items: Address[]) => void
  reset: () => void
}

/** Live: empty until GET /patient/addresses loads (the default first). */
const seed = LIVE ? { items: [] as Address[], selectedId: '' } : { items: seedAddresses, selectedId: seedAddresses[0].id }

export const useAddresses = create<AddressesState>()(
  persist(
    (set, get) => ({
      ...seed,
      add: async (address) => {
        const added = await services.addresses.add(address)
        set((s) => ({ items: [...s.items, added], selectedId: added.id }))
        return added
      },
      update: async (id, changes) => {
        const current = get().items.find((a) => a.id === id)
        if (!current) throw new Error(`Unknown address ${id}`)
        const updated = await services.addresses.update({ ...current, ...changes })
        set((s) => ({ items: s.items.map((a) => (a.id === id ? updated : a)) }))
      },
      remove: async (id) => {
        await services.addresses.remove(id)
        if (LIVE) {
          // The server picks the new default; reload rather than guess.
          get().setAll(await loadAddresses())
          return
        }
        set((s) => {
          const items = s.items.filter((a) => a.id !== id)
          const removedDefault = s.items.find((a) => a.id === id)?.isDefault
          const repaired = removedDefault && items[0] ? [{ ...items[0], isDefault: true }, ...items.slice(1)] : items
          return { items: repaired, selectedId: s.selectedId === id ? repaired[0]?.id ?? '' : s.selectedId }
        })
      },
      select: (selectedId) => set({ selectedId }),
      setDefault: (id) => {
        const before = get().items
        set((s) => ({ items: s.items.map((a) => ({ ...a, isDefault: a.id === id })), selectedId: id }))
        if (LIVE) {
          makeDefaultAddress(id).catch((e) => {
            set({ items: before })
            showToast(errorMessage(e, 'Could not change the default address.'), 'critical')
          })
        }
      },
      setAll: (items) =>
        set((s) => ({ items, selectedId: items.some((a) => a.id === s.selectedId) ? s.selectedId : (items.find((a) => a.isDefault) ?? items[0])?.id ?? '' })),
      reset: () => set(seed),
    }),
    { name: 'addresses', storage: persistStorage },
  ),
)

export const formatAddress = (a: Address) => `${a.line}, ${a.area}`
