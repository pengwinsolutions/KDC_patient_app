import { services } from '../services'
import { showToast } from '../store/toast'

/** Picks a profile photo from the library and reports permission or picker problems. */
export async function pickPhoto(onPicked: (uri: string) => void) {
  const result = await services.documents.pickFromGallery()
  if (result.status === 'picked' && result.file.uri) onPicked(result.file.uri)
  else if (result.status === 'denied') showToast('Allow photo access in Settings to add a picture', 'caution')
  else if (result.status === 'error') showToast(result.message, 'critical')
}
