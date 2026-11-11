import { Btn, Div, Img, P, Span } from '../components/primitives/index'
import React from 'react'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  MessageSquare,
  PhoneOff,
  FileText,
  Upload,
  UserRound,
  ShieldCheck,
  Check,
  Wifi,
  Camera,
  SignalHigh,
  Maximize2,
  Pill,
} from '../components/primitives/icons'
import { Screen, DEVICE } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/Nav'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Avatar, Card, StatusBadge, StarPicker, Divider, VerifiedMark } from '../components/ui/Display'
import { TextArea } from '../components/ui/Inputs'
import { EcgLine, Logo } from '../components/ui/Logo'
import { useNav } from '../navigation/navigation'
import { getDoctor, useCatalog } from '../store/catalog'
import { useSelectedDoctor } from '../store/booking'
import { useAppointments } from '../store/appointments'
import { useProfile } from '../store/profile'
import { useCall } from '../store/call'
import { showToast } from '../store/toast'
import { finishConsultation, submitConsultationFeedback } from '../flows/consultation'
import { useElapsed } from '../hooks/useElapsed'
import { formatDuration, formatTimer } from '../domain/schedule'

/** The appointment being attended, if the patient arrived from one. */
function useActiveAppointment() {
  const id = useCall((s) => s.appointmentId)
  return useAppointments((s) => s.items.find((a) => a.id === id))
}

function useConsultDoctor() {
  const appointment = useActiveAppointment()
  const selected = useSelectedDoctor()
  return appointment ? getDoctor(appointment.doctorId) : selected
}

const VIDEO_PREVIEW_SECONDS = 8 * 60 + 42
const AUDIO_PREVIEW_SECONDS = 6 * 60 + 18

async function endAndComplete(nav: ReturnType<typeof useNav>) {
  await finishConsultation()
  nav.navigate('consult-complete', { replace: true })
}

/* ================================================= 22 — Waiting room ====== */

