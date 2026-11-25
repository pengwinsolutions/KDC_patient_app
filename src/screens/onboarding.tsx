import { Btn, Div, Img, P, Span, TextField } from '../components/primitives/index'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Video,
  Phone,
  Building2,
  Lock,
  ShieldCheck,
  EyeOff,
  ChevronRight,
  Camera,
  Check,
  UserPlus,
} from '../components/primitives/icons'
import { Screen, DEVICE, solidBarInset } from '../components/ui/Screen'
import { Logo, EcgLine } from '../components/ui/Logo'
import { Button, IconButton, StickyBar } from '../components/ui/Button'
import { Field, OtpInput, Checkbox } from '../components/ui/Inputs'
import { BLOOD_GROUPS, ChoiceChips, FormDate, FormInput, FormSelect } from '../components/forms/Fields'
import { ProgressDots, StepBar, Avatar } from '../components/ui/Display'
import { SCENE } from '../mock-data/media'
import { devLaunch, useNav } from '../navigation/navigation'
import { services } from '../services'
import { InvalidOtpError } from '../services/auth'
import { LIVE } from '../services/config'
import { errorMessage, ServiceError } from '../services/errors'
import { OFFLINE, restoreSession } from '../services/live/http'
import { loadMe, saveProfile } from '../services/live/me'
import { syncAll } from '../services/live/sync'
import {
  formatMobile,
  loginSchema,
  maskMobile,
  normalizeMobile,
  otpSchema,
  profileSchema,
  type LoginForm,
  type OtpForm,
  type ProfileForm,
} from '../validation/schemas'
import { LANGUAGES, useSettings } from '../store/settings'
import { useSession } from '../store/session'
import { ageFromDob, useProfile } from '../store/profile'
import { useCountdown } from '../hooks/useCountdown'
import { showToast } from '../store/toast'
import { pickPhoto } from '../flows/photo'

/* ===================================================== 01 — Splash ======== */

const SPLASH_MS = 2400

/**
 * Live: where a signed-in patient lands. Everything is loaded from the server first;
 * a patient who hasn't finished onboarding completes their profile.
 */
export async function enterApp(nav: ReturnType<typeof useNav>) {
  const me = await loadMe()
  if (!me.profileCompleted) {
    nav.resetTo('profile-setup')
    return
  }
  await syncAll()
  nav.resetTo('home', 'home')
}

const LIVE_SPLASH_MS = 900

export function SplashScreen() {
  const nav = useNav()
  const [offline, setOffline] = React.useState(false)
  const advance = React.useCallback(() => {
    nav.navigate(useSession.getState().onboarded ? 'login' : 'onboarding-1', { replace: true })
  }, [nav])
  const restore = React.useCallback(async () => {
    setOffline(false)
    const [state] = await Promise.all([restoreSession(), new Promise<void>((r) => setTimeout(r, LIVE_SPLASH_MS))])
    if (state === 'signed-out') return advance()
    if (state === 'offline') return setOffline(true)
    try {
      await enterApp(nav)
    } catch (e) {
      if (!(e instanceof ServiceError && e.code === 'session_ended')) setOffline(true)
    }
  }, [advance, nav])
  React.useEffect(() => {
    if (devLaunch.active) return
    if (LIVE) {
      void restore()
      return
    }
    const timer = setTimeout(advance, SPLASH_MS)
    return () => clearTimeout(timer)
  }, [advance, restore])
  return (
    <Screen background="bg-white" padTop={false} padBottom={false}>
      <Btn
        onPress={LIVE ? undefined : advance}
        className="relative  h-full w-full flex-col items-center justify-center bg-clinical"
      >
        {/* Faint concentric vitals rings — brand texture, not decoration */}
        <Div className="pointer-events-none absolute inset-0 flex-col items-center justify-center">
          {[300, 430, 560].map((s, i) => (
            <Span
              key={s}
              className="absolute rounded-full border border-brand-600/[0.07]"
              style={{ width: s, height: s, animationDelay: `${i * 0.9}s` }}
            />
          ))}
        </Div>

        <Div className="relative  flex-col items-center">
          <Logo variant="wordmark" width={218} className="animate-riseIn" />
          <Div className="mt-2 h-[26px]">
            <EcgLine animate width={268} height={26} stroke="#0068C8" />
          </Div>
          <P
            className="mt-1 animate-riseIn font-display text-[17px] font-semibold tracking-[-0.2px] text-vital-600"
            style={{ animationDelay: '.35s' }}
          >
            Your health in your hands
          </P>
        </Div>

        {offline && (
          <Div className="mt-8 flex-col items-center gap-3 px-8">
            <P className="text-center text-body-sm text-ink-500">{OFFLINE}</P>
            <Button variant="secondary" onClick={() => void restore()}>Try again</Button>
          </Div>
        )}

        <Div className="absolute inset-x-0  flex-col items-center gap-3" style={{ bottom: DEVICE.safeBottom + 28 }}>
          <Span className="flex-row items-center gap-1.5 text-caption font-medium text-ink-400">
            <ShieldCheck className="h-[13px] w-[13px] text-vital-600" strokeWidth={2.3} />
            Secure healthcare platform
          </Span>
          <P className="text-micro font-medium uppercase tracking-[.12em] text-ink-300">KDC Healthcare · India</P>
        </Div>
      </Btn>
    </Screen>
  )
}

