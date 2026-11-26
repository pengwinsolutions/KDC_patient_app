/* Models shared by the service layer, the stores and the screens. */

export type ConsultMode = 'video' | 'audio' | 'clinic'
export type BenefitArea = 'consultations' | 'pharmacy' | 'diagnostics'
export type Gender = 'Male' | 'Female' | 'Other'

/* ----------------------------------------------------------------- Patient */

export interface Profile {
  id: string
  /** Live: the patient code (KDC-P-…) shown on the profile. */
  code?: string
  name: string
  firstName: string
  mobile: string
  mobileMasked: string
  email: string
  /** Display form, e.g. "14 Mar 1991". */
  dob: string
  age: number
  gender: string
  bloodGroup: string
  photo?: string
  city: string
}

export interface FamilyMember {
  id: string
  name: string
  relation: string
  age: number
  dob: string
  gender: string
  blood: string
  photo?: string
  primary?: boolean
  records: number
  mobile?: string
}

export interface MedicalInfo {
  bloodGroup: string
  allergies: string[]
  conditions: string[]
  medications: string[]
  surgeries: string[]
  emergency: { name: string; relation: string; mobile: string }
  height: string
  weight: string
}

export interface Address {
  id: string
  label: 'Home' | 'Office' | 'Other'
  line: string
  area: string
  phone: string
  isDefault: boolean
}

/* ----------------------------------------------------------------- Doctors */

export interface DoctorDetail {
  credentials: { title: string; org: string; years: string }[]
  areas: string[]
}

export interface Doctor extends DoctorDetail {
  id: string
  name: string
  qualification: string
  specialty: string
  experience: number
  rating: number
  reviews: number
  languages: string[]
  hospital: string
  locality: string
  distanceKm: number
  photo: string
  fees: Record<ConsultMode, number>
  nextSlot: string
  availableToday: boolean
  gender: 'Male' | 'Female'
  regNo: string
  about: string
  consults: number
  recommendPct: number
  /** Live: the consultation types offered (a mode not offered has fee 0). */
  modes?: ConsultMode[]
  /** Live: the registering medical council. */
  council?: string
  /** Live: the doctor's clinic, for in-person visits. */
  clinicAddress?: string
  onLeave?: boolean
  /** Live: the directory's specialty slug. */
  specialtySlug?: string
}

export interface Review {
  id: string
  name: string
  rating: number
  when: string
  mode: string
  text: string
}

export interface Specialty {
  id: string
  name: string
  count: number
  icon: string
}

export interface Clinic {
  id: string
  name: string
  address: string
  distanceKm: number
  slots: number
  photo: string
  timing: string
}

/* ------------------------------------------------------------ Appointments */

export interface AppointmentFeedback {
  rating: number
  tags: string[]
  note: string
}

export interface Appointment {
  id: string
  bookingId: string
  doctorId: string
  mode: ConsultMode
  date: string
  /** Sortable date, kept beside the display string. */
  dateIso: string
  time: string
  status: 'confirmed' | 'completed' | 'cancelled' | 'in-progress'
  fee: number
  platformFee: number
  discount: number
  discountLabel?: string
  location?: string
  for: string
  paidVia?: string
  reason?: string
  cancelledOn?: string
  feedback?: AppointmentFeedback
  /** Live: what the server allows now, and the linked records. */
  memberId?: string
  startsAt?: string
  paymentStatus?: string
  refundAmount?: number
  lateFee?: number
  lateMinutes?: number
  canCancel?: boolean
  canReschedule?: boolean
  canGiveFeedback?: boolean
  prescriptionCode?: string
}

/* ------------------------------------------------------------ Prescription */

export interface PrescribedMedicine {
  name: string
  generic: string
  dosage: string
  frequency: string
  duration: string
  note: string
  /** Live: the pharmacy catalogue entry the doctor picked, if any. */
  medicineId?: number
}

