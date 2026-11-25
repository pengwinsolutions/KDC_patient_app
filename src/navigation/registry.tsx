import * as Onb from '../screens/onboarding'
import * as Med from '../screens/medical'
import { HomeScreen } from '../screens/home'
import * as Doc from '../screens/doctors'
import * as Book from '../screens/booking'
import * as Appt from '../screens/appointments'
import * as Call from '../screens/consultation'
import * as Rx from '../screens/prescription'
import * as Pharm from '../screens/pharmacy'
import * as Diag from '../screens/diagnostics'
import * as Rec from '../screens/records'
import * as Prof from '../screens/profile'
import * as Ord from '../screens/orders'
import * as States from '../screens/states'
import * as Mem from '../screens/membership'

import type { ScreenDef, Section, Flow } from './types'
export type { ScreenDef, Section, StatusTone } from './types'

export const SECTIONS: Section[] = [
  { id: 'onboarding', title: 'Splash & Onboarding', blurb: 'First launch, product promise and the privacy commitment.' },
  { id: 'auth', title: 'Authentication', blurb: 'Mobile-first sign-in with OTP and profile completion.' },
  { id: 'home', title: 'Home', blurb: 'The daily surface — care actions, next appointment and health activity.' },
  { id: 'discovery', title: 'Doctor Discovery', blurb: 'Search, filter, compare and evaluate specialists.' },
  { id: 'booking', title: 'Consultation Booking', blurb: 'Mode, date, slot, summary, payment and confirmation.' },
  { id: 'appointments', title: 'Appointments', blurb: 'Managing what is booked, completed and cancelled.' },
  { id: 'consult', title: 'Consultation', blurb: 'Waiting room, video, audio and consultation close-out.' },
  { id: 'prescription', title: 'Prescription', blurb: 'The digital prescription document and its history.' },
  { id: 'pharmacy', title: 'Pharmacy', blurb: 'Medicine discovery, prescription upload, cart and delivery.' },
  { id: 'diagnostics', title: 'Diagnostics', blurb: 'Tests, labs, home collection, tracking and reports.' },
  { id: 'records', title: 'Medical Records & Family', blurb: 'The connected health record and family profiles.' },
  { id: 'membership', title: 'KDC+ Plus Membership', blurb: 'The paid tier: one rate off consultations, pharmacy and diagnostics.' },
  { id: 'profile', title: 'Profile & Settings', blurb: 'Account, medical information, addresses, payments and support.' },
  { id: 'states', title: 'UI States', blurb: 'Loading, empty, error and clinical exception states.' },
]

