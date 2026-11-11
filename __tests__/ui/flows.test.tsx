import React from 'react'
import { TextInput } from 'react-native'
import ReactTestRenderer from 'react-test-renderer'
import { allPressables, cleanup, flush, nav, press, pressable, render, resetNav, textOf, type } from '../../test-utils/harness'
import { LoginScreen, OtpScreen, ProfileSetupScreen } from '../../src/screens/onboarding'
import { DoctorListScreen, DoctorSearchScreen, FiltersSheetScreen } from '../../src/screens/doctors'
import { ConsultTypeScreen, DateScreen, PaymentScreen, SlotScreen, SummaryScreen, SuccessScreen } from '../../src/screens/booking'
import { CartScreen, CheckoutScreen, MedicineDetailScreen, MedicineSearchScreen, OrderTrackingScreen, UploadScreen } from '../../src/screens/pharmacy'
import { AppointmentDetailScreen, AppointmentListScreen } from '../../src/screens/appointments'
import { VideoCallScreen, WaitingRoomScreen, ConsultCompleteScreen } from '../../src/screens/consultation'
import { DiagnosticConfirmScreen, DiagnosticSlotScreen, LabSelectScreen, TestDetailScreen, TestSearchScreen } from '../../src/screens/diagnostics'
import { AddFamilyScreen, TimelineScreen } from '../../src/screens/records'
import { AddressesScreen, HelpScreen, NotificationsScreen, SettingsScreen } from '../../src/screens/profile'
import { MembershipCheckoutScreen, MembershipManageScreen, MembershipScreen } from '../../src/screens/membership'
import { PaymentFailedScreen, PaymentProcessingScreen } from '../../src/screens/states'
import { HomeScreen } from '../../src/screens/home'
import { logout } from '../../src/store/reset'
import { useAppointments } from '../../src/store/appointments'
import { useBooking } from '../../src/store/booking'
import { useCall } from '../../src/store/call'
import { useCart } from '../../src/store/cart'
import { useCheckout } from '../../src/flows/payment'
import { useDiscovery } from '../../src/store/discovery'
import { useFamily } from '../../src/store/family'
import { useMembership } from '../../src/store/membership'
import { useNotifications } from '../../src/store/notifications'
import { useOrders } from '../../src/store/orders'
import { usePayments } from '../../src/store/payments'
import { useSession } from '../../src/store/session'
import { useSettings } from '../../src/store/settings'
import { useUploads } from '../../src/store/uploads'
import { useAddresses } from '../../src/store/addresses'
import { useDiagnosticsDraft } from '../../src/store/diagnosticsDraft'
import { useProfile } from '../../src/store/profile'
import { services } from '../../src/services'

jest.mock('../../src/navigation/navigation', () => ({
  useNav: () => require('../../test-utils/harness').nav,
  devLaunch: { active: true },
  routes: { aliases: {}, tabRoots: new Set() },
  MAIN: 'main',
  resetAction: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ setOptions: jest.fn() }) }))
jest.mock('../../src/store/toast', () => ({
  ...jest.requireActual('../../src/store/toast'),
  showToast: jest.fn(),
}))

const { showToast } = jest.requireMock('../../src/store/toast') as { showToast: jest.Mock }

afterEach(cleanup)

beforeEach(() => {
  logout()
  useSession.getState().clear()
  useCheckout.getState().clear()
  resetNav()
  showToast.mockClear()
})