export interface PrescriptionDoc {
  id: string
  doctorId: string
  date: string
  time: string
  patient: { name: string; age: number; gender: string; id: string }
  vitals: { bp: string; pulse: string; weight: string; spo2: string }
  diagnosis: string[]
  medicines: PrescribedMedicine[]
  advice: string[]
  investigations: string[]
  followUp: string
}

export interface PrescriptionSummary {
  id: string
  doctorId: string
  date: string
  specialty: string
  items: number
  status: 'active' | 'completed'
  rxId: string
  /** Live: the consultation it was issued in, and the medicine names (for search). */
  appointmentId?: string
  medicineNames?: string[]
}

/* ---------------------------------------------------------------- Pharmacy */

export interface Medicine {
  id: string
  name: string
  generic: string
  brand: string
  pack: string
  mrp: number
  price: number
  rx: boolean
  inStock: boolean
  photo: string
  category: string
}

export interface MedicineDetail {
  about: string
  sideEffects: string[]
}

export interface PharmacyCategory {
  id: string
  name: string
  items: number
}

export interface CartLine {
  medicineId: string
  qty: number
  /** A first-launch line; list screens keep their Add button until it is touched. */
  seeded?: boolean
}

export type CartPrescription =
  | { source: 'kdc'; label: string; /** Live: the KDC+ prescription's code. */ code?: string }
  | { source: 'upload'; label: string; uploadId: string }

export interface PharmacyOrder {
  id: string
  kind: 'pharmacy'
  /** Epoch ms; 0 for catalogue orders whose stage never advances. */
  placedAt: number
  placed: string
  eta: string
  etaWhen: string
  /** Live lines carry the name and price charged, since the medicine may not be in the loaded catalogue. */
  lines: { medicineId: string; qty: number; name?: string; price?: number }[]
  amount: number
  /** The blueprint quotes this figure on the tracking screen only. */
  trackedTotal?: number
  address: string
  partner: string
  rider: { name: string; mobile: string }
  /** Live: the server's status label ("Packed at pharmacy"), and whether it was cancelled or returned. */
  statusLabel?: string
  cancelled?: boolean
  rxRequired?: boolean
  /** Live: what's still owed (an online order whose payment hasn't completed). */
  paymentRequired?: boolean
  fixedStage?: number
  stageTimes?: string[]
  payment: string
  /** Live: the server's status (`out_for_delivery`, `delivery_failed`, `returned`…). */
  status?: string
  /** Live: the 4-digit code to give the rider, only while out for delivery (and not locked). */
  deliveryOtp?: string | null
  /** Live: out for delivery, but the code was locked after too many wrong tries. */
  deliveryCodeLocked?: boolean
  /** Live (tracking): each time the order went out, oldest first. */
  deliveryAttempts?: DeliveryAttempt[]
  /** Live: why it was cancelled or returned ("Returned to store: nobody was home"). */
  cancelReason?: string
  /** Live: refunded on a cancel or return (0 for cash on delivery). */
  refundAmount?: number
}

/** One trip out with a medicine order; `reason` is the server's words for a failed one. */
export interface DeliveryAttempt {
  attempt: number
  outAt: string | null
  outcome: 'out' | 'delivered' | 'failed' | string
  reason: string | null
  endedAt: string | null
}

/* ------------------------------------------------------------- Diagnostics */

export interface LabTest {
  id: string
  name: string
  short: string
  parameters: number
  price: number
  mrp: number
  fasting: string
  reportIn: string
  homeCollection: boolean
  category: string
  description: string
  prep: string[]
}

export interface TestDetail {
  covers: string[]
  audience: string[]
}

export interface TestCategory {
  id: string
  name: string
  tests: number
}

export interface Lab {
  id: string
  name: string
  rating: number
  reviews: number
  distanceKm: number
  price: number
  homeCollection: boolean
  nabl: boolean
  slots: number
  photo: string
  locality: string
  /** Live: this lab's price for each test code loaded so far (GET /public/labs?tests=). */
  testPrices?: Record<string, number>
  reportHours?: number
}

export type CollectionMethod = 'Home Collection' | 'Lab Visit'

