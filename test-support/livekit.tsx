/**
 * A stand-in for LiveKit in Jest (the real SDK needs WebRTC native modules). Tests drive it:
 * `livekit.room.emit(RoomEvent.Connected)`, set `livekit.remote` / `livekit.cameras`, and check
 * the spies. Reset between tests with `resetLiveKit()`.
 */
import React from 'react'

type Listener = (...args: unknown[]) => void

export const RoomEvent = {
  Connected: 'connected',
  Reconnecting: 'reconnecting',
  Reconnected: 'reconnected',
  Disconnected: 'disconnected',
  ConnectionQualityChanged: 'connectionQualityChanged',
} as const
export const ConnectionQuality = { Unknown: 'unknown', Poor: 'poor', Lost: 'lost', Good: 'good', Excellent: 'excellent' } as const
export const DisconnectReason = { UNKNOWN_REASON: 0, CLIENT_INITIATED: 1, SIGNAL_CLOSE: 12 } as const
export const Track = { Source: { Camera: 'camera', Microphone: 'microphone' } } as const

function makeRoom() {
  const listeners = new Map<string, Set<Listener>>()
  return {
    on: (e: string, f: Listener) => void (listeners.get(e) ?? listeners.set(e, new Set()).get(e)!).add(f),
    off: (e: string, f: Listener) => void listeners.get(e)?.delete(f),
    emit: (e: string, ...args: unknown[]) => listeners.get(e)?.forEach((f) => f(...args)),
    disconnect: jest.fn(async () => undefined),
  }
}

/* Like the real hooks, the stand-in's hooks re-render when participants or tracks change. */
const subscribers = new Set<() => void>()
let version = 0
const useLiveKitVersion = () =>
  React.useSyncExternalStore(
    (notify) => {
      subscribers.add(notify)
      return () => void subscribers.delete(notify)
    },
    () => version,
  )

/** Changes the call's participants/tracks/mute state and re-renders, as LiveKit would. Wrap in act(). */
export function updateLiveKit(change: () => void) {
  change()
  version++
  subscribers.forEach((notify) => notify())
}

export const livekit = {
  room: makeRoom(),
  local: { setMicrophoneEnabled: jest.fn(async () => undefined), setCameraEnabled: jest.fn(async () => undefined) },
  micOn: true,
  cameraOn: true,
  remote: [] as { identity: string }[],
  cameras: [] as { participant: { isLocal: boolean; identity: string }; publication: { isMuted: boolean } }[],
  roomProps: null as Record<string, unknown> | null,
}

export function resetLiveKit() {
  livekit.room = makeRoom()
  livekit.local.setMicrophoneEnabled.mockClear()
  livekit.local.setCameraEnabled.mockClear()
  livekit.micOn = true
  livekit.cameraOn = true
  livekit.remote = []
  livekit.cameras = []
  livekit.roomProps = null
  AudioSession.startAudioSession.mockClear()
  AudioSession.stopAudioSession.mockClear()
  AudioSession.selectAudioOutput.mockClear()
}

export const AudioSession = {
  startAudioSession: jest.fn(async () => undefined),
  stopAudioSession: jest.fn(async () => undefined),
  selectAudioOutput: jest.fn(async (_output: string) => undefined),
}

/** The module '@livekit/react-native' as the app uses it. */
export const reactNative = {
  registerGlobals: jest.fn(),
  AudioSession,
  LiveKitRoom: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
    livekit.roomProps = props
    return <>{children}</>
  },
  VideoTrack: (props: Record<string, unknown>) => React.createElement('VideoTrack', props),
  isTrackReference: (t: { publication?: unknown } | undefined) => Boolean(t?.publication),
  useLocalParticipant: () => {
    useLiveKitVersion()
    return { localParticipant: livekit.local, isMicrophoneEnabled: livekit.micOn, isCameraEnabled: livekit.cameraOn }
  },
  useRemoteParticipants: () => {
    useLiveKitVersion()
    return livekit.remote
  },
  useRoomContext: () => livekit.room,
  useTracks: () => {
    useLiveKitVersion()
    return livekit.cameras
  },
}

/** The module 'livekit-client' as the app uses it. */
export const client = { RoomEvent, ConnectionQuality, DisconnectReason, Track }
