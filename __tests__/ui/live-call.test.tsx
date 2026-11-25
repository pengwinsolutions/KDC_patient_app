/**
 * The live consultation call (LiveKit), on the controllable stand-in in test-support/livekit.tsx:
 * connecting, waiting for the doctor, the controls, drops and reconnections, permissions, the end.
 */
import React from 'react'
import { Linking, PermissionsAndroid, Platform } from 'react-native'
import { act } from 'react-test-renderer'
import { cleanup, press, render, textOf } from '../../test-utils/harness'
import { livekit, resetLiveKit, AudioSession, DisconnectReason, RoomEvent } from '../../test-support/livekit'
import { LiveCall } from '../../src/call/LiveCall'

const mockReportConnection = jest.fn(async (_code: string, _event: string) => undefined)
jest.mock('../../src/services/live/consultations', () => ({ reportConnection: (code: string, event: string) => mockReportConnection(code, event) }))

const media = { provider: 'livekit', url: 'wss://rtc.kdcplus.test', roomId: 'KDC-CN-ABCD2345', token: 'join-token', expiresAt: '2026-11-23T12:00:00Z' }
const doctor = { name: 'Dr. Arjun Mehta', specialty: 'Cardiologist' }

beforeEach(() => {
  resetLiveKit()
  mockReportConnection.mockClear()
})
afterEach(async () => {
  jest.restoreAllMocks()
  await cleanup()
})

async function call(props: Partial<React.ComponentProps<typeof LiveCall>> = {}) {
  const handlers = { onLeave: jest.fn(), onFinished: jest.fn() }
  const r = await render(<LiveCall media={media} mode="video" code="KDC-AP-1" doctor={doctor} startedAt={null} ended={false} {...handlers} {...props} />)
  return { r, ...handlers }
}
const emit = async (event: string, ...args: unknown[]) => act(async () => livekit.room.emit(event, ...args))
const videoTracks = (r: Awaited<ReturnType<typeof render>>) => r.root.findAll((n) => (n.type as unknown) === 'VideoTrack')

test('video: connects with the server’s credentials and waits for the doctor, showing the patient’s own preview', async () => {
  livekit.cameras = [{ participant: { isLocal: true, identity: 'patient-7' }, publication: { isMuted: false } }]
  const { r } = await call()
  expect(livekit.roomProps).toMatchObject({ serverUrl: 'wss://rtc.kdcplus.test', token: 'join-token', connect: true, audio: true, video: true })
  expect(AudioSession.startAudioSession).toHaveBeenCalled()
  expect(textOf(r.root)).toContain('Connecting…')
  await emit(RoomEvent.Connected)
  expect(textOf(r.root)).toContain('Waiting for Dr. Arjun Mehta to join')
  expect(videoTracks(r).map((v) => v.props.mirror)).toEqual([true])
})

test('the doctor’s video fills the screen once they join, and the call clock starts', async () => {
  livekit.remote = [{ identity: 'doctor-3' }]
  livekit.cameras = [
    { participant: { isLocal: false, identity: 'doctor-3' }, publication: { isMuted: false } },
    { participant: { isLocal: true, identity: 'patient-7' }, publication: { isMuted: false } },
  ]
  const { r } = await call({ startedAt: Date.now() - 65_000 })
  await emit(RoomEvent.Connected)
  expect(videoTracks(r).map((v) => v.props.objectFit)).toEqual(['cover', 'cover'])
  expect(textOf(r.root)).not.toContain('Waiting for')
  expect(textOf(r.root)).toMatch(/01:0[56]/)
})

test('mute, camera and speaker drive the room and the audio route', async () => {
  const { r } = await call()
  await emit(RoomEvent.Connected)
  expect(AudioSession.selectAudioOutput).toHaveBeenLastCalledWith(Platform.OS === 'ios' ? 'force_speaker' : 'speaker')
  await press(r.root, 'Mute')
  expect(livekit.local.setMicrophoneEnabled).toHaveBeenCalledWith(false)
  await press(r.root, 'Turn camera off')
  expect(livekit.local.setCameraEnabled).toHaveBeenCalledWith(false)
  await press(r.root, 'Speaker on')
  expect(AudioSession.selectAudioOutput).toHaveBeenLastCalledWith(Platform.OS === 'ios' ? 'default' : 'earpiece')
})

test('audio: no camera at all, and the sound starts at the earpiece like a phone call', async () => {
  const { r } = await call({ mode: 'audio' })
  await emit(RoomEvent.Connected)
  expect(livekit.roomProps).toMatchObject({ video: false })
  await expect(press(r.root, 'Turn camera off')).rejects.toThrow(/No pressable/)
  expect(AudioSession.selectAudioOutput).toHaveBeenLastCalledWith(Platform.OS === 'ios' ? 'default' : 'earpiece')
})

test('a dropped call is reported, shown as reconnecting, and reported again when it comes back', async () => {
  const { r } = await call()
  await emit(RoomEvent.Connected)
  await emit(RoomEvent.Disconnected, DisconnectReason.SIGNAL_CLOSE)
  expect(mockReportConnection).toHaveBeenLastCalledWith('KDC-AP-1', 'dropped')
  expect(textOf(r.root)).toContain('Reconnecting…')
  await emit(RoomEvent.Reconnected)
  expect(mockReportConnection).toHaveBeenLastCalledWith('KDC-AP-1', 'reconnected')
  // Leaving on purpose isn't a drop.
  mockReportConnection.mockClear()
  await emit(RoomEvent.Disconnected, DisconnectReason.CLIENT_INITIATED)
  expect(mockReportConnection).not.toHaveBeenCalled()
})

test('the room is closed only by LiveKitRoom: leaving navigates away, an ended consultation turns connect off', async () => {
  const left = await call()
  await emit(RoomEvent.Connected)
  await press(left.r.root, 'Leave call')
  expect(left.onLeave).toHaveBeenCalled()
  // No second, competing disconnect (it left LiveKit's keep-alive running after the call).
  expect(livekit.room.disconnect).not.toHaveBeenCalled()
  await cleanup()

  const done = await call({ ended: true })
  expect(livekit.roomProps).toMatchObject({ connect: false })
  await press(done.r.root, 'Continue')
  expect(done.onFinished).toHaveBeenCalled()
  expect(livekit.room.disconnect).not.toHaveBeenCalled()
})

test('Android: without camera and microphone permission it explains and offers Settings, and never connects', async () => {
  jest.replaceProperty(Platform, 'OS', 'android')
  jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
    'android.permission.RECORD_AUDIO': 'denied',
    'android.permission.CAMERA': 'never_ask_again',
  } as never)
  const { r } = await call()
  expect(textOf(r.root)).toContain('Camera and microphone are off')
  expect(livekit.roomProps).toBeNull()
  const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
  await press(r.root, 'Open Settings')
  expect(settings).toHaveBeenCalled()
})
