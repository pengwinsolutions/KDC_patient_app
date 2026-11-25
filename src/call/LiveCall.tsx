/**
 * The live consultation call (LiveKit). The waiting room hands over the credentials the server
 * issued; this asks for permissions, starts the audio session, connects, and shows the doctor,
 * the patient's own preview and the controls. Drops and reconnections are reported to the server.
 */
import React from 'react'
import { Linking, Platform } from 'react-native'
import {
  AudioSession,
  LiveKitRoom,
  VideoTrack,
  isTrackReference,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
} from '@livekit/react-native'
import { ConnectionQuality, DisconnectReason, RoomEvent, Track } from 'livekit-client'
import { Div, P, Span } from '../components/primitives/index'
import { Mic, MicOff, PhoneOff, ShieldCheck, SignalHigh, Video, VideoOff, Volume2, Wifi } from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { Button, IconButton } from '../components/ui/Button'
import { Avatar, VerifiedMark } from '../components/ui/Display'
import { formatTimer } from '../domain/schedule'
import { reportConnection, type MediaCredentials } from '../services/live/consultations'
import { requestCallPermissions, type CallMode } from './permissions'
import { SelfViewFrame } from './SelfViewFrame';

export interface CallPeer {
  name: string
  specialty: string
  photo?: string
}

interface LiveCallProps {
  media: MediaCredentials
  mode: CallMode
  /** The appointment code, for reporting drops to the server. */
  code: string
  doctor: CallPeer
  /** Server time the consultation started (the doctor's clock), when known. */
  startedAt: number | null
  /** The server says the consultation is over. */
  ended: boolean
  /** Leave the call (and the waiting room). */
  onLeave: () => void
  /** After the consultation ended: on to feedback. */
  onFinished: () => void
}

export function LiveCall(props: LiveCallProps) {
  const [permission, setPermission] = React.useState<'checking' | 'granted' | 'denied'>('checking')
  const [attempt, setAttempt] = React.useState(0)
  React.useEffect(() => {
    let live = true
    requestCallPermissions(props.mode).then((p) => live && setPermission(p), () => live && setPermission('denied'))
    return () => {
      live = false
    }
  }, [props.mode, attempt])

  React.useEffect(() => {
    if (permission !== 'granted') return
    void AudioSession.startAudioSession()
    return () => {
      void AudioSession.stopAudioSession()
    }
  }, [permission])

  if (permission === 'checking') return <CallMessage title="Getting your call ready…" />
  if (permission === 'denied') {
    return (
      <CallMessage
        title={props.mode === 'video' ? 'Camera and microphone are off' : 'Microphone is off'}
        body={`KDC+ needs ${props.mode === 'video' ? 'your camera and microphone' : 'your microphone'} for the consultation. Allow ${props.mode === 'video' ? 'them' : 'it'} in Settings, then try again.`}
        primary={{ label: 'Open Settings', onClick: () => void Linking.openSettings() }}
        secondary={{ label: 'Try again', onClick: () => setAttempt((n) => n + 1) }}
        onLeave={props.onLeave}
      />
    )
  }
  return (
    <LiveKitRoom
      serverUrl={props.media.url}
      token={props.media.token}
      connect={!props.ended}
      audio
      video={props.mode === 'video'}
      options={{ adaptiveStream: { pixelDensity: 'screen' }, dynacast: true }}
    >
      <CallStage {...props} />
    </LiveKitRoom>
  )
}

type Link = 'connecting' | 'connected' | 'reconnecting' | 'lost'

