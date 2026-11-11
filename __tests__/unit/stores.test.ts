import { InvalidOtpError, INVALID_OTP } from '../../src/services/auth'
import { services } from '../../src/services'
import { resultFromPicker } from '../../src/services/documents'
import { isDeclined } from '../../src/services/payments'
import { initialRouteFor, useSession } from '../../src/store/session'
import { logout } from '../../src/store/reset'
import { useCart } from '../../src/store/cart'
import { useAppointments, appointmentById, takenTimes, upcomingOf } from '../../src/store/appointments'
import { useAddresses } from '../../src/store/addresses'
import { useFamily, patientLabel } from '../../src/store/family'
import { ageFromDob, useProfile } from '../../src/store/profile'
import { notificationFeed, useNotifications } from '../../src/store/notifications'
import { useSettings } from '../../src/store/settings'
import { savedByArea, totalSaved, useMembership, membershipEntryScreen } from '../../src/store/membership'
import { useUploads } from '../../src/store/uploads'
import { useBooking } from '../../src/store/booking'
import { useDiscovery, sheetFiltersFor } from '../../src/store/discovery'
import { eventMonth, filterTimeline, groupByMonth, timelineEvents } from '../../src/store/records'
import { describeMethod, methodById, spendSummary, usePayments, WALLET, CASH_ON_DELIVERY } from '../../src/store/payments'
import { useCall } from '../../src/store/call'
import { useOrders } from '../../src/store/orders'
import { getPrescription } from '../../src/store/catalog'
import { SHEET_DEFAULTS, NO_FILTERS } from '../../src/domain/doctorSearch'
import type { PaymentMethod } from '../../src/types'

beforeEach(() => {
  logout()
  useSession.getState().markOnboarded()
})

async function restart<T extends { persist: { rehydrate: () => Promise<void> | void } }>(store: T) {
  await store.persist.rehydrate()
}

describe('auth service', () => {
  it('accepts any six digits except the error code', async () => {
    await expect(services.auth.verifyOtp('9849042187', '123456')).resolves.toMatchObject({ mobile: '9849042187' })
    await expect(services.auth.verifyOtp('9849042187', INVALID_OTP)).rejects.toBeInstanceOf(InvalidOtpError)
  })

  it('requests a resend window', async () => {
    await expect(services.auth.requestOtp('9849042187')).resolves.toEqual({ resendAfterSeconds: 24 })
  })
})

describe('session', () => {
  it('routes by session state', () => {
    expect(initialRouteFor({ token: null, profileComplete: false })).toBe('splash')
    expect(initialRouteFor({ token: 't', profileComplete: false })).toBe('profile-setup')
    expect(initialRouteFor({ token: 't', profileComplete: true })).toBe('main')
  })

  it('persists sign-in across restart and clears on logout', async () => {
    useSession.getState().signIn('tok', '9849042187')
    useSession.getState().completeProfile()
    await restart(useSession)
    expect(useSession.getState().token).toBe('tok')
    expect(initialRouteFor(useSession.getState())).toBe('main')
    logout()
    expect(useSession.getState().token).toBeNull()
    expect(initialRouteFor(useSession.getState())).toBe('splash')
  })

  it('keeps onboarding completed across logout', () => {
    useSession.getState().markOnboarded()
    logout()
    expect(useSession.getState().onboarded).toBe(true)
  })

  it('wipes patient data on logout', async () => {
    await useFamily.getState().add({ name: 'Test Kid', relation: 'Son', dob: '01 Jan 2020', gender: 'Male', blood: '' })
    useCart.getState().clear()
    logout()
    expect(useFamily.getState().members).toHaveLength(5)
    expect(useCart.getState().lines).toHaveLength(3)
  })
})

