/**
 * The refresh token, in the iOS Keychain / Android Keystore (react-native-keychain).
 * Readable after the device's first unlock, never synced or backed up to another
 * device. The short-lived access token is kept in memory only (store/session.ts).
 */
import * as Keychain from 'react-native-keychain'

const SERVICE = 'com.kdcplus.patient.session'

export async function saveRefreshToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('refresh', token, {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  })
}

export async function loadRefreshToken(): Promise<string | null> {
  try {
    const found = await Keychain.getGenericPassword({ service: SERVICE })
    return found ? found.password : null
  } catch {
    return null
  }
}

export async function clearRefreshToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE }).catch(() => undefined)
}