describe('auth', () => {
  it('blocks a short mobile number with an inline error', async () => {
    const r = await render(<LoginScreen />)
    await type(r.root, '00000 00000', '98490')
    await press(r.root, 'Continue')
    expect(textOf(r.root)).toContain('Enter a 10-digit mobile number')
    expect(nav.navigate).not.toHaveBeenCalled()
  })

  it('accepts a 10-digit number and moves to OTP', async () => {
    const r = await render(<LoginScreen />)
    await press(r.root, 'Continue')
    expect(useSession.getState().pendingMobile).toBe('9849042187')
    expect(nav.navigate).toHaveBeenCalledWith('otp')
  })

  it('rejects 000000 with the error state, then accepts a good code', async () => {
    useSession.getState().setPendingMobile('9849042187')
    const r = await render(<OtpScreen />)
    await type(r.root, null, '000000')
    await press(r.root, 'Verify')
    expect(textOf(r.root)).toContain('That code is incorrect')
    expect(useSession.getState().token).toBeNull()
    await type(r.root, null, '123456')
    await press(r.root, 'Verify')
    expect(useSession.getState().token).toMatch(/^mock-token/)
    expect(nav.navigate).toHaveBeenCalledWith('profile-setup', { replace: true })
  })

  it('requires six digits before verifying', async () => {
    const r = await render(<OtpScreen />)
    await press(r.root, 'Verify')
    expect(textOf(r.root)).toContain('Enter all 6 digits')
  })

  it('completes the profile and goes home', async () => {
    useSession.getState().signIn('tok', '9849042187')
    const r = await render(<ProfileSetupScreen />)
    await press(r.root, 'Complete Profile')
    expect(useSession.getState().profileComplete).toBe(true)
    expect(nav.resetTo).toHaveBeenCalledWith('home', 'home')
  })

  it('shows inline errors on an invalid profile', async () => {
    const r = await render(<ProfileSetupScreen />)
    await type(r.root, 'As per government ID', 'A')
    await type(r.root, 'you@example.com', 'broken')
    await press(r.root, 'Complete Profile')
    const text = textOf(r.root)
    expect(text).toContain('Enter the full name')
    expect(text).toContain('Enter a valid email address')
    expect(nav.resetTo).not.toHaveBeenCalled()
  })
})

describe('discovery', () => {
  it('filters live by search text, with the no-results state', async () => {
    const r = await render(<DoctorSearchScreen />)
    await type(r.root, 'Search doctors or specialties', 'Kavya')
    expect(textOf(r.root)).toContain('Dr. Kavya Nair')
    expect(textOf(r.root)).not.toContain('Dr. Vikram Shetty')
    await type(r.root, 'Search doctors or specialties', 'xyz')
    expect(textOf(r.root)).toContain('No matches found')
  })

  it('applies a specialty and shows real counts', async () => {
    useDiscovery.getState().applySpecialty('Dermatology')
    const r = await render(<DoctorListScreen />)
    const text = textOf(r.root)
    expect(text).toContain('Dermatologists')
    expect(text).toContain('Dr. Priya Raghavan')
    expect(text).toContain('Showing 1 of 1')
  })

  it('re-orders the list when a sort chip is pressed', async () => {
    useDiscovery.getState().showAll()
    const r = await render(<DoctorListScreen />)
    await press(r.root, 'Experience')
    expect(useDiscovery.getState().query.sort).toBe('Experience')
    const text = textOf(r.root)
    expect(text.indexOf('Dr. Vikram Shetty')).toBeLessThan(text.indexOf('Dr. Sanjay Iyer'))
  })

  it('applies the filter sheet to the list', async () => {
    const r = await render(<FiltersSheetScreen />)
    await press(r.root, 'Reset')
    expect(textOf(r.root)).toContain('8 doctors match')
    await press(r.root, 'Female')
    expect(textOf(r.root)).toContain('4 doctors match')
    await press(r.root, 'Show 4 doctors')
    expect(useDiscovery.getState().query.filters.gender).toBe('Female')
    expect(nav.navigate).toHaveBeenCalledWith('doctor-list', { replace: true })
  })

  it('carries the chosen doctor into the booking flow', async () => {
    useDiscovery.getState().applySpecialty('Paediatrics')
    const r = await render(<DoctorListScreen />)
    await press(r.root, 'Book')
    expect(useBooking.getState().doctorId).toBe('d4')
    expect(nav.navigate).toHaveBeenCalledWith('consult-type')
    const r2 = await render(<ConsultTypeScreen />)
    expect(textOf(r2.root)).toContain('Dr. Kavya Nair')
  })
})