describe('cart', () => {
  it('seeds the three blueprint lines', () => {
    expect(useCart.getState().lines.map((l) => [l.medicineId, l.qty])).toEqual([['m1', 1], ['m2', 1], ['m3', 2]])
  })

  it('adds new lines and increments existing ones', () => {
    useCart.getState().add('m4')
    useCart.getState().add('m4', 2)
    expect(useCart.getState().lines.find((l) => l.medicineId === 'm4')?.qty).toBe(3)
  })

  it('clears the seeded flag when a seeded line is touched', () => {
    useCart.getState().setQty('m1', 3)
    expect(useCart.getState().lines.find((l) => l.medicineId === 'm1')).toEqual({ medicineId: 'm1', qty: 3 })
  })

  it('removes a line when quantity drops to zero', () => {
    useCart.getState().setQty('m1', 0)
    expect(useCart.getState().lines.some((l) => l.medicineId === 'm1')).toBe(false)
  })

  it('addPrescribed keeps existing quantities and links the prescription', () => {
    useCart.getState().setQty('m1', 5)
    useCart.getState().addPrescribed(['m1', 'm4'], { source: 'kdc', label: 'L' })
    const lines = useCart.getState().lines
    expect(lines.find((l) => l.medicineId === 'm1')?.qty).toBe(5)
    expect(lines.find((l) => l.medicineId === 'm4')?.qty).toBe(1)
    expect(useCart.getState().prescription).toEqual({ source: 'kdc', label: 'L' })
  })

  it('survives a restart', async () => {
    useCart.getState().add('m6', 2)
    await restart(useCart)
    expect(useCart.getState().lines.find((l) => l.medicineId === 'm6')?.qty).toBe(2)
  })
})

describe('appointments', () => {
  const request = {
    doctorId: 'd2',
    mode: 'audio' as const,
    date: { year: 2025, month: 9, day: 7 },
    time: '10:00 AM',
    patientLabel: 'Aarav Sharma',
    paidVia: 'UPI · a@b',
    bill: { base: 500, platformFee: 49, discount: 125, total: 424 },
    discountLabel: 'KDC+ Plus (25% off)',
  }

  it('books into the store and survives a restart', async () => {
    const a = await useAppointments.getState().book(request)
    expect(a).toMatchObject({ status: 'confirmed', fee: 500, discount: 125, date: 'Tue, 7 Oct 2025' })
    expect(a.bookingId).toMatch(/^KDC2510A\d{4}$/)
    await restart(useAppointments)
    expect(useAppointments.getState().items.some((x) => x.id === a.id)).toBe(true)
  })

  it('cancels with a refund reason', async () => {
    const cancelled = await useAppointments.getState().cancel('a1')
    expect(cancelled.status).toBe('cancelled')
    expect(cancelled.reason).toMatch(/Refunded/)
    expect(useAppointments.getState().lastCancelledId).toBe('a1')
  })

  it('reschedules to a new date and time', async () => {
    const moved = await useAppointments.getState().reschedule('a2', { year: 2025, month: 9, day: 15 }, '9:30 AM')
    expect(moved).toMatchObject({ date: 'Wed, 15 Oct 2025', time: '9:30 AM', status: 'confirmed' })
  })

  it('stores consultation feedback', () => {
    useAppointments.getState().saveFeedback('a1', { rating: 4, tags: ['On time'], note: 'good' })
    expect(useAppointments.getState().items[0].feedback?.rating).toBe(4)
  })

  it('selects, orders and looks up upcoming appointments', async () => {
    const items = useAppointments.getState().items
    expect(upcomingOf(items).map((a) => a.id)).toEqual(['a1', 'a2'])
    expect(appointmentById(items, 'a3').id).toBe('a3')
    expect(appointmentById(items, undefined).id).toBe('a1')
    expect(takenTimes(items, 'd1', '2025-10-05')).toEqual(['5:30 PM'])
  })
})

describe('booking draft', () => {
  it('seeds the blueprint selection', () => {
    expect(useBooking.getState()).toMatchObject({ doctorId: 'd1', mode: 'video', time: '5:30 PM', date: { day: 6 } })
  })

  it('clears the time when the date changes, but not when it stays', () => {
    const b = useBooking.getState()
    b.setDate({ year: 2025, month: 9, day: 6 })
    expect(useBooking.getState().time).toBe('5:30 PM')
    b.setDate({ year: 2025, month: 9, day: 7 })
    expect(useBooking.getState().time).toBeNull()
  })

  it('flows the selected doctor and persists the draft', async () => {
    useBooking.getState().selectDoctor('d4')
    useBooking.getState().setMode('clinic')
    await restart(useBooking)
    expect(useBooking.getState()).toMatchObject({ doctorId: 'd4', mode: 'clinic' })
  })

  it('starts and ends a reschedule', () => {
    useBooking.getState().startReschedule('a2', 'd4', 'clinic')
    expect(useBooking.getState()).toMatchObject({ reschedulingId: 'a2', doctorId: 'd4', mode: 'clinic', time: null })
    useBooking.getState().finishReschedule()
    expect(useBooking.getState().reschedulingId).toBeNull()
  })
})

