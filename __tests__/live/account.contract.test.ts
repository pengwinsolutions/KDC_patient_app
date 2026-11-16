/// <reference types="node" />
/**
 * Live account: family, medical record, addresses, preferences, timeline and counts,
 * notifications, a support ticket, and deleting the account. See test-support/live.ts.
 */
import { liveSuite, signIn, smsCodeFor, smsCount, sql } from '../../test-support/live'

liveSuite('the patient app on the live backend: account', () => {
  jest.setTimeout(180_000)
  const { syncOne } = require('../../src/services/live/sync') as typeof import('../../src/services/live/sync')
  require('../../src/services/live/sync-account')
  const account = require('../../src/services/live/account') as typeof import('../../src/services/live/account')
  const records = require('../../src/services/live/records') as typeof import('../../src/services/live/records')
  const support = require('../../src/services/live/support') as typeof import('../../src/services/live/support')
  const { services } = require('../../src/services') as typeof import('../../src/services')
  const { useFamily } = require('../../src/store/family') as typeof import('../../src/store/family')
  const { useAddresses } = require('../../src/store/addresses') as typeof import('../../src/store/addresses')
  const { useProfile } = require('../../src/store/profile') as typeof import('../../src/store/profile')
  const { useSettings } = require('../../src/store/settings') as typeof import('../../src/store/settings')
  const { useRecords } = require('../../src/store/records') as typeof import('../../src/store/records')
  const { notificationFeed, useNotifications } = require('../../src/store/notifications') as typeof import('../../src/store/notifications')
  const { useSession } = require('../../src/store/session') as typeof import('../../src/store/session')
  const secure = require('../../src/store/secure') as typeof import('../../src/store/secure')
  const http = require('../../src/services/live/http') as typeof import('../../src/services/live/http')
  const URL = process.env.PATIENT_LIVE_URL
  const run = Date.now() % 90
  const mobile = `98765984${String(run).padStart(2, '0')}`
  const doomed = `98765984${String(run + 10 > 99 ? run - 10 : run + 10).padStart(2, '0')}`

  beforeAll(async () => {
    await signIn(mobile, { name: 'Ananya Iyer', gender: 'Female' })
    await syncOne('family', 'medical', 'addresses', 'records', 'notifications', 'settings')
  })

  it('family: the account holder first; add, edit and remove a member through the store', async () => {
    const self = useFamily.getState().members[0]
    expect(self).toMatchObject({ name: 'Ananya Iyer', relation: 'Self', primary: true, gender: 'Female' })
    const added = await useFamily.getState().add({ name: 'Lakshmi Iyer', relation: 'Mother', dob: '10 Feb 1962', gender: 'Female', blood: 'B+', mobile: '+91 98765 11111' })
    expect(added).toMatchObject({ relation: 'Mother', dob: '10 Feb 1962', blood: 'B+', mobile: '+91 98765 11111' })
    expect(Number(added.id)).toBeGreaterThan(0)
    await useFamily.getState().update(added.id, { name: 'Lakshmi R Iyer', relation: 'Mother', dob: '10 Feb 1962', gender: 'Female', blood: 'O+' })
    await syncOne('family')
    expect(useFamily.getState().members.find((m) => m.id === added.id)).toMatchObject({ name: 'Lakshmi R Iyer', blood: 'O+' })
    await useFamily.getState().remove(added.id)
    await syncOne('family')
    expect(useFamily.getState().members.map((m) => m.id)).not.toContain(added.id)
  })

  it('medical record: saved on the server, reloaded into the store', async () => {
    const saved = await services.profile.saveMedical({
      bloodGroup: 'B+',
      allergies: ['Penicillin', 'Peanuts'],
      conditions: ['Asthma'],
      medications: [],
      surgeries: [],
      emergency: { name: 'Ravi Iyer', relation: 'Husband', mobile: '+91 98765 22222' },
      height: '162 cm',
      weight: '58.5 kg',
    })
    expect(saved).toMatchObject({ height: '162 cm', weight: '58.5 kg', allergies: ['Penicillin', 'Peanuts'] })
    useProfile.getState().setMedical({ ...saved, allergies: [] })
    await syncOne('medical')
    expect(useProfile.getState().medical).toMatchObject({ bloodGroup: 'B+', allergies: ['Penicillin', 'Peanuts'], emergency: { name: 'Ravi Iyer', mobile: '+91 98765 22222' } })
  })

  it('addresses: add (with PIN), edit, make default, remove', async () => {
    const s = useAddresses.getState
    const home = await s().add({ label: 'Home', line: 'Flat 402, Lotus Residency', area: 'Banjara Hills – 500034', phone: '+91 98765 33333' })
    expect(home).toMatchObject({ label: 'Home', area: 'Banjara Hills – 500034', isDefault: true })
    const office = await s().add({ label: 'Office', line: 'Plot 12, Cyber Towers', area: 'Madhapur – 500081', phone: '+91 98765 33333' })
    expect(office.isDefault).toBe(false)
    await s().update(office.id, { label: 'Office', line: 'Plot 14, Cyber Towers', area: 'Madhapur – 500081', phone: '+91 98765 33333' })
    s().setDefault(office.id)
    await new Promise((r) => setTimeout(r, 500))
    await syncOne('addresses')
    expect(s().items[0]).toMatchObject({ id: office.id, line: 'Plot 14, Cyber Towers', isDefault: true })
    await s().remove(office.id)
    expect(s().items.map((a) => a.id)).toEqual([home.id])
    expect(s().items[0].isDefault).toBe(true)
  })

  it('settings: a toggle and the language are saved on the server', async () => {
    expect(useSettings.getState().toggles.faceIdLock).toBe(true)
    useSettings.getState().toggle('faceIdLock')
    useSettings.getState().toggle('offers')
    useSettings.getState().setLanguage('Telugu')
    await new Promise((r) => setTimeout(r, 600))
    useSettings.getState().reset()
    await syncOne('settings')
    expect(useSettings.getState()).toMatchObject({ language: 'Telugu', toggles: { faceIdLock: false, offers: true, orderUpdates: true } })
  })

  it('records: the timeline and counts load for the account holder (new account: empty)', async () => {
    const self = useFamily.getState().members[0].id
    expect(useRecords.getState().memberId).toBe(self)
    expect(useRecords.getState().counts[self]).toEqual({ prescriptions: 0, reports: 0, consultations: 0, documents: 0 })
    const { events, total } = await records.loadTimeline(self)
    expect(total).toBe(events.length)
  })

  it('notifications: the inbox loads; marking one read is saved', async () => {
    // A support ticket's reply is a notification; insert one for this account directly (no patient UI sends one to itself).
    const userId = sql(`select id from users where mobile = '${mobile}' and account_type = 'patient'`)
    sql(`insert into notifications (user_id, event_key, category, title, body, data, created_at) values (${userId}, 'support.reply', 'System', 'Support replied', 'We have answered your ticket', json_object('type', 'support_ticket', 'code', 'T1'), utc_timestamp(3))`)
    await syncOne('notifications')
    const feed = notificationFeed(useNotifications.getState().added, useNotifications.getState().readIds)
    expect(feed).toHaveLength(1)
    expect(feed[0]).toMatchObject({ title: 'Support replied', category: 'System', group: 'Today', unread: true })
    useNotifications.getState().markRead(feed[0].id)
    await new Promise((r) => setTimeout(r, 500))
    await syncOne('notifications')
    expect(useNotifications.getState().added[0].unread).toBe(false)
  })

  it('support: "Chat support" opens a ticket the patient can see', async () => {
    const categories = await support.loadTicketCategories()
    expect(categories).toContain('Account & Privacy')
    const t = await support.createTicket({ subject: 'Cannot see my report', category: 'Diagnostics', description: 'My lab report from yesterday is not showing up.' })
    expect(t.id).toBeTruthy()
    const list = await support.loadTickets()
    expect(list.rows.map((r) => r.id)).toContain(t.id)
  })

  it('deleting the account: SMS code, everything erased, old session dead, the number starts fresh', async () => {
    // A separate account, signed in as the app does.
    useSession.setState({ token: null })
    await secure.clearRefreshToken()
    await signIn(doomed, { name: 'Rohan Das', gender: 'Male' })
    await syncOne('family')
    await useFamily.getState().add({ name: 'Mira Das', relation: 'Daughter', dob: '01 Jun 2015', gender: 'Female', blood: '' })
    const token = useSession.getState().token!
    const since = smsCount()
    await account.requestDeletionCode()
    await expect(account.deleteAccount('000000')).rejects.toMatchObject({ code: 'invalid' })
    await account.deleteAccount(await smsCodeFor(doomed, since))
    await new Promise((r) => setTimeout(r, 800))
    expect(useSession.getState().token).toBeNull()
    expect(await secure.loadRefreshToken()).toBeNull()
    expect(useFamily.getState().members).toEqual([])
    const r = await fetch(`${URL}/patient/me`, { headers: { Authorization: `Bearer ${token}` } })
    expect(r.status).toBe(401)
    const view = await signIn(doomed)
    expect(view.profileCompleted).toBe(false)
    expect(view.name).toBeNull()
    expect(await http.restoreSession()).toBe('signed-in')
  })
})