/* ============================================== 02–04 — Onboarding ======== */

function OnboardingLayout({
  index,
  image,
  eyebrow,
  headline,
  body,
  children,
  next,
  cta = 'Next',
}: {
  index: number
  image: string
  eyebrow: string
  headline: React.ReactNode
  body: string
  children?: React.ReactNode
  next: string
  cta?: string
}) {
  const nav = useNav()
  const finish = () => {
    useSession.getState().markOnboarded()
    nav.navigate('login')
  }
  return (
    <Screen background="bg-white" padTop={false} padBottom={false}>
      <Div className="relative h-full w-full">
        {/* Imagery — fixed 1:1.08 crop shared by every onboarding screen */}
        <Div className="absolute inset-x-0 top-0 h-[404px] overflow-hidden">
          <Img src={image} alt="" className="h-full w-full object-cover" />
          <Div className="absolute inset-0 bg-gradient-to-b from-ink-900/25 via-transparent to-white" />
          <Div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-b from-transparent to-white" />
        </Div>

        <Div className="absolute inset-x-0 flex-row items-center justify-end px-5" style={{ top: DEVICE.safeTop + 4 }}>
          <Btn
            onPress={finish}
            className="tap rounded-full bg-white/85 px-3.5 py-[7px] text-body-sm font-semibold text-ink-700 "
          >
            Skip
          </Btn>
        </Div>

        {/* Content sheet */}
        <Div className="absolute inset-x-0 bottom-0  flex-col px-6" style={{ top: 356, paddingBottom: DEVICE.safeBottom + 16 }}>
          <P className="text-micro font-bold uppercase tracking-[.14em] text-brand-600">{eyebrow}</P>
          <P className="mt-2.5  font-display text-[29px] font-extrabold leading-[34px] tracking-[-0.7px] text-ink-900">
            {headline}
          </P>
          <P className="mt-3 text-body-lg leading-[23px] text-ink-500">{body}</P>

          <Div className="mt-5 flex-1">{children}</Div>

          <Div className="flex-row items-center justify-between pt-5">
            <ProgressDots total={2} index={index} />
            <Button
              block={false}
              onClick={() => (next === 'login' ? finish() : nav.navigate(next))}
              className="px-7"
              iconRight={<ChevronRight className="h-[18px] w-[18px]" />}
            >
              {cta}
            </Button>
          </Div>
        </Div>
      </Div>
    </Screen>
  )
}