describe('family and addresses', () => {
  it('adds and edits a member, deriving age', async () => {
    const added = await useFamily.getState().add({ name: 'New Kid', relation: 'Daughter', dob: '15 Jun 2015', gender: 'Female', blood: 'A+' })
    expect(added.age).toBe(ageFromDob('15 Jun 2015'))
    await useFamily.getState().update(added.id, { name: 'Renamed', relation: 'Daughter', dob: '15 Jun 2015', gender: 'Female', blood: 'A+' })
    expect(useFamily.getState().members.find((m) => m.id === added.id)?.name).toBe('Renamed')
    await restart(useFamily)
    expect(useFamily.getState().members.some((m) => m.name === 'Renamed')).toBe(true)
  })

  it('removes a member', async () => {
    await useFamily.getState().remove('f5')
    expect(useFamily.getState().members.some((m) => m.id === 'f5')).toBe(false)
  })

  it('labels the booking patient', () => {
    expect(patientLabel(useFamily.getState().members[0])).toBe('Aarav Sharma')
    expect(patientLabel(useFamily.getState().members[1])).toBe('Priya Sharma (Spouse)')
  })

  it('adds, edits, selects and deletes an address', async () => {
    const added = await useAddresses.getState().add({ label: 'Other', line: 'Flat 1, Street', area: 'Area – 500001', phone: '+91 98490 42187' })
    expect(useAddresses.getState().selectedId).toBe(added.id)
    await useAddresses.getState().update(added.id, { label: 'Office', line: 'Flat 9', area: 'Area – 500002', phone: '+91 98490 42187' })
    expect(useAddresses.getState().items.find((a) => a.id === added.id)?.label).toBe('Office')
    await useAddresses.getState().remove(added.id)
    expect(useAddresses.getState().items.some((a) => a.id === added.id)).toBe(false)
    expect(useAddresses.getState().selectedId).toBe(useAddresses.getState().items[0].id)
  })

  it('moves the default', () => {
    useAddresses.getState().setDefault('ad2')
    const items = useAddresses.getState().items
    expect(items.filter((a) => a.isDefault).map((a) => a.id)).toEqual(['ad2'])
  })

  it('repairs the default when the default address is deleted', async () => {
    await useAddresses.getState().remove('ad1')
    expect(useAddresses.getState().items[0].isDefault).toBe(true)
  })
})

describe('membership', () => {
  it('seeds the annual plan and its savings', () => {
    const m = useMembership.getState()
    expect(m).toMatchObject({ status: 'active', planId: 'annual', renews: '12 Jan 2027' })
    expect(totalSaved(m.ledger)).toBe(savedByArea(m.ledger).consultations + savedByArea(m.ledger).pharmacy + savedByArea(m.ledger).diagnostics)
  })

  it('activates a plan keeping the savings ledger', async () => {
    const before = useMembership.getState().ledger.length
    await useMembership.getState().activate('half', new Date(2026, 0, 31))
    const m = useMembership.getState()
    expect(m.planId).toBe('half')
    expect(m.since).toBe('31 Jan 2026')
    expect(m.renews).toBe('31 Jul 2026')
    expect(m.status).toBe('active')
    expect(m.ledger).toHaveLength(before)
    await restart(useMembership)
    expect(useMembership.getState().planId).toBe('half')
  })

  it('expires and routes entry points by status', () => {
    useMembership.getState().expire()
    expect(useMembership.getState().status).toBe('expired')
    expect(membershipEntryScreen('expired')).toBe('st-membership-expired')
    expect(membershipEntryScreen('none')).toBe('membership')
    expect(membershipEntryScreen('active')).toBe('membership-manage')
  })

  it('toggles auto-renew', () => {
    useMembership.getState().setAutoRenew(false)
    expect(useMembership.getState().autoRenew).toBe(false)
  })
})

describe('notifications', () => {
  it('starts with two unread and marks one read', () => {
    const before = notificationFeed([], []).filter((n) => n.unread)
    expect(before.map((n) => n.id)).toEqual(['n1', 'n2'])
    useNotifications.getState().markRead('n1')
    const s = useNotifications.getState()
    expect(notificationFeed(s.added, s.readIds).filter((n) => n.unread).map((n) => n.id)).toEqual(['n2'])
  })

  it('marks all read and persists', async () => {
    useNotifications.getState().markAllRead()
    await restart(useNotifications)
    const s = useNotifications.getState()
    expect(notificationFeed(s.added, s.readIds).some((n) => n.unread)).toBe(false)
  })

  it('pushes a new unread item to the top', () => {
    useNotifications.getState().push({ category: 'Payments', title: 'T', body: 'B', time: 'Just now' })
    const s = useNotifications.getState()
    expect(notificationFeed(s.added, s.readIds)[0]).toMatchObject({ title: 'T', unread: true, group: 'Today' })
  })
})