describe('booking', () => {
  it('selects a mode and routes in-person to the clinic step', async () => {
    const r = await render(<ConsultTypeScreen />)
    await press(r.root, 'In-Person Consultation')
    expect(useBooking.getState().mode).toBe('clinic')
    expect(nav.navigate).toHaveBeenCalledWith('clinic-location')
  })

  it('updates the date and clears the slot', async () => {
    const r = await render(<DateScreen />)
    await press(r.root, '7')
    expect(useBooking.getState().date.day).toBe(7)
    expect(useBooking.getState().time).toBeNull()
    expect(textOf(r.root)).toContain('Tuesday, 7 October 2025')
  })

  it('keeps one slot selected across the three groups', async () => {
    const r = await render(<SlotScreen />)
    await press(r.root, '10:00 AM')
    expect(useBooking.getState().time).toBe('10:00 AM')
    expect(textOf(r.root)).toContain('Mon, 6 Oct · 10:00 AM')
    await press(r.root, '2:00 PM')
    expect(useBooking.getState().time).toBe('2:00 PM')
    expect(textOf(r.root)).toContain('Mon, 6 Oct · 2:00 PM')
  })

  it('blocks Continue with no slot chosen', async () => {
    useBooking.getState().setDate({ year: 2025, month: 9, day: 7 })
    const r = await render(<SlotScreen />)
    expect(textOf(r.root)).toContain('Select a time')
    expect(pressable(r.root, 'Continue').props.disabled).toBe(true)
  })

  it('computes the total from mode and membership', async () => {
    useBooking.getState().setMode('clinic')
    const r = await render(<SummaryScreen />)
    expect(textOf(r.root)).toContain('₹799') // 1000 − 25% + 49
  })

  it('charges the half-plan rate, not a flat 25%', async () => {
    await useMembership.getState().activate('half')
    const r = await render(<SummaryScreen />)
    const text = textOf(r.root)
    expect(text).toContain('15% off')
    expect(text).toContain('₹729') // 800 − 120 + 49
  })

  it('charges full price with no membership', async () => {
    useMembership.setState({ status: 'none' })
    const r = await render(<SummaryScreen />)
    const text = textOf(r.root)
    expect(text).toContain('₹849')
    expect(text).not.toContain('Member rate applied')
    expect(text).toContain('Save ₹200 on this with KDC+ Plus')
  })

  it('pays and confirms a booking that appears in appointments', async () => {
    const r = await render(<PaymentScreen />)
    await press(r.root, 'Pay ₹649')
    expect(useCheckout.getState().intent).toMatchObject({ kind: 'consultation', amount: 649 })
    expect(nav.navigate).toHaveBeenCalledWith('st-payment-processing')

    const processing = await render(<PaymentProcessingScreen />)
    await flush()
    expect(nav.finishTo).toHaveBeenCalledWith('booking-success', undefined)
    const success = await render(<SuccessScreen />)
    const id = useAppointments.getState().lastBookedId!
    const booked = useAppointments.getState().items.find((a) => a.id === id)!
    expect(textOf(success.root)).toContain(booked.bookingId)
    await processing.unmount()

    const list = await render(<AppointmentListScreen />)
    expect(textOf(list.root)).toContain(booked.bookingId)
  })

  it('routes a fail UPI ID to the failure screen with retry', async () => {
    usePayments.getState().addUpi('fail@bank')
    const r = await render(<PaymentScreen />)
    await press(r.root, 'Pay ₹649')
    await render(<PaymentProcessingScreen />)
    await flush()
    expect(nav.navigate).toHaveBeenCalledWith('st-payment-failed', { replace: true })

    const failed = await render(<PaymentFailedScreen />)
    await press(failed.root, 'Retry payment')
    expect(nav.navigate).toHaveBeenCalledWith('st-payment-processing', { replace: true })
    expect(useAppointments.getState().items).toHaveLength(5)
  })

  it('switches the payment method', async () => {
    const r = await render(<PaymentScreen />)
    await press(r.root, 'ICICI Debit Card')
    expect(usePayments.getState().selectedMethodId).toBe('pm3')
  })

  it('cancels with confirmation', async () => {
    nav.params = { id: 'a2' }
    const r = await render(<AppointmentDetailScreen />)
    await press(r.root, 'Cancel')
    expect(textOf(r.root)).toContain('Cancel this appointment?')
    expect(useAppointments.getState().items.find((a) => a.id === 'a2')?.status).toBe('confirmed')
    await press(r.root, 'Yes, cancel appointment')
    expect(useAppointments.getState().items.find((a) => a.id === 'a2')?.status).toBe('cancelled')
    expect(nav.navigate).toHaveBeenCalledWith('st-cancelled', { replace: true })
  })

  it('reschedules with confirmation', async () => {
    nav.params = { id: 'a1' }
    const detail = await render(<AppointmentDetailScreen />)
    await press(detail.root, 'Reschedule')
    expect(useBooking.getState().reschedulingId).toBe('a1')
    useBooking.getState().setDate({ year: 2025, month: 9, day: 7 })

    const r = await render(<SlotScreen />)
    await press(r.root, '11:30 AM')
    await press(r.root, 'Continue')
    expect(textOf(r.root)).toContain('Reschedule this appointment?')
    await press(r.root, 'Yes, reschedule')
    const moved = useAppointments.getState().items.find((a) => a.id === 'a1')!
    expect(moved).toMatchObject({ time: '11:30 AM', date: 'Tue, 7 Oct 2025' })
    expect(nav.finishTo).toHaveBeenCalledWith('appointment-detail', { id: 'a1' })
  })

  it('filters the appointments tabs and shows the empty state', async () => {
    const r = await render(<AppointmentListScreen />)
    await press(r.root, 'Cancelled')
    expect(textOf(r.root)).toContain('Cancelled by patient')
    useAppointments.setState({ items: [] })
    const empty = await render(<AppointmentListScreen />)
    expect(textOf(empty.root)).toContain('No appointments yet')
  })
})

