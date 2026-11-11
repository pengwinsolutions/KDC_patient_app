import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UploadedDocument } from '../types'
import { services } from '../services'
import type { PickedFile } from '../services/documents'
import { useCart } from './cart'
import { persistStorage } from './storage'

interface UploadsState {
  items: UploadedDocument[]
  upload: (file: PickedFile) => Promise<void>
  remove: (id: string) => void
  reset: () => void
}

const SEED: UploadedDocument[] = [
  { id: 'up1', name: 'prescription_22sep.pdf', size: '1.2 MB', kind: 'pdf', progress: 100, status: 'done' },
]

let serial = 0

export const useUploads = create<UploadsState>()(
  persist(
    (set, get) => ({
      items: SEED,
      upload: async (file) => {
        const id = `up${Date.now().toString(36)}${serial++}`
        const patch = (changes: Partial<UploadedDocument>) =>
          set((s) => ({ items: s.items.map((d) => (d.id === id ? { ...d, ...changes } : d)) }))
        set((s) => ({ items: [...s.items, { ...file, id, progress: 0, status: 'uploading' }] }))
        try {
          await services.documents.upload(file, (progress) => {
            if (get().items.some((d) => d.id === id)) patch({ progress })
          })
          patch({ progress: 100, status: 'done' })
        } catch {
          patch({ status: 'failed' })
        }
      },
      remove: (id) => {
        set((s) => ({ items: s.items.filter((d) => d.id !== id) }))
        useCart.getState().clearPrescriptionIf(id)
      },
      reset: () => set({ items: SEED }),
    }),
    {
      name: 'uploads',
      storage: persistStorage,
      partialize: (s) => ({ items: s.items.filter((d) => d.status === 'done') }),
    },
  ),
)

export const completedUploads = (items: UploadedDocument[]) => items.filter((d) => d.status === 'done')