export const SCREENS: ScreenDef[] = [
  /* --------------------------------------------------------- Onboarding */
  { id: 'splash', code: '01', title: 'Splash', section: 'onboarding', Component: Onb.SplashScreen, note: 'Logo lockup with the ECG motif drawn in over 2.4s.' },
  { id: 'onboarding-1', code: '02', title: 'Healthcare', section: 'onboarding', Component: Onb.Onboarding1, note: 'Access promise, anchored by real clinical photography.' },
  { id: 'onboarding-2', code: '03', title: 'Consultations', section: 'onboarding', Component: Onb.Onboarding2, note: 'The three consultation formats introduced once, up front.' },

  /* ------------------------------------------------------------- Auth */
  { id: 'login', code: '06', title: 'Login', section: 'auth', Component: Onb.LoginScreen, note: 'Mobile-first entry with Google and Apple as secondary paths.' },
  { id: 'otp', code: '07', title: 'OTP Verification', section: 'auth', Component: Onb.OtpScreen, note: 'Six-digit entry, resend timer and an anti-fraud notice.' },
  { id: 'profile-setup', code: '08', title: 'Profile Setup', section: 'auth', Component: Onb.ProfileSetupScreen, note: 'Clinical identity captured once, with explicit consent.' },

  /* -------------------------------------------------------------- Home */
  { id: 'home', code: '09', title: 'Patient Home', section: 'home', Component: HomeScreen, note: 'Care-first dashboard: act, attend, then review.' },

  /* --------------------------------------------------------- Discovery */
  { id: 'doctor-search', code: '10', title: 'Doctor Search', section: 'discovery', Component: Doc.DoctorSearchScreen, note: 'Specialty-led entry with recent and trending searches.' },
  { id: 'doctor-filters', code: '10b', title: 'Filters', section: 'discovery', Component: Doc.FiltersSheetScreen, note: 'Eight filter dimensions in a single bottom sheet.' },
  { id: 'doctor-list', code: '11', title: 'Doctor Listing', section: 'discovery', Component: Doc.DoctorListScreen, note: 'Comparable cards — fees for all three modes always visible.' },
  { id: 'doctor-profile', code: '12', title: 'Doctor Profile', section: 'discovery', Component: Doc.DoctorProfileScreen, statusTone: 'light', note: 'Credentials first, sticky booking CTA always reachable.' },

  /* ----------------------------------------------------------- Booking */
  { id: 'consult-type', code: '13', title: 'Consultation Type', section: 'booking', Component: Book.ConsultTypeScreen, note: 'Mode chosen before time — it changes price and location.' },
  { id: 'select-date', code: '14', title: 'Date Selection', section: 'booking', Component: Book.DateScreen, note: 'Month grid with availability density marked per day.' },
  { id: 'select-slot', code: '15', title: 'Time Slot', section: 'booking', Component: Book.SlotScreen, note: 'Grouped by part of day; booked slots stay visible but struck.' },
  { id: 'clinic-location', code: '16', title: 'In-Person Location', section: 'booking', Component: Book.ClinicScreen, note: 'Map preview, distance and per-clinic slot availability.' },
  { id: 'summary', code: '17', title: 'Appointment Summary', section: 'booking', Component: Book.SummaryScreen, note: 'Full fee breakdown before any payment screen.' },
  { id: 'payment', code: '18', title: 'Payment', section: 'booking', Component: Book.PaymentScreen, note: 'UPI first, matching Indian payment behaviour.' },
  { id: 'booking-success', code: '19', title: 'Booking Success', section: 'booking', Component: Book.SuccessScreen, note: 'Confirmation with booking ID and calendar hand-off.' },

  /* ------------------------------------------------------ Appointments */
  { id: 'appointments', code: '20', title: 'Appointment List', section: 'appointments', Component: Appt.AppointmentListScreen, note: 'Upcoming, completed and cancelled as peer tabs.' },
  { id: 'appointment-detail', code: '21', title: 'Appointment Details', section: 'appointments', Component: Appt.AppointmentDetailScreen, note: 'Join, reschedule and cancel with payment transparency.' },

  /* --------------------------------------------------------- Consult */
  { id: 'waiting-room', code: '22', title: 'Waiting Room', section: 'consult', Component: Call.WaitingRoomScreen, note: 'Device readiness verified before the patient joins.' },
  { id: 'video-call', code: '23', title: 'Video Consultation', section: 'consult', Component: Call.VideoCallScreen, statusTone: 'light', indicatorTone: 'light', note: 'Clinical calm — controls recede, the doctor fills the frame.' },
  { id: 'audio-call', code: '24', title: 'Audio Consultation', section: 'consult', Component: Call.AudioCallScreen, statusTone: 'light', indicatorTone: 'light', note: 'Voice-only, with live connection quality.' },
  { id: 'consult-complete', code: '25', title: 'Consultation Completed', section: 'consult', Component: Call.ConsultCompleteScreen, note: 'Close-out: rating, feedback and the prescription hand-off.' },

  /* ---------------------------------------------------- Prescription */
  { id: 'prescription', code: '26', title: 'Prescription Detail', section: 'prescription', Component: Rx.PrescriptionScreen, note: 'A real prescription document, not a list of chips.' },
  { id: 'prescription-history', code: '27', title: 'Prescription History', section: 'prescription', Component: Rx.PrescriptionHistoryScreen, note: 'Chronological, with active courses surfaced first.' },

  /* -------------------------------------------------------- Pharmacy */
  { id: 'pharmacy', code: '28', title: 'Pharmacy Home', section: 'pharmacy', Component: Pharm.PharmacyHomeScreen, note: 'Prescription upload given equal weight to browsing.' },
  { id: 'medicine-search', code: '29', title: 'Medicine Search', section: 'pharmacy', Component: Pharm.MedicineSearchScreen, note: 'Generic name shown alongside brand on every result.' },
  { id: 'medicine-detail', code: '30', title: 'Medicine Detail', section: 'pharmacy', Component: Pharm.MedicineDetailScreen, note: 'Composition, safety advice and substitutes.' },
  { id: 'rx-upload', code: '31', title: 'Prescription Upload', section: 'pharmacy', Component: Pharm.UploadScreen, note: 'Camera, gallery, PDF or a prescription already in KDC+.' },
  { id: 'cart', code: '32', title: 'Cart', section: 'pharmacy', Component: Pharm.CartScreen, note: 'Rx validation state made explicit before checkout.' },
  { id: 'pharmacy-checkout', code: '33', title: 'Pharmacy Checkout', section: 'pharmacy', Component: Pharm.CheckoutScreen, note: 'Address, slot and payment on one reviewable screen.' },
  { id: 'orders-home', code: '34a', title: 'Orders', section: 'pharmacy', Component: Ord.OrdersScreen, note: 'The Orders tab hub — medicine orders and lab bookings in one list.' },
  { id: 'order-tracking', code: '34', title: 'Order Tracking', section: 'pharmacy', Component: Pharm.OrderTrackingScreen, note: 'Four-stage timeline with live rider detail.' },

  /* ----------------------------------------------------- Diagnostics */
  { id: 'diagnostics', code: '35', title: 'Diagnostics Home', section: 'diagnostics', Component: Diag.DiagnosticsHomeScreen, note: 'Packages and organ-system categories, priced up front.' },
  { id: 'test-search', code: '36', title: 'Test Search', section: 'diagnostics', Component: Diag.TestSearchScreen, note: 'Parameter counts and fasting rules on every result.' },
  { id: 'test-detail', code: '37', title: 'Test Detail', section: 'diagnostics', Component: Diag.TestDetailScreen, note: 'Preparation instructions treated as primary content.' },
  { id: 'lab-select', code: '38', title: 'Lab Selection', section: 'diagnostics', Component: Diag.LabSelectScreen, note: 'NABL accreditation, distance and price compared side by side.' },
  { id: 'collection-method', code: '39', title: 'Collection Method', section: 'diagnostics', Component: Diag.CollectionMethodScreen, note: 'Home collection versus lab visit, with the trade-offs stated.' },
  { id: 'diagnostic-slot', code: '40', title: 'Diagnostic Slot', section: 'diagnostics', Component: Diag.DiagnosticSlotScreen, note: 'Early-morning slots prioritised for fasting tests.' },
  { id: 'diagnostic-confirm', code: '41', title: 'Booking Confirmation', section: 'diagnostics', Component: Diag.DiagnosticConfirmScreen, note: 'Preparation reminder repeated at the point of confirmation.' },
  { id: 'diagnostic-tracking', code: '42', title: 'Diagnostic Tracking', section: 'diagnostics', Component: Diag.DiagnosticTrackingScreen, note: 'Five-stage timeline from booking to report.' },
  { id: 'lab-reports', code: '43a', title: 'Lab Reports', section: 'diagnostics', Component: Diag.LabReportsScreen, note: 'The collection behind the Lab Reports tile — pick a report, then read it.' },
  { id: 'lab-report', code: '43', title: 'Lab Report', section: 'diagnostics', Component: Diag.LabReportScreen, note: 'Flagged values first; ranges shown as a visual scale.' },

  /* --------------------------------------------------------- Records */
  { id: 'records', code: '44', title: 'Medical Records', section: 'records', Component: Rec.RecordsScreen, note: 'Four record classes, one vault.' },
  { id: 'health-timeline', code: '45', title: 'Health Timeline', section: 'records', Component: Rec.TimelineScreen, note: 'Every care event in one chronological thread.' },
  { id: 'family', code: '46', title: 'Family Members', section: 'records', Component: Rec.FamilyScreen, note: 'Household care managed from one account.' },
  { id: 'add-family', code: '47', title: 'Add Family Member', section: 'records', Component: Rec.AddFamilyScreen, note: 'Relationship-aware form with clinical basics.' },

  /* ------------------------------------------------------ Membership */
  { id: 'membership', code: '55', title: 'KDC+ Plus', section: 'membership', Component: Mem.MembershipScreen, statusTone: 'light', note: 'The offer — one percentage off everything KDC+ bills for.' },
  { id: 'membership-checkout', code: '56', title: 'Confirm Membership', section: 'membership', Component: Mem.MembershipCheckoutScreen, note: 'Plan, tax and the promise that the rate applies immediately.' },
  { id: 'membership-success', code: '57', title: 'Membership Active', section: 'membership', Component: Mem.MembershipSuccessScreen, statusTone: 'light', indicatorTone: 'light', note: 'Confirmation that prices have already changed.' },
  { id: 'membership-manage', code: '58', title: 'Manage Membership', section: 'membership', Component: Mem.MembershipManageScreen, statusTone: 'light', note: 'What it has saved, and when it renews.' },
  { id: 'membership-savings', code: '59', title: 'Savings History', section: 'membership', Component: Mem.MembershipSavingsScreen, statusTone: 'light', note: 'Every bill the membership reduced, with the arithmetic shown.' },

  /* --------------------------------------------------------- Profile */
  { id: 'notifications', code: '48', title: 'Notifications', section: 'profile', Component: Prof.NotificationsScreen, note: 'Grouped by recency, filterable by care category.' },
  { id: 'profile', code: '49', title: 'Patient Profile', section: 'profile', Component: Prof.ProfileScreen, note: 'Identity, then care, then account.' },
  { id: 'medical-info', code: '50', title: 'Medical Information', section: 'profile', Component: Med.MedicalInfoScreen, note: 'Allergies raised to critical styling.' },
  { id: 'medical-info-edit', code: '50b', title: 'Edit Medical Information', section: 'profile', Component: Med.MedicalInfoEditScreen, note: 'Allergies get the critical treatment even while editing.' },
  { id: 'addresses', code: '51', title: 'Saved Addresses', section: 'profile', Component: Prof.AddressesScreen, note: 'Used by pharmacy delivery and home sample collection.' },
  { id: 'payments', code: '52', title: 'Payment History', section: 'profile', Component: Prof.PaymentsScreen, note: 'All three revenue streams in one ledger.' },
  { id: 'help', code: '53', title: 'Help & Support', section: 'profile', Component: Prof.HelpScreen, note: 'Self-serve topics first, human contact always visible.' },
  { id: 'settings', code: '54', title: 'Settings', section: 'profile', Component: Prof.SettingsScreen, note: 'Account, privacy, security and legal.' },

  /* ------------------------------------------------------- UI states */
  { id: 'st-loading', code: 'S01', title: 'Loading', section: 'states', Component: States.LoadingScreen, note: 'Branded wait, used over 400ms.' },
  { id: 'st-skeleton', code: 'S02', title: 'Skeleton Loading', section: 'states', Component: States.SkeletonScreen, note: 'Layout-accurate placeholders, no spinners in lists.' },
  { id: 'st-empty-appointments', code: 'S03', title: 'Empty Appointments', section: 'states', Component: States.EmptyAppointmentsScreen },
  { id: 'st-empty-prescriptions', code: 'S04', title: 'Empty Prescriptions', section: 'states', Component: States.EmptyPrescriptionsScreen },
  { id: 'st-empty-cart', code: 'S05', title: 'Empty Cart', section: 'states', Component: States.EmptyCartScreen },
  { id: 'st-empty-diagnostics', code: 'S06', title: 'Empty Diagnostics', section: 'states', Component: States.EmptyDiagnosticsScreen },
  { id: 'st-api-error', code: 'S07', title: 'API Error', section: 'states', Component: States.ApiErrorScreen, note: 'Honest, specific, and never blames the patient.' },
  { id: 'st-offline', code: 'S08', title: 'No Internet', section: 'states', Component: States.OfflineScreen },
  { id: 'st-payment-failed', code: 'S09', title: 'Payment Failed', section: 'states', Component: States.PaymentFailedScreen, note: 'States clearly that the slot is held and money is safe.' },
  { id: 'st-payment-processing', code: 'S10', title: 'Payment Processing', section: 'states', Component: States.PaymentProcessingScreen },
  { id: 'st-cancelled', code: 'S11', title: 'Appointment Cancelled', section: 'states', Component: States.CancelledScreen },
  { id: 'st-doctor-unavailable', code: 'S12', title: 'Doctor Unavailable', section: 'states', Component: States.DoctorUnavailableScreen },
  { id: 'st-doctor-late', code: 'S13', title: 'Doctor Running Late', section: 'states', Component: States.DoctorLateScreen, note: 'Transparency beats a spinner — give a real number.' },
  { id: 'st-video-lost', code: 'S14', title: 'Video Connection Lost', section: 'states', Component: States.VideoLostScreen, statusTone: 'light', indicatorTone: 'light' },
  { id: 'st-audio-lost', code: 'S15', title: 'Audio Connection Lost', section: 'states', Component: States.AudioLostScreen, statusTone: 'light', indicatorTone: 'light' },
  { id: 'st-report-pending', code: 'S16', title: 'Lab Report Pending', section: 'states', Component: States.ReportPendingScreen },
  { id: 'st-order-delayed', code: 'S17', title: 'Order Delayed', section: 'states', Component: States.OrderDelayedScreen },
  { id: 'st-no-results', code: 'S18', title: 'No Search Results', section: 'states', Component: States.NoResultsScreen },
  { id: 'st-membership-expired', code: 'S19', title: 'Membership Expired', section: 'states', Component: Mem.MembershipExpiredScreen, note: 'Prices revert; the record of what was saved does not.' },
]