describe('consultation', () => {
  it('toggles mute and camera in the waiting room', async () => {
    const r = await render(<WaitingRoomScreen />)
    await press(r.root, 'Mute')
    await press(r.root, 'Camera')
    expect(useCall.getState()).toMatchObject({ muted: true, cameraOff: true })
  })

  it('starts a real call from the waiting room', async () => {
    const r = await render(<WaitingRoomScreen />)
    await press(r.root, 'Enter Consultation')
    expect(useCall.getState().startedAt).toEqual(expect.any(Number))
    expect(nav.navigate).toHaveBeenCalledWith('video-call', { replace: true })
  })

  it('ends a call through to the completion screen with duration', async () => {
    useCall.getState().beginWaiting('a1')
    useCall.setState({ startedAt: Date.now() - 65_000 })
    const r = await render(<VideoCallScreen />)
    expect(textOf(r.root)).toContain('01:05')
    await press(r.root, 'End call')
    expect(nav.navigate).toHaveBeenCalledWith('consult-complete', { replace: true })
    expect(useAppointments.getState().items.find((a) => a.id === 'a1')?.status).toBe('completed')

    const done = await render(<ConsultCompleteScreen />)
    expect(textOf(done.root)).toContain('Duration 1 min 05 sec')
    await press(done.root, 'Listened well')
    await type(done.root, 'Add a note about your experience (optional)', 'Clear advice')
    await press(done.root, '3 stars')
    await press(done.root, 'Submit Feedback')
    expect(useAppointments.getState().items.find((a) => a.id === 'a1')?.feedback).toEqual({
      rating: 3,
      tags: ['Explained clearly', 'On time', 'Listened well'],
      note: 'Clear advice',
    })
    expect(nav.resetTo).toHaveBeenCalledWith('home', 'home')
  })

  it('shows live speaker state', async () => {
    const r = await render(<VideoCallScreen />)
    await press(r.root, 'Speaker')
    expect(useCall.getState().speakerOn).toBe(false)
  })
})

