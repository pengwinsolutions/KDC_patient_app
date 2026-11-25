/**
 * Notifications: every kind opens the right screen (from the inbox or a push), and the inbox only
 * reloads when the server's unread count says something changed.
 */
import { notificationRoute } from '../../src/services/live/notifications'
import { pushRoute } from '../../src/notifications/push'
import type { NotificationItem } from '../../src/types'

const item = (type: string, code: string | null = 'KDC-X-1') => ({ target: { type, code } }) as NotificationItem

describe('where a notification opens', () => {
  it.each([
    ['appointment', 'appointment-detail', { id: 'KDC-X-1' }],
    ['consultation', 'appointment-detail', { id: 'KDC-X-1' }],
    ['waiting_room', 'waiting-room', { id: 'KDC-X-1' }],
    ['prescription', 'prescription', { rxId: 'KDC-X-1' }],
    ['lab_report', 'lab-report', { id: 'KDC-X-1' }],
    ['lab_booking', 'diagnostic-tracking', { id: 'KDC-X-1' }],
    ['order', 'order-tracking', { id: 'KDC-X-1' }],
    ['payment', 'payments', {}],
    ['membership', 'membership-manage', {}],
    ['support_ticket', 'help', {}],
  ])('%s → %s', (type, screen, params) => {
    expect(notificationRoute(item(type))).toEqual({ screen, params })
  })

  it('opens nothing for an unknown kind or without a code', () => {
    expect(notificationRoute(item('campaign'))).toBeNull()
    expect(notificationRoute(item('order', null))).toBeNull()
  })

  it('a tapped push routes like the inbox, from its data', () => {
    expect(pushRoute({ data: { type: 'waiting_room', code: 'KDC-AP-9', event: 'consultation.doctor_ready' } })).toEqual({ screen: 'waiting-room', params: { id: 'KDC-AP-9' } })
    expect(pushRoute({ data: {} })).toBeNull()
    expect(pushRoute(null)).toBeNull()
  })
})

describe('keeping the inbox current', () => {
  beforeEach(() => jest.resetModules())

  it('reloads only when the server’s unread count differs from the app’s', async () => {
    jest.doMock('../../src/services/config', () => ({ LIVE: true, API_CONFIG: { useMock: false, baseUrl: 'http://test', timeoutMs: 1000 } }))
    const get = jest.fn()
    const sync = jest.fn(async () => undefined)
    jest.doMock('../../src/services/live/http', () => ({ api: { get } }))
    jest.doMock('../../src/services/live/sync', () => ({ syncOne: sync }))
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { checkInbox } = require('../../src/notifications/inbox') as typeof import('../../src/notifications/inbox')
    const { useNotifications } = require('../../src/store/notifications') as typeof import('../../src/store/notifications')
    useNotifications.getState().setAll([{ id: '1', group: 'Today', category: 'Appointments', title: 'a', body: 'b', time: 'now', unread: true }])

    get.mockResolvedValueOnce({ unread: 1 })
    await checkInbox()
    expect(sync).not.toHaveBeenCalled()

    get.mockResolvedValueOnce({ unread: 2 })
    await checkInbox()
    expect(sync).toHaveBeenCalledWith('notifications')

    get.mockRejectedValueOnce(new Error('offline'))
    await expect(checkInbox()).resolves.toBeUndefined()
  })
})