export const screenById = (id: string) => SCREENS.find((s) => s.id === id)

/** Screens reachable from the bottom navigation but defined elsewhere. */
export const ALIASES: Record<string, string> = {
  orders: 'orders-home',
}

export function resolve(id: string) {
  return screenById(ALIASES[id] ?? id) ?? SCREENS.find((s) => s.id === 'home')!
}

/* The two guided journeys used by the prototype's flow player. */
export const FLOWS: Flow[] = [
  {
    id: 'consult',
    title: 'Consultation journey',
    blurb: 'Sign-in through to ordering the prescribed medicines.',
    steps: [
      'splash', 'onboarding-1', 'onboarding-2', 'login', 'otp', 'profile-setup',
      'home', 'doctor-search', 'doctor-list', 'doctor-profile', 'consult-type', 'select-date', 'select-slot',
      'summary', 'payment', 'booking-success', 'appointment-detail', 'waiting-room', 'video-call',
      'consult-complete', 'prescription', 'cart', 'pharmacy-checkout', 'order-tracking',
    ],
  },
  {
    id: 'states',
    title: 'Exception states',
    blurb: 'Every loading, empty and error state, in the order a reviewer meets them.',
    steps: [
      'st-loading', 'st-skeleton', 'st-no-results', 'st-doctor-unavailable', 'st-doctor-late',
      'st-video-lost', 'st-audio-lost', 'st-payment-processing', 'st-payment-failed', 'st-cancelled',
      'st-empty-appointments', 'st-empty-prescriptions', 'st-empty-cart', 'st-empty-diagnostics',
      'st-report-pending', 'st-order-delayed', 'st-offline', 'st-api-error', 'st-membership-expired',
    ],
  },
  {
    id: 'membership',
    title: 'Membership journey',
    blurb: 'Taking the plan, then watching the member rate apply across all three services.',
    steps: [
      'home', 'membership', 'membership-checkout', 'membership-success', 'membership-manage',
      'membership-savings', 'doctor-profile', 'summary', 'payment', 'medicine-detail', 'cart',
      'pharmacy-checkout', 'test-detail', 'diagnostic-confirm',
    ],
  },
  {
    id: 'diagnostics',
    title: 'Diagnostics journey',
    blurb: 'From the home screen to a reportable result.',
    steps: [
      'home', 'diagnostics', 'test-search', 'test-detail', 'lab-select', 'collection-method',
      'diagnostic-slot', 'payment', 'diagnostic-confirm', 'diagnostic-tracking', 'lab-report',
    ],
  },
]