describe('pharmacy', () => {
  it('updates totals live and removes at zero', async () => {
    const r = await render(<CartScreen />)
    expect(textOf(r.root)).toContain('₹245')
    await ReactTestRenderer.act(async () => {
      useCart.getState().setQty('m2', 2)
    })
    await flush()
    expect(textOf(r.root)).toContain('₹516') // 327 + 189
    expect(textOf(r.root)).toContain('₹387') // 25% off 516
    await ReactTestRenderer.act(async () => {
      useCart.getState().setQty('m2', 0)
    })
    await flush()
    expect(textOf(r.root)).not.toContain('Rosuvas')
  })

  it('shows the empty cart state', async () => {
    useCart.getState().clear()
    const r = await render(<CartScreen />)
    expect(textOf(r.root)).toContain('Your cart is empty')
  })

  it('searches and adds from the list', async () => {
    nav.params = { q: '' }
    const r = await render(<MedicineSearchScreen />)
    await press(r.root, 'Over the counter')
    expect(textOf(r.root)).not.toContain('Telma 40 Tablet')
    await press(r.root, 'Add')
    expect(useCart.getState().lines.some((l) => l.medicineId === 'm4')).toBe(true)
    await type(r.root, 'Search medicines', 'xyz')
    expect(textOf(r.root)).toContain('No matches found')
  })

  it('adds the chosen quantity from the detail page', async () => {
    nav.params = { id: 'm6' }
    const r = await render(<MedicineDetailScreen />)
    expect(textOf(r.root)).toContain('Shelcal 500 Tablet')
    await press(r.root, 'Add to cart')
    expect(useCart.getState().lines.find((l) => l.medicineId === 'm6')?.qty).toBe(1)
    expect(nav.navigate).toHaveBeenCalledWith('cart')
  })

  it('blocks checkout when an Rx medicine has no prescription', async () => {
    useCart.setState({ lines: [{ medicineId: 'm5', qty: 1 }], prescription: null })
    const r = await render(<CartScreen />)
    expect(textOf(r.root)).toContain('Prescription required')
    await press(r.root, 'Proceed to checkout')
    expect(showToast).toHaveBeenCalledWith('Upload your prescription first', 'caution')
    expect(nav.navigate).not.toHaveBeenCalledWith('pharmacy-checkout')
  })

  it('selects address, slot and places a tracked order', async () => {
    const r = await render(<CheckoutScreen />)
    await press(r.root, 'Office')
    expect(useAddresses.getState().selectedId).toBe('ad2')
    await press(r.root, 'Tomorrow')
    await press(r.root, 'Place order · ₹245')
    expect(useCheckout.getState().intent).toMatchObject({ kind: 'pharmacy', slot: 'Tomorrow, 9–12 PM' })
    await render(<PaymentProcessingScreen />)
    await flush()
    const placed = useOrders.getState().pharmacy[0]
    expect(placed.id).toMatch(/^KDC-PH-/)
    expect(nav.finishTo).toHaveBeenCalledWith('order-tracking', { id: placed.id })
    expect(useCart.getState().lines).toHaveLength(0)
    nav.params = { id: placed.id }
    const tracking = await render(<OrderTrackingScreen />)
    expect(textOf(tracking.root)).toContain(placed.id)
    expect(textOf(tracking.root)).toContain('Step 1 of 5')
  })

  it('removes an uploaded document and uploads a new one', async () => {
    const pickFromGallery = jest.spyOn(services.documents, 'pickFromGallery').mockResolvedValue({
      status: 'picked',
      file: { name: 'rx.jpg', size: '1 MB', kind: 'image', uri: 'file:///rx.jpg' },
    })
    const r = await render(<UploadScreen />)
    await press(r.root, 'Remove')
    expect(useUploads.getState().items).toHaveLength(0)
    await press(r.root, 'Choose from gallery')
    await flush()
    expect(useUploads.getState().items[0]).toMatchObject({ name: 'rx.jpg', status: 'done' })
    await press(r.root, 'Continue')
    expect(useCart.getState().prescription).toMatchObject({ source: 'upload', label: 'rx.jpg' })
    pickFromGallery.mockRestore()
  })

  it('handles a cancelled picker quietly and a denied one with feedback', async () => {
    const pick = jest.spyOn(services.documents, 'pickFromCamera').mockResolvedValueOnce({ status: 'cancelled' })
    const r = await render(<UploadScreen />)
    await press(r.root, 'Take a photo')
    expect(showToast).not.toHaveBeenCalled()
    pick.mockResolvedValueOnce({ status: 'denied' })
    await press(r.root, 'Take a photo')
    expect(showToast).toHaveBeenCalledWith('Allow camera and photo access in Settings', 'caution')
    pick.mockRestore()
  })
})