/** Inside the room: the picture, the state and the controls. */
function CallStage({ mode, code, doctor, startedAt, ended, onLeave, onFinished }: LiveCallProps) {
  const room = useRoomContext()
  const [link, setLink] = React.useState<Link>('connecting')
  const [quality, setQuality] = React.useState<ConnectionQuality>(ConnectionQuality.Unknown)
  const [connectedAt, setConnectedAt] = React.useState<number | null>(null)
  // A phone call is held to the ear; a video call is watched, so it's on the speaker.
  const [speaker, setSpeaker] = React.useState(mode === 'video')

  React.useEffect(() => {
    const onConnected = () => {
      setLink('connected')
      setConnectedAt((t) => t ?? Date.now())
    }
    const onReconnecting = () => setLink('reconnecting')
    const onReconnected = () => {
      setLink('connected')
      void reportConnection(code, 'reconnected').catch(() => undefined)
    }
    const onDisconnected = (reason?: DisconnectReason) => {
      if (reason === DisconnectReason.CLIENT_INITIATED) return
      setLink('lost')
      void reportConnection(code, 'dropped').catch(() => undefined)
    }
    const onQuality = (q: ConnectionQuality, p: { isLocal?: boolean }) => p.isLocal && setQuality(q)
    room.on(RoomEvent.Connected, onConnected)
    room.on(RoomEvent.Reconnecting, onReconnecting)
    room.on(RoomEvent.Reconnected, onReconnected)
    room.on(RoomEvent.Disconnected, onDisconnected)
    room.on(RoomEvent.ConnectionQualityChanged, onQuality)
    return () => {
      room.off(RoomEvent.Connected, onConnected)
      room.off(RoomEvent.Reconnecting, onReconnecting)
      room.off(RoomEvent.Reconnected, onReconnected)
      room.off(RoomEvent.Disconnected, onDisconnected)
      room.off(RoomEvent.ConnectionQualityChanged, onQuality)
    }
  }, [room, code])

  React.useEffect(() => {
    const output = Platform.OS === 'ios' ? (speaker ? 'force_speaker' : 'default') : speaker ? 'speaker' : 'earpiece'
    void AudioSession.selectAudioOutput(output).catch(() => undefined)
  }, [speaker])

  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant()
  const doctorPresent = useRemoteParticipants().length > 0
  const cameras = useTracks([Track.Source.Camera], { onlySubscribed: false })
  const remoteCamera = cameras.find((t) => !t.participant.isLocal && isTrackReference(t) && !t.publication.isMuted)
  const ownCamera = cameras.find((t) => t.participant.isLocal && isTrackReference(t) && !t.publication.isMuted)

  // LiveKitRoom owns the connection: it disconnects once when `connect` turns false (the
  // consultation ended) or when this screen unmounts (leaving). Disconnecting here as well raced
  // that teardown and left LiveKit's keep-alive timer running ("ping timeout" after the call).
  const leave = onLeave
  const finish = onFinished

  const status = ended
    ? 'The consultation has ended'
    : link === 'reconnecting' || link === 'lost'
      ? 'Reconnecting…'
      : link === 'connecting'
        ? 'Connecting…'
        : doctorPresent
          ? null
          : `Waiting for ${doctor.name} to join`
  const seconds = useCallSeconds(doctorPresent ? (startedAt ?? connectedAt) : null)
  const weak = quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost

  const controls = (
    <Div className="flex-row items-center justify-center gap-4 rounded-[26px] bg-white/10 p-2.5 ring-1 ring-inset ring-white/14">
      <IconButton size={56} tone={isMicrophoneEnabled ? 'glass' : 'glassActive'} label={isMicrophoneEnabled ? 'Mute' : 'Unmute'} onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}>
        {isMicrophoneEnabled ? <Mic className="h-[22px] w-[22px]" strokeWidth={2.1} /> : <MicOff className="h-[22px] w-[22px]" strokeWidth={2.1} />}
      </IconButton>
      {mode === 'video' && (
        <IconButton size={56} tone={isCameraEnabled ? 'glass' : 'glassActive'} label={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'} onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}>
          {isCameraEnabled ? <Video className="h-[22px] w-[22px]" strokeWidth={2.1} /> : <VideoOff className="h-[22px] w-[22px]" strokeWidth={2.1} />}
        </IconButton>
      )}
      <IconButton size={56} tone={speaker ? 'glassActive' : 'glass'} label={speaker ? 'Speaker on' : 'Speaker off'} onClick={() => setSpeaker((s) => !s)}>
        <Volume2 className="h-[22px] w-[22px]" strokeWidth={2.1} />
      </IconButton>
      <IconButton size={56} tone="danger" label="Leave call" onClick={leave}>
        <PhoneOff className="h-[22px] w-[22px]" strokeWidth={2.2} />
      </IconButton>
    </Div>
  )

  const header = (
    <Div className="absolute inset-x-0 px-5" style={{ top: DEVICE.safeTop + 2 }}>
      <Div className="flex-row items-start justify-between">
        <Div className="min-w-0 flex-1">
          <Div className="flex-row items-center gap-1.5">
            <P className="truncate text-title-sm text-white">{doctor.name}</P>
            <VerifiedMark size={15} />
          </Div>
          <P className="truncate text-body-sm text-white/78">{doctor.specialty}</P>
        </Div>
        <Div className="flex-row shrink-0 items-center gap-2">
          <Span className="flex-row items-center gap-1.5 rounded-chip bg-black/30 px-2.5 py-1.5">
            {weak ? <Wifi className="h-[13px] w-[13px] text-caution-400" strokeWidth={2.6} /> : <SignalHigh className="h-[13px] w-[13px] text-vital-500" strokeWidth={2.6} />}
            <Span className="text-caption font-semibold text-white">{weak ? 'Weak' : mode === 'video' ? 'HD' : 'HD voice'}</Span>
          </Span>
          {seconds !== null && (
            <Span className="flex-row items-center gap-1.5 rounded-chip bg-black/30 px-2.5 py-1.5 tabular-nums">
              <Span className="h-[6px] w-[6px] rounded-full bg-critical-500" />
              <Span className="text-caption font-bold text-white">{formatTimer(seconds)}</Span>
            </Span>
          )}
        </Div>
      </Div>
      <Div className="mt-3 self-start flex-row items-center gap-1.5 rounded-chip bg-vital-600/22 px-2.5 py-1.5 ring-1 ring-inset ring-vital-500/30">
        <ShieldCheck className="h-[12px] w-[12px] text-vital-400" strokeWidth={2.6} />
        <Span className="text-[10.5px] font-semibold text-vital-100">Private, encrypted call</Span>
      </Div>
    </Div>
  )

  const footer = (
    <Div className="absolute inset-x-0 px-5" style={{ bottom: DEVICE.safeBottom + 14 }}>
      {ended ? <Button onClick={finish} variant="success">Continue</Button> : controls}
    </Div>
  )

  if (mode === 'audio') {
    return (
      <Screen background="bg-brand-deep" padTop={false} padBottom={false}>
        <Div className="relative h-full w-full items-center">
          {header}
          <Div className="flex-1 items-center justify-center">
            <Avatar src={doctor.photo} name={doctor.name} size={150} radius={52} className="shadow-lift" />
            <P className="mt-6 text-title-lg text-white">{doctor.name}</P>
            <P className="mt-1.5 text-body-lg text-white/70">{status ?? 'On the call'}</P>
          </Div>
          {footer}
        </Div>
      </Screen>
    )
  }

  return (
    <Screen background="bg-black" padTop={false} padBottom={false}>
      <Div className="relative h-full w-full">
        {remoteCamera && isTrackReference(remoteCamera) && !ended ? (
          <VideoTrack trackRef={remoteCamera} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} objectFit="cover" />
        ) : (
          <Div className="absolute inset-0 items-center justify-center bg-ink-900">
            <Avatar src={doctor.photo} name={doctor.name} size={120} radius={42} />
            <P className="mt-5 px-8 text-center text-body-lg text-white/80">
              {status ?? `${doctor.name}’s camera is off`}
            </P>
          </Div>
        )}
        <Div
          className="absolute inset-x-0 top-0 h-[200px]"
          style={{ experimental_backgroundImage: 'linear-gradient(180deg, rgba(5,12,20,.8) 0%, rgba(5,12,20,0) 100%)' } as never}
        />
        {header}

        {/* Your own preview */}
        <SelfViewFrame width={104} height={146} style={{ right: 16, top: DEVICE.safeTop + 92 }}>
          {(size) =>
            ownCamera && isTrackReference(ownCamera) ? (
              <VideoTrack trackRef={ownCamera} style={size} objectFit="cover" mirror zOrder={1} />
            ) : (
              <Div className="h-full w-full items-center justify-center">
                <VideoOff className="h-[20px] w-[20px] text-white/60" strokeWidth={2.2} />
              </Div>
            )
          }
        </SelfViewFrame>

        {status && remoteCamera && (
          <Div className="absolute inset-x-0 items-center" style={{ bottom: DEVICE.safeBottom + 104 }}>
            <Span className="rounded-chip bg-black/55 px-3 py-1.5 text-body-sm font-semibold text-white">{status}</Span>
          </Div>
        )}
        {footer}
      </Div>
    </Screen>
  )
}