describe('settings', () => {
  it('matches the blueprint defaults and persists toggles', async () => {
    expect(useSettings.getState().toggles).toEqual({
      appointmentReminders: true,
      prescriptionRefills: true,
      orderUpdates: true,
      offers: false,
      faceIdLock: true,
    })
    useSettings.getState().toggle('offers')
    useSettings.getState().setLanguage('Hindi')
    await restart(useSettings)
    expect(useSettings.getState().toggles.offers).toBe(true)
    expect(useSettings.getState().language).toBe('Hindi')
  })
})

describe('discovery store', () => {
  it('starts pristine with sheet defaults', () => {
    expect(useDiscovery.getState().pristine).toBe(true)
    expect(sheetFiltersFor(useDiscovery.getState())).toBe(SHEET_DEFAULTS)
  })

  it('records and deduplicates recents, and removes them', () => {
    useDiscovery.getState().applySearch('Dr. Neha')
    useDiscovery.getState().applySearch('Dr. Neha')
    expect(useDiscovery.getState().recents.filter((r) => r.label === 'Dr. Neha')).toHaveLength(1)
    expect(useDiscovery.getState().pristine).toBe(false)
    useDiscovery.getState().removeRecent('Dr. Neha')
    expect(useDiscovery.getState().recents.some((r) => r.label === 'Dr. Neha')).toBe(false)
  })

  it('applies a specialty and filters', () => {
    useDiscovery.getState().applySpecialty('Dermatology')
    expect(useDiscovery.getState().query.filters.specialty).toBe('Dermatology')
    useDiscovery.getState().applyFilters({ ...NO_FILTERS, gender: 'Male' })
    expect(useDiscovery.getState().query.filters.gender).toBe('Male')
    expect(sheetFiltersFor(useDiscovery.getState()).gender).toBe('Male')
  })

  it('saves doctors across restart', async () => {
    useDiscovery.getState().toggleSaved('d1')
    await restart(useDiscovery)
    expect(useDiscovery.getState().savedDoctorIds).toEqual(['d1'])
  })
})

describe('records', () => {
  it('filters and groups the timeline', () => {
    const events = timelineEvents([])
    expect(filterTimeline(events, 'Pharmacy').every((e) => e.type === 'pharmacy')).toBe(true)
    expect(filterTimeline(events, 'Reports').map((e) => e.type)).toEqual(['lab', 'report'])
    expect(groupByMonth(events).map((g) => g.month)).toEqual(['October 2025', 'September 2025'])
    expect(eventMonth('5 Oct 2025')).toBe('October 2025')
  })

  it('finds a prescription by id and falls back to the latest', () => {
    expect(getPrescription('KDC-RX-2025-47712').doctorId).toBe('d2')
    expect(getPrescription(undefined).id).toBe('KDC-RX-2025-48219')
  })
})

describe('profile', () => {
  it('derives age from a date of birth', () => {
    expect(ageFromDob('14 Mar 1991', new Date(2025, 9, 5))).toBe(34)
    expect(ageFromDob('14 Dec 1991', new Date(2025, 9, 5))).toBe(33)
  })

  it('persists medical information', async () => {
    useProfile.getState().setMedical({ ...useProfile.getState().medical, allergies: ['Latex'] })
    await restart(useProfile)
    expect(useProfile.getState().medical.allergies).toEqual(['Latex'])
  })
})