describe('diagnostics', () => {
  it('searches tests and books the chosen test', async () => {
    nav.params = { q: '' }
    const r = await render(<TestSearchScreen />)
    await type(r.root, 'Search tests', 'thyroid')
    expect(textOf(r.root)).toContain('Thyroid Profile')
    await press(r.root, 'Book test')
    expect(useDiagnosticsDraft.getState().testId).toBe('t4')
  })

  it('prices labs for the chosen test and sorts them', async () => {
    useDiagnosticsDraft.getState().setTest('t2')
    const r = await render(<LabSelectScreen />)
    expect(textOf(r.root)).toContain('₹699')
    await press(r.root, 'Lowest price')
    await press(r.root, 'Thyrocare')
    expect(useDiagnosticsDraft.getState().labId).toBe('l4')
  })

  it('chooses a slot and pays, creating a tracked booking', async () => {
    useDiagnosticsDraft.getState().setTest('t2')
    const slot = await render(<DiagnosticSlotScreen />)
    await press(slot.root, '6:30 AM')
    expect(useDiagnosticsDraft.getState().time).toBe('6:30 AM')
    nav.from = 'diagnostics'
    const pay = await render(<PaymentScreen />)
    await press(pay.root, 'Pay ₹524')
    expect(useCheckout.getState().intent).toMatchObject({ kind: 'diagnostic', testId: 't2', time: '6:30 AM' })
    await render(<PaymentProcessingScreen />)
    await flush()
    expect(nav.finishTo).toHaveBeenCalledWith('diagnostic-confirm', undefined)
    const confirm = await render(<DiagnosticConfirmScreen />)
    expect(textOf(confirm.root)).toContain('Lipid Profile — Complete')
    expect(textOf(confirm.root)).toContain('6:30 AM – 7:30 AM')
  })

  it('shows the cheapest lab on the test page', async () => {
    nav.params = { id: 't2' }
    const r = await render(<TestDetailScreen />)
    expect(textOf(r.root)).toContain('₹611')
  })
})