export function Onboarding1() {
  return (
    <OnboardingLayout
      index={0}
      image={SCENE.telehealth}
      eyebrow="Care without the wait"
      headline="Healthcare, whenever you need it."
      body="Connect with trusted doctors through convenient digital consultations — from home, from work, from anywhere."
      next="onboarding-2"
    >
      <Div className="flex-row items-center gap-4 rounded-tile bg-ink-50 px-4 py-3.5">
        <Div className="flex-row">
          {['A', 'P', 'K'].map((c, i) => (
            <Span
              key={c}
              className="flex-col h-[30px] w-[30px] items-center justify-center rounded-full bg-brand-600 text-caption font-bold text-white ring-2 ring-white"
              style={{ zIndex: 3 - i, opacity: 1 - i * 0.12, marginLeft: i ? -10 : 0 }}
            >
              {c}
            </Span>
          ))}
        </Div>
        <P className="text-body-sm leading-[18px] text-ink-600">
          <Span className="font-bold text-ink-900">540+ verified specialists</Span> across 24 departments
        </P>
      </Div>
    </OnboardingLayout>
  )
}

export function Onboarding2() {
  const modes = [
    { Icon: Video, label: 'Video consultation', sub: 'See your doctor face to face' },
    { Icon: Phone, label: 'Audio consultation', sub: 'A private call, even on low data' },
    { Icon: Building2, label: 'In-person consultation', sub: 'Book a visit at the clinic' },
  ]
  return (
    <OnboardingLayout
      index={1}
      image={SCENE.clinician}
      eyebrow="Three ways to consult"
      headline="Talk to the right doctor"
      body="Choose the format that suits the problem — and the day."
      next="login"
      cta="Get Started"
    >
      <Div className="gap-2">
        {modes.map((m) => (
          <Div key={m.label} className="flex-row items-center gap-3.5 rounded-tile bg-ink-50 px-3.5 py-3">
            <Span className="flex-col h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px] bg-white text-brand-600 shadow-tile">
              <m.Icon className="h-[17px] w-[17px]" strokeWidth={2.1} />
            </Span>
            <Div className="min-w-0">
              <P className="text-body-lg font-semibold text-ink-900">{m.label}</P>
              <P className="truncate text-caption text-ink-500">{m.sub}</P>
            </Div>
          </Div>
        ))}
      </Div>
    </OnboardingLayout>
  )
}

/* ======================================================= 06 — Login ======= */

