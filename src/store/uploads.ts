import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UploadedDocument } from '../types'
import { services } from '../services'
import type { PickedFile } from '../services/documents'
import { LIVE } from '../services/config'
import { useCart } from './cart'
import { persistStorage } from './storage'

interface UploadsState {
  items: UploadedDocument[]
  upload: (file: PickedFile) => Promise<void>
  remove: (id: string) => void
  reset: () => void
}

/** Live: none (prescriptions uploaded for an order belong to that order on the server). */
const SEED: UploadedDocument[] = LIVE
  ? []
  : [{ id: 'up1', name: 'prescription_22sep.pdf', size: '1.2 MB', kind: 'pdf', progress: 100, status: 'done' }]

/** Live: the prescription goes to the server (POST /files, purpose prescription_upload), which checks its type and size. */
async function liveUpload(file: PickedFile, onProgress: (pct: number) => void): Promise<number> {
  const { upload } = require('../services/live/http') as typeof import('../services/live/http')
  return (await upload('prescription_upload', file, onProgress)).id
}

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
          const onProgress = (progress: number) => {
            if (get().items.some((d) => d.id === id)) patch({ progress })
          }
          if (LIVE) {
            const fileId = await liveUpload(file, onProgress)
            patch({ progress: 100, status: 'done', fileId })
            return
          }
          await services.documents.upload(file, onProgress)
          patch({ progress: 100, status: 'done' })
        } catch {
          patch({ status: 'failed' })
        }
      },
      remove: (id) => {
        const fileId = get().items.find((d) => d.id === id)?.fileId
        if (LIVE && fileId) {
          // Not attached to an order yet: delete it from the server too (409 once it's in use; then it stays with that order).
          const { api } = require('../services/live/http') as typeof import('../services/live/http')
          void api.del(`files/${fileId}`).catch(() => undefined)
        }
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