describe('records and profile', () => {
  it('validates and adds a family member', async () => {
    const r = await render(<AddFamilyScreen />)
    await press(r.root, 'Add member')
    expect(textOf(r.root)).toContain('Enter the full name')
    expect(useFamily.getState().members).toHaveLength(5)

    await type(r.root, 'As per government ID', 'Anaya Sharma')
    useFamily.getState()
    await press(r.root, 'Add member')
    expect(textOf(r.root)).toContain('Select a date of birth')
  })

  it('opens a member for editing', async () => {
    nav.params = { id: 'f2' }
    const r = await render(<AddFamilyScreen />)
    const input = r.root.findAllByType(TextInput)[0]
    expect(input.props.value).toBe('Priya Sharma')
    await press(r.root, 'Save changes')
    expect(nav.navigate).toHaveBeenCalledWith('family', { replace: true })
  })

  it('filters the timeline', async () => {
    const r = await render(<TimelineScreen />)
    await press(r.root, 'Pharmacy')
    expect(textOf(r.root)).toContain('Medicines delivered')
    expect(textOf(r.root)).not.toContain('Prescription issued')
  })

  it('validates and saves a new address', async () => {
    const r = await render(<AddressesScreen />)
    await press(r.root, 'Add a new address')
    await press(r.root, 'Add address')
    expect(textOf(r.root)).toContain('Enter the flat, building and street')
    await type(r.root, 'Flat 402, Lotus Residency', 'Flat 9, Rose Apartments')
    await type(r.root, 'Banjara Hills, Hyderabad', 'Kondapur, Hyderabad')
    await type(r.root, '500034', '500084')
    await type(r.root, '98490 42187', '9849042187')
    await press(r.root, 'Add address')
    expect(useAddresses.getState().items.at(-1)).toMatchObject({ line: 'Flat 9, Rose Apartments', area: 'Kondapur, Hyderabad – 500084' })
  })

  it('edits an address from its card', async () => {
    const r = await render(<AddressesScreen />)
    const edit = r.root.findAll((n) => n.props.onPress && textOf(n) === 'Edit')[0]
    await ReactTestRenderer.act(async () => edit.props.onPress({ stopPropagation: () => {} }))
    await flush()
    expect(textOf(r.root)).toContain('Edit address')
  })

  it('marks one and all notifications read', async () => {
    const r = await render(<NotificationsScreen />)
    expect(useNotifications.getState().readIds).toEqual([])
    await press(r.root, 'Mark all read')
    expect(textOf(r.root)).toContain('All read')
    expect(useNotifications.getState().readIds.length).toBe(7)
  })

  it('filters notifications by category', async () => {
    const r = await render(<NotificationsScreen />)
    await press(r.root, 'Pharmacy')
    expect(textOf(r.root)).toContain('Order out for delivery')
    expect(textOf(r.root)).not.toContain('Lab report ready')
  })

  it('persists settings toggles and logs out with confirmation', async () => {
    useSession.getState().signIn('tok', '9849042187')
    const r = await render(<SettingsScreen />)
    const toggles = allPressables(r.root).filter((p) => (p.props.className ?? '').includes('w-[51px]'))
    await ReactTestRenderer.act(async () => toggles[3].props.onPress())
    expect(useSettings.getState().toggles.offers).toBe(true)
    await press(r.root, 'Log out')
    expect(useSession.getState().token).toBe('tok')
    const confirm = allPressables(r.root).filter((p) => textOf(p).trim() === 'Log out').at(-1)!
    await ReactTestRenderer.act(async () => confirm.props.onPress())
    expect(useSession.getState().token).toBeNull()
    expect(nav.resetTo).toHaveBeenCalledWith('login')
  })

  it('searches help', async () => {
    const r = await render(<HelpScreen />)
    await type(r.root, 'Describe your issue', 'refund')
    await flush()
    const text = textOf(r.root)
    expect(text).toContain('Payments & Refunds')
    expect(text).not.toContain('Video Consultation')
    await type(r.root, 'Describe your issue', 'zzzz')
    await flush()
    expect(textOf(r.root)).toContain('No articles found')
  })

  it('shows profile changes on Home', async () => {
    useProfile.getState().setProfile({ ...useProfile.getState().profile, name: 'Riya Rao' })
    const r = await render(<HomeScreen />)
    expect(textOf(r.root)).toContain('Riya Rao')
  })
})

describe('membership', () => {
  it('carries the picked plan through checkout and activates it', async () => {
    const r = await render(<MembershipScreen />)
    await press(r.root, '6 months')
    expect(textOf(r.root)).toContain('15% off')
    await press(r.root, 'Continue')
    const co = await render(<MembershipCheckoutScreen />)
    expect(textOf(co.root)).toContain('KDC+ Plus · 6 months')
    await press(co.root, 'Pay ₹1,769')
    await render(<PaymentProcessingScreen />)
    await flush()
    expect(useMembership.getState()).toMatchObject({ planId: 'half', status: 'active' })
    expect(nav.finishTo).toHaveBeenCalledWith('membership-success', undefined)
  })

  it('applies the member rate across services once active', async () => {
    useMembership.setState({ status: 'none' })
    const before = await render(<CartScreen />)
    expect(textOf(before.root)).toContain('₹327')
    await useMembership.getState().activate('quarter')
    const after = await render(<CartScreen />)
    expect(textOf(after.root)).toContain('₹294') // 327 at 10% off
  })

  it('turns off auto-renew and can end the membership', async () => {
    const r = await render(<MembershipManageScreen />)
    await press(r.root, 'Turn off auto-renew')
    expect(textOf(r.root)).toContain('Your member rate continues')
    await press(r.root, 'End membership now')
    expect(useMembership.getState().status).toBe('expired')
    expect(nav.navigate).toHaveBeenCalledWith('st-membership-expired', { replace: true })
  })
})