export function LoginScreen() {
  const nav = useNav()
  const language = useSettings((s) => s.language)
  const setLanguage = useSettings((s) => s.setLanguage)
  const { control, handleSubmit, watch, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: LIVE ? '' : '98490 42187' },
  })
  const valid = normalizeMobile(watch('mobile')).length === 10
  const submit = handleSubmit(async ({ mobile }) => {
    const normalized = normalizeMobile(mobile)
    try {
      await services.auth.requestOtp(normalized)
    } catch (e) {
      showToast(errorMessage(e, 'We could not send the code. Please try again.'), 'critical')
      return
    }
    useSession.getState().setPendingMobile(normalized)
    nav.navigate('otp')
  })
  const assurances = [
    { Icon: Lock, label: 'Encrypted' },
    { Icon: EyeOff, label: 'Never shared' },
    { Icon: ShieldCheck, label: 'No spam' },
  ]

  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className=" flex-1 flex-col px-6">
        {/* Brand kept quiet — the number field is the subject of this screen */}
        <Div className="flex-row items-center justify-between pt-5">
          <Logo variant="wordmark" width={78} />
          <Btn
            onPress={() => nav.navigate('help')}
            className="tap text-body-sm font-semibold text-brand-600"
          >
            Need help?
          </Btn>
        </Div>

        <StepBar step={1} total={3} className="mt-7" />

        <P className="mt-5 font-display text-[30px] font-extrabold leading-[35px] tracking-[-0.7px] text-ink-900">
          Welcome to KDC+
        </P>
        <P className="mt-2.5 text-body-lg leading-[23px] text-ink-500">
          Sign in with your mobile number. We’ll text you a 6-digit code to verify it’s you.
        </P>

        {/* Entry */}
        <Div className="mt-8">
          <P className="block text-body-sm font-semibold text-ink-600">Mobile number</P>
          <Field error={formState.errors.mobile?.message}>
          <Div className="mt-2 flex-row h-[58px] items-center rounded-ctl bg-white px-4 ring-[1.5px] ring-inset  ring-brand-600">
            <Btn
              onPress={() => showToast('KDC+ is available in India only', 'info')}
              className="tap mr-3 flex-row shrink-0 items-center gap-1.5 border-r border-ink-200 pr-3"
            >
              <Span className="font-display text-[17px] font-bold text-ink-900">+91</Span>
              <ChevronRight className="h-[14px] w-[14px] rotate-90 text-ink-400" strokeWidth={2.4} />
            </Btn>
            <Controller
              control={control}
              name="mobile"
              render={({ field }) => (
                <TextField
                  inputMode="numeric"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="00000 00000"
                  maxLength={11}
                  className="h-full min-w-0 flex-1 bg-transparent font-display text-[19px] font-bold tracking-[0.5px] text-ink-900  placeholder:font-sans placeholder:text-[17px] placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-300"
                />
              )}
            />
            {valid && (
              <Span className="flex-col h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-vital-600">
                <Check className="h-[13px] w-[13px] text-white" strokeWidth={3.4} />
              </Span>
            )}
          </Div>
          </Field>

          <Button className="mt-4" loading={formState.isSubmitting} onClick={submit}>
            Continue
          </Button>
        </Div>

        {/* Answers the question a screen with no sign-up link always raises */}
        <Div className="mt-6 flex-row items-start gap-3 rounded-tile bg-ink-50 p-3.5">
          <UserPlus className="mt-[1px] h-[16px] w-[16px] shrink-0 text-ink-500" strokeWidth={2.1} />
          <P className="text-body-sm leading-[19px] text-ink-600">
            <Span className="font-semibold text-ink-900">New to KDC+?</Span> Your account is created automatically once
            your number is verified — there is nothing else to fill in.
          </P>
        </Div>

        {/* Language belongs at sign-in in this market, not buried in settings */}
        <Div className="mt-6">
          <P className="mb-2 text-body-sm font-semibold text-ink-600">App language</P>
          <Div className="flex-row gap-2">
            {LANGUAGES.map((l) => {
              const on = l.label === language
              return (
                <Btn
                  key={l.label}
                  onPress={() => setLanguage(l.label)}
                  className={`tap flex-1 rounded-ctl py-2.5  ${
                    on ? 'bg-brand-600 shadow-cta' : 'bg-white ring-1 ring-inset  ring-ink-200'
                  }`}
                >
                  <Span className={`block text-[15px] font-bold leading-none ${on ? 'text-white' : 'text-ink-800'}`}>
                    {l.native}
                  </Span>
                  <Span className={`mt-1 block text-[10.5px] leading-none ${on ? 'text-white/70' : 'text-ink-400'}`}>
                    {l.label}
                  </Span>
                </Btn>
              )
            })}
          </Div>
        </Div>

        {/* What the number is actually used for */}
        <Div className="mt-auto pb-4 pt-8" style={{ paddingBottom: 16 + solidBarInset() }}>
          <Div className="flex-row items-center justify-center gap-5">
            {assurances.map((a) => (
              <Span key={a.label} className="flex-row items-center gap-1.5 text-caption font-medium text-ink-500">
                <a.Icon className="h-[13px] w-[13px] text-vital-600" strokeWidth={2.3} />
                {a.label}
              </Span>
            ))}
          </Div>
          <P className="mt-4 px-2 text-center text-caption leading-[17px] text-ink-400">
            Your number is used only to verify you and to send appointment updates. By continuing you agree to our{' '}
            <Span className="font-semibold text-ink-600">Terms</Span> and{' '}
            <Span className="font-semibold text-ink-600">Privacy Policy</Span>.
          </P>
        </Div>
      </Div>
    </Screen>
  )
}

/* ========================================================= 07 — OTP ======= */

const OTP_RESEND_SECONDS = 24