export function WaitingRoomScreen() {
  const nav = useNav()
  const appointmentId: string | undefined = nav.params.id
  const appointment = useAppointments((s) => s.items.find((a) => a.id === appointmentId))
  const selected = useSelectedDoctor()
  const d = appointment ? getDoctor(appointment.doctorId) : selected
  const patient = useProfile((s) => s.profile)
  const muted = useCall((s) => s.muted)
  const cameraOff = useCall((s) => s.cameraOff)
  React.useEffect(() => {
    useCall.getState().beginWaiting(appointmentId ?? null)
  }, [appointmentId])
  const enter = () => {
    useCall.getState().enterCall()
    nav.navigate(appointment?.mode === 'audio' ? 'audio-call' : 'video-call', { replace: true })
  }
  const checks = [
    { Icon: Camera, label: 'Camera', status: 'Ready', detail: 'Front camera · 1080p', ok: true },
    { Icon: Mic, label: 'Microphone', status: 'Ready', detail: 'Input level good', ok: true },
    { Icon: Wifi, label: 'Connection', status: 'Good', detail: '42 Mbps · Wi-Fi', ok: true },
  ]

  return (
    <Screen background="bg-canvas" padBottom={false}>
      <ScreenHeader title="Waiting room" />

      <Div className="flex-1 px-5 pb-[130px] pt-4">
        {/* Self-preview */}
        <Div className="relative overflow-hidden rounded-card bg-ink-900" style={{ height: 196 }}>
          {!cameraOff && (
            <Img src={patient.photo} alt="" className="h-full w-full object-cover opacity-95" style={{ objectPosition: 'center 25%' }} />
          )}
          <Div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-ink-900/25" />
          <Div className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-chip bg-black/35 px-2.5 py-1.5 ">
            <Span className="h-[6px] w-[6px] rounded-full bg-vital-500" />
            <Span className="text-caption font-semibold text-white">Your camera preview</Span>
          </Div>
          <Div className="absolute inset-x-3 bottom-3 flex-row items-center gap-2">
            <IconButton size={38} tone={muted ? 'glassActive' : 'glass'} label="Mute" onClick={useCall.getState().toggleMute}>
              {muted ? <MicOff className="h-[16px] w-[16px]" strokeWidth={2.2} /> : <Mic className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            </IconButton>
            <IconButton size={38} tone={cameraOff ? 'glassActive' : 'glass'} label="Camera" onClick={useCall.getState().toggleCamera}>
              {cameraOff ? <VideoOff className="h-[16px] w-[16px]" strokeWidth={2.2} /> : <Video className="h-[16px] w-[16px]" strokeWidth={2.2} />}
            </IconButton>
            <Div className="ml-auto flex-row items-end gap-[3px]">
              {[7, 11, 15, 10, 6].map((h, i) => (
                <Span key={i} className="w-[3px] rounded-full bg-vital-500" style={{ height: h }} />
              ))}
            </Div>
          </Div>
        </Div>

        {/* Doctor */}
        <Card elevation="tile" className="mt-4">
          <Div className="flex-row items-center gap-3.5">
            <Div className="relative">
              <Avatar src={d.photo} name={d.name} size={54} radius={17} />
              <Span className="absolute -bottom-0.5 -right-0.5 h-[14px] w-[14px] rounded-full bg-vital-600 ring-[2.5px] ring-white" />
            </Div>
            <Div className="min-w-0 flex-1">
              <Div className="flex-row items-center gap-1">
                <P className="truncate text-title-sm text-ink-900">{d.name}</P>
                <VerifiedMark size={14} />
              </Div>
              <P className="truncate text-body-sm text-ink-500">{d.specialty}</P>
              <P className="mt-0.5 text-caption font-semibold text-vital-700">Doctor has joined</P>
            </Div>
            <Div className="shrink-0 text-right">
              <P className="text-caption text-ink-400">Scheduled</P>
              <P className="text-title-sm tabular-nums text-ink-900">{appointment?.time ?? '5:30 PM'}</P>
            </Div>
          </Div>
        </Card>

        {/* Device checks */}
        <Div className="mt-4 overflow-hidden rounded-card bg-white shadow-tile">
          {checks.map((c, i) => (
            <Div key={c.label} className={`flex-row items-center gap-3.5 px-4 py-3.5 ${i < checks.length - 1 ? 'border-b-[0.5px] border-ink-900/10' : ''}`}>
              <Span className="flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-tile bg-vital-50">
                <c.Icon className="h-[17px] w-[17px] text-vital-600" strokeWidth={2.1} />
              </Span>
              <Div className="min-w-0 flex-1">
                <P className="text-body-lg font-semibold text-ink-900">{c.label}</P>
                <P className="truncate text-caption text-ink-400">{c.detail}</P>
              </Div>
              <Span className="flex-row shrink-0 items-center gap-1.5 text-body-sm font-bold text-vital-700">
                <Check className="h-[14px] w-[14px]" strokeWidth={3} />
                {c.status}
              </Span>
            </Div>
          ))}
        </Div>

        <Div className="mt-4 flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
          <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-brand-700">
            This consultation is end-to-end encrypted. It is never recorded without your explicit consent.
          </P>
        </Div>
      </Div>

      <StickyBar>
        <Button onClick={enter} variant="success" icon={<Video className="h-[18px] w-[18px]" strokeWidth={2.2} />}>
          Enter Consultation
        </Button>
      </StickyBar>
    </Screen>
  )
}

/* ============================================ 23 — Video consultation ===== */

export function VideoCallScreen() {
  const nav = useNav()
  const d = useConsultDoctor()
  const patient = useProfile((s) => s.profile)
  const call = useCall()
  const seconds = useElapsed(call.startedAt, VIDEO_PREVIEW_SECONDS)
  return (
    <Screen background="bg-black" padTop={false} padBottom={false}>
      <Div className="relative h-full w-full">
        {/* Remote stream */}
        <Img src={d.photo} alt={d.name} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: 'center 28%' }} />
        <Div
          className="absolute inset-x-0 top-0 h-[240px]"
          style={{ background: 'linear-gradient(180deg, rgba(5,12,20,.82) 0%, rgba(5,12,20,.46) 42%, rgba(5,12,20,0) 100%)' }}
        />
        <Div
          className="absolute inset-x-0 bottom-0 h-[320px]"
          style={{ background: 'linear-gradient(0deg, rgba(5,12,20,.9) 0%, rgba(5,12,20,.62) 34%, rgba(5,12,20,0) 100%)' }}
        />

        {/* Top chrome */}
        <Div className="absolute inset-x-0 px-5" style={{ top: DEVICE.safeTop + 2 }}>
          <Div className="flex-row items-start justify-between">
            <Div className="min-w-0">
              <Div className="flex-row items-center gap-1.5">
                <P className="truncate text-title-sm text-white">{d.name}</P>
                <VerifiedMark size={15} />
              </Div>
              <P className="truncate text-body-sm text-white/78">{d.specialty}</P>
            </Div>
            <Div className="flex-row shrink-0 items-center gap-2">
              <Span className="flex-row items-center gap-1.5 rounded-chip bg-black/30 px-2.5 py-1.5 ">
                <SignalHigh className="h-[13px] w-[13px] text-vital-500" strokeWidth={2.6} />
                <Span className="text-caption font-semibold text-white">HD</Span>
              </Span>
              <Span className="flex-row items-center gap-1.5 rounded-chip bg-black/30 px-2.5 py-1.5 tabular-nums ">
                <Span className="h-[6px] w-[6px] rounded-full bg-critical-500" />
                <Span className="text-caption font-bold text-white">{formatTimer(seconds)}</Span>
              </Span>
            </Div>
          </Div>

          <Div className="mt-3 inline-flex flex-row items-center gap-1.5 rounded-chip bg-vital-600/22 px-2.5 py-1.5 ring-1 ring-inset  ring-vital-500/30 ">
            <ShieldCheck className="h-[12px] w-[12px] text-vital-400" strokeWidth={2.6} />
            <Span className="text-[10.5px] font-semibold text-vital-100">End-to-end encrypted</Span>
          </Div>
        </Div>

        {/* Self view */}
        <Div
          className="absolute right-4 overflow-hidden rounded-[18px] shadow-lift border border-white/20"
          style={{ top: DEVICE.safeTop + 86, width: 98, height: 136 }}
        >
          {call.cameraOff ? (
            <Div className="flex-col h-full w-full items-center justify-center bg-ink-900">
              <VideoOff className="h-[20px] w-[20px] text-white/60" strokeWidth={2.2} />
            </Div>
          ) : (
            <Img src={patient.photo} alt="" className="h-full w-full object-cover" style={{ objectPosition: 'center 25%' }} />
          )}
          <Div className="absolute inset-x-0 bottom-0 flex-row items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
            <Span className="text-[10px] font-semibold text-white">You</Span>
            <Maximize2 className="h-[11px] w-[11px] text-white/80" strokeWidth={2.4} />
          </Div>
        </Div>

        {/* Clinical actions — kept to three, above the call controls */}
        <Div className="absolute inset-x-0 px-5" style={{ bottom: DEVICE.safeBottom + 104 }}>
          <Div className=" grid-cols-3 gap-2">
            {[
              { Icon: FileText, label: 'Prescription', onClick: () => nav.navigate('prescription') },
              { Icon: Upload, label: 'Upload report', onClick: () => nav.navigate('rx-upload') },
              { Icon: UserRound, label: 'Patient info', onClick: () => nav.navigate('medical-info') },
            ].map((a) => (
              <Btn
                key={a.label}
                onPress={a.onClick}
                className="tap  flex-col items-center gap-1.5 rounded-tile bg-white/14 px-2 py-2.5 ring-1 ring-inset  ring-white/18 "
              >
                <a.Icon className="h-[17px] w-[17px] text-white" strokeWidth={2.1} />
                <Span className="text-[11px] font-semibold leading-none text-white">{a.label}</Span>
              </Btn>
            ))}
          </Div>
        </Div>

        {/* Call controls */}
        <Div className="absolute inset-x-0 px-5" style={{ bottom: DEVICE.safeBottom + 14 }}>
          <Div className="flex-row items-center justify-between rounded-[26px] bg-white/10 p-2.5 ring-1 ring-inset  ring-white/14 ">
            <IconButton size={52} tone={call.muted ? 'glassActive' : 'glass'} label="Mute" onClick={call.toggleMute}>
              {call.muted ? <MicOff className="h-[21px] w-[21px]" strokeWidth={2.1} /> : <Mic className="h-[21px] w-[21px]" strokeWidth={2.1} />}
            </IconButton>
            <IconButton size={52} tone={call.cameraOff ? 'glassActive' : 'glass'} label="Camera" onClick={call.toggleCamera}>
              {call.cameraOff ? <VideoOff className="h-[21px] w-[21px]" strokeWidth={2.1} /> : <Video className="h-[21px] w-[21px]" strokeWidth={2.1} />}
            </IconButton>
            <IconButton size={52} tone={call.speakerOn ? 'glassActive' : 'glass'} label="Speaker" onClick={call.toggleSpeaker}>
              <Volume2 className="h-[21px] w-[21px]" strokeWidth={2.1} />
            </IconButton>
            <IconButton size={52} tone="glass" label="Chat" onClick={() => showToast('Chat with your doctor is coming soon', 'info')}>
              <MessageSquare className="h-[20px] w-[20px]" strokeWidth={2.1} />
            </IconButton>
            <IconButton size={52} tone="danger" label="End call" onClick={() => endAndComplete(nav)}>
              <PhoneOff className="h-[21px] w-[21px]" strokeWidth={2.2} />
            </IconButton>
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

/* ============================================ 24 — Audio consultation ===== */

export function AudioCallScreen() {
  const nav = useNav()
  const d = useConsultDoctor()
  const call = useCall()
  const seconds = useElapsed(call.startedAt, AUDIO_PREVIEW_SECONDS)
  return (
    <Screen background="bg-brand-deep" padTop={false} padBottom={false}>
      <Div className="relative  h-full w-full flex-col items-center">
        {/* Ambient vitals texture */}
        <Div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Div className="absolute left-1/2 top-[22%] -translate-x-1/2 opacity-[0.07]">
            <EcgLine width={700} height={120} stroke="#FFFFFF" />
          </Div>
        </Div>

        <Div className="relative flex-row w-full items-center justify-between px-5" style={{ marginTop: DEVICE.safeTop + 4 }}>
          <Span className="flex-row items-center gap-1.5 rounded-chip bg-white/12 px-2.5 py-1.5 ring-1 ring-inset  ring-white/15">
            <ShieldCheck className="h-[12px] w-[12px] text-vital-300" strokeWidth={2.5} />
            <Span className="text-[10.5px] font-semibold text-white/90">Encrypted</Span>
          </Span>
          <Span className="rounded-[8px] bg-white px-2 py-1.5 shadow-tile">
            <Logo variant="wordmark" width={46} />
          </Span>
        </Div>

        {/* Caller */}
        <Div className="relative mt-[70px]  flex-col items-center">
          <Div className="relative flex-col items-center justify-center">
            <Span className="absolute h-[196px] w-[196px] animate-pulseRing rounded-full bg-white/14" />
            <Span className="absolute h-[196px] w-[196px] animate-pulseRing rounded-full bg-white/14 [animation-delay:1.1s]" />
            <Avatar src={d.photo} name={d.name} size={158} radius={54} className="relative shadow-lift" />
          </Div>

          <Div className="mt-7 flex-row items-center gap-1.5">
            <P className="text-title-lg text-white">{d.name}</P>
            <VerifiedMark size={17} />
          </Div>
          <P className="mt-1 text-body-lg text-white/65">{d.specialty}</P>

          <Div className="mt-6 flex-row items-center gap-2.5 rounded-chip bg-white/12 px-4 py-2.5 ring-1 ring-inset  ring-white/14">
            <Span className="h-[7px] w-[7px] rounded-full bg-vital-400" />
            <Span className="font-display text-[19px] font-bold tabular-nums tracking-[-0.2px] text-white">{formatTimer(seconds)}</Span>
          </Div>

          <Div className="mt-4 flex-row items-center gap-2 text-body-sm text-white/55">
            <SignalHigh className="h-[14px] w-[14px] text-vital-400" strokeWidth={2.4} />
            Connection stable · HD voice
          </Div>
        </Div>

        {/* Live waveform */}
        <Div className="mt-auto flex-row h-[46px] items-end justify-center gap-[3px] pb-2">
          {[8, 15, 24, 32, 20, 12, 28, 36, 22, 14, 9, 18, 30, 24, 11, 7, 16, 26, 19, 10].map((h, i) => (
            <Span key={i} className="w-[3px] rounded-full bg-white/35" style={{ height: h }} />
          ))}
        </Div>

        {/* Controls */}
        <Div className="w-full px-8" style={{ paddingBottom: DEVICE.safeBottom + 26 }}>
          <Div className="flex-row items-center justify-center gap-6">
            <ControlPill Icon={Volume2} label="Speaker" active={call.speakerOn} onClick={call.toggleSpeaker} />
            <IconButton size={70} tone="danger" label="End call" onClick={() => endAndComplete(nav)} className="shadow-lift">
              <PhoneOff className="h-[26px] w-[26px]" strokeWidth={2.2} />
            </IconButton>
            <ControlPill Icon={MicOff} label="Mute" active={call.muted} onClick={call.toggleMute} />
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

function ControlPill({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: React.ComponentType<any>
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <Div className=" flex-col items-center gap-2">
      <IconButton size={58} tone={active ? 'glassActive' : 'glass'} label={label} onClick={onClick}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.1} />
      </IconButton>
      <Span className="text-caption font-medium text-white/60">{label}</Span>
    </Div>
  )
}

/* ========================================= 25 — Consultation completed ==== */

const FEEDBACK_TAGS = ['Explained clearly', 'On time', 'Listened well', 'Would recommend']

export function ConsultCompleteScreen() {
  const nav = useNav()
  const d = useConsultDoctor()
  const prescription = useCatalog((s) => s.prescription)
  const duration = useCall((s) => s.lastDurationSeconds)
  const [rating, setRating] = React.useState(5)
  const [tags, setTags] = React.useState(FEEDBACK_TAGS.slice(0, 2))
  const [note, setNote] = React.useState('')
  const toggleTag = (tag: string) =>
    setTags((current) => (current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]))
  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className="flex-1 px-6 pb-[150px]">
        <Div className=" flex-col items-center pt-8">
          <Span className="flex-col h-[64px] w-[64px] items-center justify-center rounded-[22px] bg-vital-50">
            <Check className="h-[30px] w-[30px] text-vital-600" strokeWidth={3} />
          </Span>
          <P className="mt-5 text-center font-display text-[25px] font-extrabold leading-[30px] tracking-[-0.5px] text-ink-900">
            Consultation completed
          </P>
          <P className="mt-2 text-body text-ink-500">Duration {duration !== null ? formatDuration(duration) : '14 min 06 sec'}</P>
        </Div>

        <Card elevation="tile" className="mt-6">
          <Div className="flex-row items-center gap-3.5">
            <Avatar src={d.photo} name={d.name} size={48} radius={15} />
            <Div className="min-w-0 flex-1">
              <P className="truncate text-title-sm text-ink-900">{d.name}</P>
              <P className="truncate text-body-sm text-ink-500">{d.specialty}</P>
            </Div>
            <StatusBadge tone="success">Completed</StatusBadge>
          </Div>
          <Divider className="my-3.5" />
          <Div className="flex-row items-center gap-3">
            <Span className="flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-tile bg-brand-50">
              <FileText className="h-[17px] w-[17px] text-brand-600" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0 flex-1">
              <P className="text-body-lg font-semibold text-ink-900">Prescription issued</P>
              <P className="truncate text-caption text-ink-400">{prescription.medicines.length} medicines · follow-up in 4 weeks</P>
            </Div>
          </Div>
        </Card>

        {/* Rating */}
        <Div className="mt-7 text-center">
          <P className="text-title-md text-ink-900">How was your consultation?</P>
          <P className="mt-1.5 text-body text-ink-500">Your feedback stays anonymous to the doctor.</P>
          <Div className="mt-5">
            <StarPicker value={rating} onChange={setRating} />
          </Div>
          <Div className="mt-5 flex-row flex-wrap justify-center gap-2">
            {FEEDBACK_TAGS.map((t) => (
              <Btn
                key={t}
                onPress={() => toggleTag(t)}
                className={`rounded-chip px-3 py-2 text-body-sm font-semibold ${
                  tags.includes(t) ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-inset  ring-ink-200'
                }`}
              >
                {t}
              </Btn>
            ))}
          </Div>
          <Div className="mt-4">
            <TextArea placeholder="Add a note about your experience (optional)" value={note} onChangeText={setNote} />
          </Div>
        </Div>
      </Div>

      <StickyBar>
        <Div className="gap-2.5">
          <Button
            onClick={() => nav.navigate('prescription')}
            icon={<Pill className="h-[17px] w-[17px]" strokeWidth={2.2} />}
          >
            View Prescription
          </Button>
          <Button
            variant="tertiary"
            onClick={() => {
              submitConsultationFeedback({ rating, tags, note })
              nav.resetTo('home', 'home')
            }}
          >
            Submit Feedback
          </Button>
        </Div>
      </StickyBar>
    </Screen>
  )
}
