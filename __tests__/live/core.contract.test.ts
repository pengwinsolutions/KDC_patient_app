/// <reference types="node" />
/** Live core: SMS sign-in, onboarding, restoring the session, sign-out. See test-support/live.ts. */
import { data, liveSuite, signIn } from '../../test-support/live'

liveSuite('the patient app on the live backend: session', () => {
  jest.setTimeout(120_000)
  /* eslint-disable @typescript-eslint/no-require-imports */
  const http = require('../../src/services/live/http') as typeof import('../../src/services/live/http')
  const me = require('../../src/services/live/me') as typeof import('../../src/services/live/me')
  const { useSession } = require('../../src/store/session') as typeof import('../../src/store/session')
  const { useProfile } = require('../../src/store/profile') as typeof import('../../src/store/profile')
  const { logout } = require('../../src/store/reset') as typeof import('../../src/store/reset')
  const secure = require('../../src/store/secure') as typeof import('../../src/store/secure')
  const mobile = data?.patients[0].mobile ?? ''

  it('signs in by SMS code; a new patient completes the profile with consent', async () => {
    const view = await signIn(mobile)
    expect(useSession.getState().token).toBeTruthy()
    expect(await secure.loadRefreshToken()).toBeTruthy()
    if (!view.profileCompleted) {
      expect(useSession.getState().profileComplete).toBe(false)
      await me.saveProfile({ name: 'Priya Sharma', dob: '14 Mar 1991', gender: 'Female', email: '', bloodGroup: 'B+' }, true)
    }
    expect(useSession.getState().profileComplete).toBe(true)
    const p = useProfile.getState().profile
    expect(p).toMatchObject({ name: 'Priya Sharma', firstName: 'Priya', dob: '14 Mar 1991', gender: 'Female' })
    expect(Number(p.id)).toBeGreaterThan(0)
  })

  it('a later launch restores the session from the Keychain (the access token is not kept)', async () => {
    useSession.setState({ token: null })
    expect(await http.restoreSession()).toBe('signed-in')
    expect(useSession.getState().token).toBeTruthy()
    expect((await me.loadMe()).profileCompleted).toBe(true)
  })

  it('a wrong code shows the server message', async () => {
    const { services } = require('../../src/services') as typeof import('../../src/services')
    await expect(services.auth.verifyOtp(mobile, '000000')).rejects.toMatchObject({ code: 'invalid' })
  })

  it('logging out ends the session on the server and forgets the patient', async () => {
    const token = useSession.getState().token!
    logout()
    await new Promise((r) => setTimeout(r, 800))
    expect(useSession.getState().token).toBeNull()
    expect(await secure.loadRefreshToken()).toBeNull()
    expect(useProfile.getState().profile.name).toBe('')
    const r = await fetch(`${process.env.PATIENT_LIVE_URL}/patient/me`, { headers: { Authorization: `Bearer ${token}` } })
    expect(r.status).toBe(401)
  })
})
