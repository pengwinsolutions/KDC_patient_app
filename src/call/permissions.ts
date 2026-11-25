import { PermissionsAndroid, Platform, type Permission } from 'react-native'

export type CallMode = 'video' | 'audio'

/**
 * Asks for what a call needs before connecting. Android asks here; iOS asks by itself the first
 * time the microphone or camera opens (the reasons are in Info.plist). Bluetooth is optional:
 * without it the call works, only Bluetooth headsets don't.
 */
export async function requestCallPermissions(mode: CallMode): Promise<'granted' | 'denied'> {
  if (Platform.OS !== 'android') return 'granted'
  const required: Permission[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
  if (mode === 'video') required.push(PermissionsAndroid.PERMISSIONS.CAMERA)
  const optional: Permission[] = Number(Platform.Version) >= 31 ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] : []
  const result = await PermissionsAndroid.requestMultiple([...required, ...optional])
  return required.every((p) => result[p] === PermissionsAndroid.RESULTS.GRANTED) ? 'granted' : 'denied'
}
