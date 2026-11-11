import { launchCamera, launchImageLibrary, type ImagePickerResponse } from 'react-native-image-picker'
import { delay } from './latency'

export interface PickedFile {
  name: string
  size: string
  uri?: string
  kind: 'image' | 'pdf'
}

export type PickResult =
  | { status: 'picked'; file: PickedFile }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'error'; message: string }

export interface DocumentsService {
  pickFromCamera(): Promise<PickResult>
  pickFromGallery(): Promise<PickResult>
  /** Mock document pick: no PDF picker is installed, so a sample file is attached. */
  pickPdf(): Promise<PickResult>
  upload(file: PickedFile, onProgress: (pct: number) => void): Promise<void>
}

const formatSize = (bytes?: number) => {
  if (!bytes) return '1.2 MB'
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

export function resultFromPicker(response: ImagePickerResponse): PickResult {
  if (response.didCancel) return { status: 'cancelled' }
  if (response.errorCode === 'permission') return { status: 'denied' }
  if (response.errorCode === 'camera_unavailable') {
    return { status: 'error', message: 'This device has no camera available.' }
  }
  if (response.errorCode) return { status: 'error', message: response.errorMessage ?? 'Could not open the picker.' }
  const asset = response.assets?.[0]
  if (!asset) return { status: 'cancelled' }
  return {
    status: 'picked',
    file: {
      name: asset.fileName ?? 'prescription.jpg',
      size: formatSize(asset.fileSize),
      uri: asset.uri,
      kind: 'image',
    },
  }
}

const PICK_OPTIONS = { mediaType: 'photo', quality: 0.7, selectionLimit: 1 } as const
const UPLOAD_STEP_MS = 120
const UPLOAD_STEPS = 10

export const mockDocumentsService: DocumentsService = {
  pickFromCamera: async () => resultFromPicker(await launchCamera(PICK_OPTIONS)),
  pickFromGallery: async () => resultFromPicker(await launchImageLibrary(PICK_OPTIONS)),
  pickPdf: () => delay({ status: 'picked', file: { name: 'prescription_scan.pdf', size: '840 KB', kind: 'pdf' } }),
  upload: async (_file, onProgress) => {
    for (let step = 1; step <= UPLOAD_STEPS; step++) {
      await delay(undefined, UPLOAD_STEP_MS)
      onProgress((step / UPLOAD_STEPS) * 100)
    }
  },
}