/** Seconds on the call, from `since`; null until the doctor is on the call. */
function useCallSeconds(since: number | null) {
  const [now, setNow] = React.useState(Date.now())
  React.useEffect(() => {
    if (since === null) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [since])
  return since === null ? null : Math.max(0, Math.floor((now - since) / 1000))
}

/** A full-screen message in the call's colours (permissions, getting ready). */
function CallMessage({
  title,
  body,
  primary,
  secondary,
  onLeave,
}: {
  title: string
  body?: string
  primary?: { label: string; onClick: () => void }
  secondary?: { label: string; onClick: () => void }
  onLeave?: () => void
}) {
  return (
    <Screen background="bg-ink-900" padTop={false} padBottom={false}>
      <Div className="h-full w-full items-center justify-center px-8">
        <P className="text-center text-title-md text-white">{title}</P>
        {body && <P className="mt-3 text-center text-body-lg leading-[24px] text-white/70">{body}</P>}
        <Div className="mt-8 w-full gap-3">
          {primary && <Button onClick={primary.onClick}>{primary.label}</Button>}
          {secondary && (
            <Button variant="tertiary" onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
          {onLeave && (
            <Button variant="tertiary" onClick={onLeave}>
              Leave
            </Button>
          )}
        </Div>
      </Div>
    </Screen>
  )
}