export interface DiagnosticOrder {
  id: string
  kind: 'diagnostics'
  placedAt: number
  testId: string
  labId: string
  method: CollectionMethod
  date: string
  slot: string
  slotCompact: string
  address: string
  technician: { name: string; id: string; mobile: string }
  /** Live: the booking's tests and lab, as booked (the catalogue may not have them loaded). */
  title?: string
  testNames?: string[]
  labName?: string
  statusLabel?: string
  canCancel?: boolean
  /** Live: the code the patient reads out to the technician at the door. */
  collectionCode?: string
  /** Live: the lab report codes for this booking, once issued. */
  reportCodes?: string[]
  /** Live: paid online, or in cash to the technician / at the lab. */
  paymentType?: 'online' | 'cash'
  paymentRequired?: boolean
  amount: number
  /** Price before the member rate, present once an order is actually billed. */
  listed?: number
  fixedStage?: number
  stageTimes?: string[]
  status: 'active' | 'cancelled'
  reportedWhen?: string
}

export type Order = PharmacyOrder | DiagnosticOrder

export interface PatientReport {
  id: string
  name: string
  kind: 'blood' | 'imaging'
  lab: string
  date: string
  month: string
  status: 'ready' | 'processing'
  flagged: number
  pages: number
}

/* ----------------------------------------------------------------- Records */

export interface TimelineEvent {
  id: string
  type: 'consultation' | 'prescription' | 'pharmacy' | 'lab' | 'report' | 'followup'
  title: string
  meta: string
  date: string
  time: string
  /** Live: the code of what it's about (appointment, prescription, report, order, lab booking). */
  ref?: string
}

export interface UploadedDocument {
  id: string
  name: string
  size: string
  uri?: string
  kind: 'image' | 'pdf'
  progress: number
  status: 'uploading' | 'done' | 'failed'
  /** Live: the uploaded file's id on the server (sent with the order as a prescription). */
  fileId?: number
}

/* ---------------------------------------------------------------- Payments */

export interface PaymentMethod {
  id: string
  /** `online`: live builds, Razorpay Checkout (the patient picks UPI, card, net banking or a wallet there). */
  kind: 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod' | 'online'
  /** Live: the server's default saved method. */
  isDefault?: boolean
  label: string
  sub: string
  brand: string
}

export interface PaymentRecord {
  id: string
  type: 'Consultation' | 'Pharmacy' | 'Diagnostics' | 'Membership'
  title: string
  date: string
  amount: number
  status: 'paid' | 'refunded' | 'failed'
  method: string
  ref: string
  /** Live: partly refunded amounts and the invoice for the payment. */
  refundedAmount?: number
  invoiceNumber?: string | null
}

/* -------------------------------------------------------------- Membership */

export interface Plan {
  id: string
  name: string
  price: number
  /** Billed period in months — drives the per-month figure shown on the card. */
  months: number
  discount: number
  tag?: string
  best?: boolean
  /** Live: the server's GST and total for the plan. */
  gst?: number
  total?: number
}

export interface SavingsEntry {
  id: string
  area: BenefitArea
  label: string
  date: string
  listed: number
  saved: number
}

export interface MembershipRecord {
  status: 'active' | 'expired' | 'none'
  planId: string
  since: string
  renews: string
  daysLeft: number
  autoRenew: boolean
  ledger: SavingsEntry[]
}

/* ----------------------------------------------------------- Notifications */

export type NotificationCategory =
  | 'Appointments'
  | 'Prescriptions'
  | 'Diagnostics'
  | 'Pharmacy'
  | 'Payments'
  | 'System'

export interface NotificationItem {
  id: string
  group: 'Today' | 'Yesterday' | 'This week' | 'Earlier'
  category: NotificationCategory
  title: string
  body: string
  time: string
  unread: boolean
  action?: string
  /** Live: what it opens (the server's `data`): a booking, order, report… by its code. */
  target?: { type: string; code: string | null }
}

export interface HelpTopic {
  id: string
  title: string
  body: string
  articles: number
}

export interface HelpQuestion {
  id: string
  question: string
  answer: string
}