export function OtpScreen() {
  const nav = useNav()
  const pendingMobile = useSession((s) => s.pendingMobile)
  const { remaining, restart } = useCountdown(OTP_RESEND_SECONDS)
  const [rejected, setRejected] = React.useState<string | null>(null)
  const { control, handleSubmit, setValue, formState, clearErrors } = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: LIVE ? '' : '4821' },
  })
  const error = rejected ?? formState.errors.code?.message

  const verify = handleSubmit(async ({ code }) => {
    setRejected(null)
    try {
      const { token, mobile } = await services.auth.verifyOtp(pendingMobile ?? (LIVE ? '' : '9849042187'), code)
      const session = useSession.getState()
      session.signIn(token, mobile)
      if (LIVE) {
        await enterApp(nav)
        return
      }
      const { profile, setProfile } = useProfile.getState()
      setProfile({ ...profile, mobile: formatMobile(mobile), mobileMasked: maskMobile(mobile) })
      if (session.profileComplete) nav.resetTo('home', 'home')
      else nav.navigate('profile-setup', { replace: true })
    } catch (e) {
      setRejected(
        e instanceof InvalidOtpError || e instanceof ServiceError ? e.message : 'We could not verify the code. Please try again.',
      )
    }
  })

  const resend = async () => {
    setRejected(null)
    clearErrors()
    setValue('code', '')
    try {
      const { resendAfterSeconds } = await services.auth.requestOtp(pendingMobile ?? (LIVE ? '' : '9849042187'))
      restart(resendAfterSeconds)
      showToast('A new code is on its way')
    } catch (e) {
      showToast(errorMessage(e, 'We could not send a new code. Please try again.'), 'critical')
    }
  }

  return (
    <Screen background="bg-white">
      <Div className=" flex-1 flex-col px-6">
        <Btn
          onPress={nav.back}
          className="tap -ml-1 mt-2 flex-col h-[38px] w-[38px] items-center justify-center rounded-full bg-ink-50"
        >
          <ChevronRight className="h-[20px] w-[20px] rotate-180 text-ink-700" strokeWidth={2.4} />
        </Btn>

        <StepBar step={2} total={3} className="mt-6" />

        <P className="mt-5 font-display text-[29px] font-extrabold leading-[34px] tracking-[-0.7px] text-ink-900">
          Verification code
        </P>
        <P className="mt-2.5 text-body-lg leading-[23px] text-ink-500">
          We sent a 6-digit code to <Span className="font-semibold text-ink-900">{maskMobile(pendingMobile ?? (LIVE ? '' : '9849042187'))}</Span>
        </P>
        <Btn onPress={nav.back} className="tap mt-2 self-start text-body-sm font-bold text-brand-600">
          Change mobile number
        </Btn>

        <Div className="mt-8">
          <Field error={error}>
          <Controller
            control={control}
            name="code"
            render={({ field }) => (
              <OtpInput
                value={field.value}
                error={Boolean(rejected)}
                onChange={(code) => {
                  setRejected(null)
                  field.onChange(code)
                }}
              />
            )}
          />
          </Field>
        </Div>

        <Div className="mt-5 flex-row items-center justify-between">
          <Span className="text-body-sm text-ink-400">
            Resend code in{' '}
            <Span className="font-bold tabular-nums text-ink-800">00:{String(remaining).padStart(2, '0')}</Span>
          </Span>
          <Btn
            onPress={resend}
            className={`text-body-sm font-bold ${remaining > 0 ? 'text-ink-300' : 'text-brand-600'}`}
            disabled={remaining > 0}
          >
            Resend
          </Btn>
        </Div>

        <Div className="mt-7">
          <Button loading={formState.isSubmitting} onClick={verify}>
            Verify &amp; Continue
          </Button>
        </Div>

        <Div className="mt-6 flex-row items-start gap-2.5 rounded-tile bg-brand-50 p-3.5">
          <ShieldCheck className="mt-[1px] h-[16px] w-[16px] shrink-0 text-brand-600" strokeWidth={2.2} />
          <P className="text-body-sm leading-[19px] text-brand-700">
            KDC+ will never ask for this code over a call, SMS or email. Do not share it with anyone.
          </P>
        </Div>
      </Div>
    </Screen>
  )
}

/* =============================================== 08 — Profile setup ======= */