describe('payments store', () => {
  it('adds UPI and card methods and selects them', () => {
    usePayments.getState().addUpi('fail@upi')
    const method = methodById(usePayments.getState().methods, usePayments.getState().selectedMethodId)
    expect(method).toMatchObject({ kind: 'upi', label: 'fail@upi' })
    usePayments.getState().addCard('4242', '12/30', 'Aarav')
    expect(usePayments.getState().methods.at(-1)).toMatchObject({ kind: 'card', sub: '•••• •••• •••• 4242 · Exp 12/30' })
  })

  it('resolves non-saved methods', () => {
    expect(methodById(usePayments.getState().methods, 'wallet').label).toBe(WALLET.label)
    expect(methodById(usePayments.getState().methods, 'cod').label).toBe(CASH_ON_DELIVERY.label)
  })

  it('describes methods for receipts', () => {
    expect(describeMethod({ id: 'x', kind: 'upi', label: 'a@b', sub: '', brand: 'UPI' })).toBe('UPI · a@b')
    expect(describeMethod({ id: 'x', kind: 'card', label: 'HDFC', sub: '•••• •••• •••• 4821 · Exp 09/28', brand: 'VISA' })).toBe('HDFC •••• 4821')
  })

  it('declines only UPI IDs starting with fail', () => {
    const m = (label: string, kind: PaymentMethod['kind'] = 'upi'): PaymentMethod => ({ id: 'x', kind, label, sub: '', brand: '' })
    expect(isDeclined(m('fail@upi'))).toBe(true)
    expect(isDeclined(m('FAIL.me@bank'))).toBe(true)
    expect(isDeclined(m('aarav@okhdfc'))).toBe(false)
    expect(isDeclined(m('fail@upi', 'card'))).toBe(false)
  })

  it('adds new spend on top of the blueprint baselines', () => {
    expect(spendSummary(usePayments.getState().ledger)).toEqual({ consultations: 1398, pharmacy: 453, diagnostics: 699 })
    usePayments.getState().addRecord({ type: 'Pharmacy', title: 'x', date: '5 Oct 2025', amount: 100, status: 'paid', method: 'm', ref: 'r' })
    expect(spendSummary(usePayments.getState().ledger).pharmacy).toBe(553)
  })

  it('marks a payment refunded by reference', () => {
    usePayments.getState().markRefunded('KDC2409A4410')
    expect(usePayments.getState().ledger.find((p) => p.ref === 'KDC2409A4410')?.status).toBe('refunded')
  })
})

describe('call session', () => {
  beforeEach(() => useCall.getState().beginWaiting('a1'))

  it('toggles controls', () => {
    useCall.getState().toggleMute()
    useCall.getState().toggleCamera()
    useCall.getState().toggleSpeaker()
    expect(useCall.getState()).toMatchObject({ muted: true, cameraOff: true, speakerOn: false })
  })

  it('measures the call length on end', () => {
    useCall.setState({ startedAt: 1000 })
    useCall.getState().endCall(1000 + 846_000)
    expect(useCall.getState().lastDurationSeconds).toBe(846)
    expect(useCall.getState().startedAt).toBeNull()
  })
})

describe('uploads', () => {
  it('starts with the blueprint file and removes it', () => {
    expect(useUploads.getState().items.map((u) => u.name)).toEqual(['prescription_22sep.pdf'])
    useUploads.getState().remove('up1')
    expect(useUploads.getState().items).toHaveLength(0)
  })

  it('tracks upload progress to completion', async () => {
    await useUploads.getState().upload({ name: 'rx.jpg', size: '300 KB', kind: 'image', uri: 'file://rx.jpg' })
    const doc = useUploads.getState().items.at(-1)
    expect(doc).toMatchObject({ name: 'rx.jpg', status: 'done', progress: 100 })
  })

  it('drops the cart prescription when its upload is removed', async () => {
    useCart.getState().attachPrescription({ source: 'upload', label: 'rx.jpg', uploadId: 'up1' })
    useUploads.getState().remove('up1')
    expect(useCart.getState().prescription).toBeNull()
  })

  it('keeps completed uploads through a restart, not unfinished ones', async () => {
    useUploads.setState({
      items: [
        { id: 'a', name: 'a', size: '1', kind: 'image', progress: 100, status: 'done' },
        { id: 'b', name: 'b', size: '1', kind: 'image', progress: 40, status: 'uploading' },
      ],
    })
    await restart(useUploads)
    expect(useUploads.getState().items.map((u) => u.id)).toEqual(['a'])
  })

  it('maps picker responses', () => {
    expect(resultFromPicker({ didCancel: true })).toEqual({ status: 'cancelled' })
    expect(resultFromPicker({ errorCode: 'permission' })).toEqual({ status: 'denied' })
    expect(resultFromPicker({ errorCode: 'camera_unavailable' })).toMatchObject({ status: 'error' })
    expect(resultFromPicker({ assets: [{ fileName: 'a.jpg', fileSize: 2 * 1024 * 1024, uri: 'u' }] })).toMatchObject({
      status: 'picked',
      file: { name: 'a.jpg', size: '2.0 MB', kind: 'image', uri: 'u' },
    })
  })
})

describe('orders store', () => {
  it('cancels a diagnostic booking', async () => {
    await useOrders.getState().cancelDiagnostic('KDC-DX-77215')
    expect(useOrders.getState().diagnostics[0].status).toBe('cancelled')
  })
})