export function ProfileSetupScreen() {
  const nav = useNav()
  const profile = useProfile((s) => s.profile)
  /* A new account starts without a photo, as the blueprint shows. */
  const [photo, setPhoto] = React.useState<string | undefined>(undefined)
  const { control, handleSubmit, watch, setValue, formState } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.name,
      dob: profile.dob,
      gender: profile.gender,
      email: profile.email,
      bloodGroup: profile.bloodGroup,
      consent: !LIVE || useSession.getState().profileComplete,
    },
  })
  const name = watch('name')

  const save = handleSubmit(async (form) => {
    if (LIVE) {
      const firstSave = !useSession.getState().profileComplete
      try {
        await saveProfile({ name: form.name, dob: form.dob, gender: form.gender, email: form.email, bloodGroup: form.bloodGroup }, firstSave)
        if (firstSave) await syncAll()
      } catch (e) {
        showToast(errorMessage(e, 'We could not save your profile. Please try again.'), 'critical')
        return
      }
      if (firstSave) nav.resetTo('home', 'home')
      else {
        showToast('Profile updated')
        nav.back()
      }
      return
    }
    const saved = await services.profile.save({
      ...profile,
      name: form.name.trim(),
      firstName: form.name.trim().split(' ')[0],
      dob: form.dob,
      age: ageFromDob(form.dob),
      gender: form.gender,
      email: form.email,
      bloodGroup: form.bloodGroup,
      photo: photo ?? profile.photo,
    })
    useProfile.getState().setProfile(saved)
    const session = useSession.getState()
    if (session.profileComplete) {
      showToast('Profile updated')
      nav.back()
    } else {
      session.completeProfile()
      nav.resetTo('home', 'home')
    }
  })

  return (
    <Screen background="bg-white" padBottom={false}>
      <Div className="flex-1 px-6 pb-[150px]">
        <StepBar step={3} total={3} className="pt-4" />

        <P className="mt-5 font-display text-[27px] font-extrabold leading-[32px] tracking-[-0.6px] text-ink-900">
          Complete your profile
        </P>
        <P className="mt-2 text-body leading-[21px] text-ink-500">
          This helps doctors give you safer, more accurate advice.
        </P>

        {/* Avatar picker (demo only: live profile photos need authenticated image loading, not built yet) */}
        {!LIVE && <Div className="mt-7  flex-col items-center">
          <Div className="relative">
            <Avatar src={photo} name={name || profile.name} size={96} radius={32} />
            <IconButton
              size={32}
              tone="brand"
              label="Change photo"
              onClick={() => pickPhoto(setPhoto)}
              className="absolute -bottom-1 -right-1 ring-[3px] ring-white"
            >
              <Camera className="h-[15px] w-[15px]" strokeWidth={2.2} />
            </IconButton>
          </Div>
          <P className="mt-2.5 text-body-sm font-semibold text-brand-600">Add profile photo</P>
        </Div>}

        <Div className="mt-7 gap-4">
          <FormInput control={control} name="name" label="Full name" required placeholder="As per government ID" />

          <Div className=" grid-cols-2 gap-3">
            <FormDate control={control} name="dob" label="Date of birth" required />
            <FormSelect control={control} name="gender" label="Gender" required options={['Male', 'Female', 'Other']} />
          </Div>

          <FormInput
            control={control}
            name="email"
            label="Email address"
            placeholder="you@example.com"
            inputMode="email"
            autoCapitalize="none"
          />

          <Field label="Blood group" hint="Shown to doctors during emergencies.">
            <Div className="flex-row flex-wrap gap-2">
              <ChoiceChips
                options={BLOOD_GROUPS}
                value={watch('bloodGroup')}
                onChange={(b) => setValue('bloodGroup', b)}
                chipClass="tap h-[40px] w-[58px] rounded-chip text-body-sm font-bold "
              />
            </Div>
          </Field>

          <Controller
            control={control}
            name="consent"
            render={({ field, fieldState }) => (
              <Field error={fieldState.error?.message}>
                <Checkbox
                  checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  label={
                    <>
                      I consent to KDC+ storing my health information securely for the purpose of providing care.
                    </>
                  }
                />
              </Field>
            )}
          />
        </Div>
      </Div>

      <StickyBar>
        <Button loading={formState.isSubmitting} onClick={save} icon={<Check className="h-[18px] w-[18px]" strokeWidth={2.6} />}>
          Complete Profile
        </Button>
      </StickyBar>
    </Screen>
  )
}
