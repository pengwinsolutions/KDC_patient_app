import { portrait, PORTRAIT_IDS, SCENE } from './media'

/**
 * Mock dataset for the KDC+ patient prototype.
 *
 * All names, registration numbers, phone numbers and identifiers are fictional
 * and generated for demonstration. No real patient data appears anywhere in
 * this project. Pricing, specialties, labs and medicine brands follow Indian
 * market conventions.
 */

import type {
  Address,
  Appointment,
  Clinic,
  Doctor,
  DoctorDetail,
  DiagnosticOrder,
  FamilyMember,
  HelpTopic,
  LabTest,
  Medicine,
  MedicalInfo,
  MedicineDetail,
  NotificationItem,
  PatientReport,
  PaymentMethod,
  PaymentRecord,
  PharmacyOrder,
  PharmacyCategory,
  PrescriptionDoc,
  PrescriptionSummary,
  Profile,
  Review,
  Specialty,
  TestCategory,
  TestDetail,
  TimelineEvent,
  Lab,
  CartLine,
  ConsultMode,
} from '../types'

export const rupee = (n: number) => `₹${n.toLocaleString('en-IN')}`

/* ------------------------------------------------------------------ Patient */

export const patient: Profile = {
  id: 'KDC-PT-4821905',
  name: 'Aarav Sharma',
  firstName: 'Aarav',
  mobile: '+91 98490 42187',
  mobileMasked: '+91 98490 •••• 87',
  email: 'aarav.sharma@gmail.com',
  dob: '14 Mar 1991',
  age: 34,
  gender: 'Male',
  bloodGroup: 'O+',
  photo: portrait(PORTRAIT_IDS.patientMale, 240),
  city: 'Hyderabad',
}

export const familyMembers: FamilyMember[] = [
  { id: 'f1', name: 'Aarav Sharma', relation: 'Self', age: 34, dob: '14 Mar 1991', gender: 'Male', blood: 'O+', photo: patient.photo, primary: true, records: 37 },
  { id: 'f2', name: 'Priya Sharma', relation: 'Spouse', age: 31, dob: '02 Jun 1994', gender: 'Female', blood: 'B+', photo: portrait(PORTRAIT_IDS.patientFemale, 200), records: 14 },
  { id: 'f3', name: 'Vihaan Sharma', relation: 'Son', age: 6, dob: '21 Nov 2018', gender: 'Male', blood: 'O+', records: 22 },
  { id: 'f4', name: 'Sudha Sharma', relation: 'Mother', age: 62, dob: '09 Feb 1963', gender: 'Female', blood: 'A+', records: 41 },
  { id: 'f5', name: 'Ramesh Sharma', relation: 'Father', age: 66, dob: '30 Jul 1959', gender: 'Male', blood: 'B+', records: 9 },
]

export const medicalInfo: MedicalInfo = {
  bloodGroup: 'O+',
  allergies: ['Penicillin', 'Dust mite'],
  conditions: ['Hypertension — diagnosed 2022'],
  medications: ['Telma 40 mg — once daily'],
  surgeries: ['Appendectomy — 2016'],
  emergency: { name: 'Priya Sharma', relation: 'Spouse', mobile: '+91 98661 20945' },
  height: '176 cm',
  weight: '74 kg',
}

/* ------------------------------------------------------------------ Doctors */

const baseDoctors: Omit<Doctor, keyof DoctorDetail>[] = [
  {
    id: 'd1',
    name: 'Dr. Arjun Mehta',
    qualification: 'MBBS, MD (Medicine), DM (Cardiology)',
    specialty: 'Cardiologist',
    experience: 16,
    rating: 4.9,
    reviews: 1284,
    languages: ['English', 'Hindi', 'Telugu'],
    hospital: 'Apollo Hospitals',
    locality: 'Jubilee Hills, Hyderabad',
    distanceKm: 3.2,
    photo: portrait(PORTRAIT_IDS.arjun, 420),
    fees: { video: 800, audio: 600, clinic: 1000 },
    nextSlot: 'Today, 5:30 PM',
    availableToday: true,
    gender: 'Male',
    regNo: 'TSMC/FMR/48219',
    about:
      'Dr. Arjun Mehta is a Senior Interventional Cardiologist with over 16 years of clinical experience in preventive cardiology, coronary intervention and heart failure management. He has performed more than 4,000 angioplasty procedures and leads the structural heart programme at Apollo Hospitals, Jubilee Hills.',
    consults: 11400,
    recommendPct: 98,
  },
  {
    id: 'd2',
    name: 'Dr. Priya Raghavan',
    qualification: 'MBBS, MD (Dermatology)',
    specialty: 'Dermatologist',
    experience: 11,
    rating: 4.8,
    reviews: 932,
    languages: ['English', 'Tamil', 'Hindi'],
    hospital: 'KIMS Hospitals',
    locality: 'Secunderabad, Hyderabad',
    distanceKm: 6.8,
    photo: portrait(PORTRAIT_IDS.priya, 420),
    fees: { video: 650, audio: 500, clinic: 850 },
    nextSlot: 'Today, 6:00 PM',
    availableToday: true,
    gender: 'Female',
    regNo: 'TSMC/FMR/51880',
    about:
      'Dr. Priya Raghavan specialises in medical and procedural dermatology, with a focused practice in acne, pigmentation disorders and paediatric skin conditions. She is a member of the Indian Association of Dermatologists, Venereologists and Leprologists.',
    consults: 8600,
    recommendPct: 97,
  },
  {
    id: 'd3',
    name: 'Dr. Rohan Deshmukh',
    qualification: 'MBBS, MS (Orthopaedics)',
    specialty: 'Orthopaedic Surgeon',
    experience: 14,
    rating: 4.7,
    reviews: 745,
    languages: ['English', 'Hindi', 'Marathi'],
    hospital: 'Yashoda Hospitals',
    locality: 'Somajiguda, Hyderabad',
    distanceKm: 4.5,
    photo: portrait(PORTRAIT_IDS.rohan, 420),
    fees: { video: 700, audio: 550, clinic: 900 },
    nextSlot: 'Tomorrow, 11:00 AM',
    availableToday: false,
    gender: 'Male',
    regNo: 'TSMC/FMR/44037',
    about:
      'Dr. Rohan Deshmukh is a joint replacement and sports injury specialist with a sub-speciality interest in arthroscopic knee and shoulder surgery. He has completed a fellowship in arthroplasty from the Royal Orthopaedic Hospital, Birmingham.',
    consults: 6900,
    recommendPct: 95,
  },
  {
    id: 'd4',
    name: 'Dr. Kavya Nair',
    qualification: 'MBBS, DNB (Paediatrics)',
    specialty: 'Paediatrician',
    experience: 9,
    rating: 4.9,
    reviews: 1120,
    languages: ['English', 'Malayalam', 'Hindi'],
    hospital: 'Rainbow Children’s Hospital',
    locality: 'Banjara Hills, Hyderabad',
    distanceKm: 1.9,
    photo: portrait(PORTRAIT_IDS.kavya, 420),
    fees: { video: 600, audio: 450, clinic: 800 },
    nextSlot: 'Today, 4:15 PM',
    availableToday: true,
    gender: 'Female',
    regNo: 'TSMC/FMR/57244',
    about:
      'Dr. Kavya Nair is a consultant paediatrician and neonatologist managing newborn care, childhood immunisation and developmental paediatrics. She runs a dedicated adolescent health clinic every Saturday.',
    consults: 9800,
    recommendPct: 99,
  },
  {
    id: 'd5',
    name: 'Dr. Sanjay Iyer',
    qualification: 'MBBS, MD (General Medicine)',
    specialty: 'General Physician',
    experience: 18,
    rating: 4.8,
    reviews: 2043,
    languages: ['English', 'Hindi', 'Telugu', 'Tamil'],
    hospital: 'Care Hospitals',
    locality: 'Banjara Hills, Hyderabad',
    distanceKm: 2.1,
    photo: portrait(PORTRAIT_IDS.sanjay, 420),
    fees: { video: 500, audio: 400, clinic: 650 },
    nextSlot: 'Today, 3:00 PM',
    availableToday: true,
    gender: 'Male',
    regNo: 'TSMC/FMR/39116',
    about:
      'Dr. Sanjay Iyer is a consultant physician with a broad internal medicine practice covering diabetes, hypertension, thyroid disorders and infectious disease. He is frequently consulted for second opinions on complex multi-system presentations.',
    consults: 21500,
    recommendPct: 98,
  },
  {
    id: 'd6',
    name: 'Dr. Neha Kulkarni',
    qualification: 'MBBS, MS (Obstetrics & Gynaecology)',
    specialty: 'Gynaecologist',
    experience: 12,
    rating: 4.8,
    reviews: 864,
    languages: ['English', 'Hindi', 'Marathi'],
    hospital: 'Fernandez Hospital',
    locality: 'Hyderguda, Hyderabad',
    distanceKm: 5.4,
    photo: portrait(PORTRAIT_IDS.neha, 420),
    fees: { video: 750, audio: 600, clinic: 950 },
    nextSlot: 'Tomorrow, 10:30 AM',
    availableToday: false,
    gender: 'Female',
    regNo: 'TSMC/FMR/49903',
    about:
      'Dr. Neha Kulkarni is a consultant obstetrician and gynaecologist with special interest in high-risk pregnancy, PCOS management and minimally invasive gynaecological surgery.',
    consults: 7400,
    recommendPct: 96,
  },
  {
    id: 'd7',
    name: 'Dr. Vikram Shetty',
    qualification: 'MBBS, MD, DM (Neurology)',
    specialty: 'Neurologist',
    experience: 20,
    rating: 4.9,
    reviews: 658,
    languages: ['English', 'Kannada', 'Hindi'],
    hospital: 'AIG Hospitals',
    locality: 'Gachibowli, Hyderabad',
    distanceKm: 9.6,
    photo: portrait(PORTRAIT_IDS.vikram, 420),
    fees: { video: 1000, audio: 800, clinic: 1200 },
    nextSlot: 'Thu, 12:00 PM',
    availableToday: false,
    gender: 'Male',
    regNo: 'TSMC/FMR/31722',
    about:
      'Dr. Vikram Shetty is a senior neurologist managing epilepsy, movement disorders and stroke rehabilitation. He heads the comprehensive epilepsy programme and has published widely on drug-resistant seizure management.',
    consults: 5200,
    recommendPct: 97,
  },
  {
    id: 'd8',
    name: 'Dr. Meera Krishnan',
    qualification: 'MBBS, MD, DM (Endocrinology)',
    specialty: 'Diabetologist',
    experience: 15,
    rating: 4.7,
    reviews: 991,
    languages: ['English', 'Tamil', 'Telugu'],
    hospital: 'Medicover Hospitals',
    locality: 'Madhapur, Hyderabad',
    distanceKm: 7.3,
    photo: portrait(PORTRAIT_IDS.meera, 420),
    fees: { video: 750, audio: 600, clinic: 900 },
    nextSlot: 'Today, 7:00 PM',
    availableToday: true,
    gender: 'Female',
    regNo: 'TSMC/FMR/42558',
    about:
      'Dr. Meera Krishnan is a consultant endocrinologist practising in diabetes reversal, thyroid disease and metabolic bone disorders. She leads a structured insulin initiation programme for newly diagnosed Type 2 patients.',
    consults: 10200,
    recommendPct: 95,
  },
]

/** Credentials and focus areas shown on each doctor's profile. */
const DOCTOR_DETAILS: Record<string, DoctorDetail> = {
  d1: {
    credentials: [
      { title: 'DM — Cardiology', org: 'Sri Jayadeva Institute of Cardiovascular Sciences, Bengaluru', years: '2009 – 2012' },
      { title: 'MD — General Medicine', org: 'Osmania Medical College, Hyderabad', years: '2005 – 2008' },
      { title: 'MBBS', org: 'Gandhi Medical College, Secunderabad', years: '1999 – 2004' },
    ],
    areas: ['Coronary angioplasty', 'Heart failure', 'Preventive cardiology', 'Hypertension', 'Arrhythmia', 'Echocardiography'],
  },
  d2: {
    credentials: [
      { title: 'MD — Dermatology', org: 'Madras Medical College, Chennai', years: '2011 – 2014' },
      { title: 'MBBS', org: 'Stanley Medical College, Chennai', years: '2005 – 2010' },
    ],
    areas: ['Acne', 'Pigmentation disorders', 'Paediatric dermatology', 'Eczema', 'Chemical peels'],
  },
  d3: {
    credentials: [
      { title: 'MS — Orthopaedics', org: 'Grant Medical College, Mumbai', years: '2008 – 2011' },
      { title: 'MBBS', org: 'BJ Medical College, Pune', years: '2002 – 2007' },
    ],
    areas: ['Joint replacement', 'Sports injuries', 'Knee arthroscopy', 'Shoulder surgery', 'Back pain'],
  },
  d4: {
    credentials: [
      { title: 'DNB — Paediatrics', org: 'Rainbow Children’s Hospital, Hyderabad', years: '2014 – 2017' },
      { title: 'MBBS', org: 'Government Medical College, Kozhikode', years: '2008 – 2013' },
    ],
    areas: ['Newborn care', 'Child vaccination', 'Developmental paediatrics', 'Adolescent health', 'Childhood asthma'],
  },
  d5: {
    credentials: [
      { title: 'MD — General Medicine', org: 'Osmania Medical College, Hyderabad', years: '2004 – 2007' },
      { title: 'MBBS', org: 'Kurnool Medical College', years: '1997 – 2003' },
    ],
    areas: ['Diabetes', 'Hypertension', 'Thyroid disorders', 'Infectious disease', 'Fever & cold'],
  },
  d6: {
    credentials: [
      { title: 'MS — Obstetrics & Gynaecology', org: 'Seth GS Medical College, Mumbai', years: '2010 – 2013' },
      { title: 'MBBS', org: 'Government Medical College, Nagpur', years: '2004 – 2009' },
    ],
    areas: ['High-risk pregnancy', 'PCOS', 'Laparoscopic surgery', 'Antenatal care', 'Menstrual disorders'],
  },
  d7: {
    credentials: [
      { title: 'DM — Neurology', org: 'NIMHANS, Bengaluru', years: '2002 – 2005' },
      { title: 'MD — General Medicine', org: 'Kasturba Medical College, Manipal', years: '1998 – 2001' },
      { title: 'MBBS', org: 'Kasturba Medical College, Manipal', years: '1992 – 1997' },
    ],
    areas: ['Epilepsy', 'Stroke rehabilitation', 'Movement disorders', 'Migraine', 'Neuropathy'],
  },
  d8: {
    credentials: [
      { title: 'DM — Endocrinology', org: 'Christian Medical College, Vellore', years: '2008 – 2011' },
      { title: 'MD — General Medicine', org: 'Madras Medical College, Chennai', years: '2004 – 2007' },
      { title: 'MBBS', org: 'Stanley Medical College, Chennai', years: '1998 – 2003' },
    ],
    areas: ['Diabetes reversal', 'Thyroid disease', 'Metabolic bone disorders', 'Insulin initiation', 'Obesity'],
  },
}

export const doctors: Doctor[] = baseDoctors.map((d) => ({ ...d, ...DOCTOR_DETAILS[d.id] }))

export const reviews: Review[] = [
  {
    id: 'r1',
    name: 'Sneha K.',
    rating: 5,
    when: '3 days ago',
    mode: 'Video consultation',
    text: 'Dr. Mehta explained my ECG and lipid report line by line and did not rush at all. He adjusted my medication and set a clear 3-month plan. Easily the most reassuring consultation I have had.',
  },
  {
    id: 'r2',
    name: 'Mohammed A.',
    rating: 5,
    when: '1 week ago',
    mode: 'In-person consultation',
    text: 'Very thorough examination. He asked about family history in detail and ordered only the tests that were actually required instead of a long list.',
  },
  {
    id: 'r3',
    name: 'Lakshmi R.',
    rating: 4,
    when: '2 weeks ago',
    mode: 'Video consultation',
    text: 'Good consultation and clear prescription. Call started about seven minutes late, otherwise a very good experience overall.',
  },
]

/** Shown on doctors whose review history has not been curated in the catalogue. */
export const generalReviews: Review[] = [
  {
    id: 'rg1',
    name: 'Anjali P.',
    rating: 5,
    when: '4 days ago',
    mode: 'Video consultation',
    text: 'Listened carefully and explained the plan clearly. The prescription arrived in the app as soon as the call ended.',
  },
  {
    id: 'rg2',
    name: 'Karthik S.',
    rating: 4,
    when: '2 weeks ago',
    mode: 'In-person consultation',
    text: 'Thorough and unhurried. Waited a little at the clinic but the visit itself was very good.',
  },
]

export const specialties: Specialty[] = [
  { id: 's1', name: 'General Physician', count: 142, icon: 'stethoscope' },
  { id: 's2', name: 'Cardiology', count: 38, icon: 'heart' },
  { id: 's3', name: 'Dermatology', count: 54, icon: 'sparkles' },
  { id: 's4', name: 'Paediatrics', count: 61, icon: 'baby' },
  { id: 's5', name: 'Orthopaedics', count: 47, icon: 'bone' },
  { id: 's6', name: 'Gynaecology', count: 43, icon: 'venus' },
  { id: 's7', name: 'Neurology', count: 22, icon: 'brain' },
  { id: 's8', name: 'ENT', count: 29, icon: 'ear' },
  { id: 's9', name: 'Ophthalmology', count: 26, icon: 'eye' },
  { id: 's10', name: 'Psychiatry', count: 19, icon: 'smile' },
  { id: 's11', name: 'Dentistry', count: 35, icon: 'tooth' },
  { id: 's12', name: 'Diabetology', count: 24, icon: 'droplet' },
]

/* ------------------------------------------------------------- Appointments */

export const appointments: Appointment[] = [
  {
    id: 'a1',
    bookingId: 'KDC2410A4821',
    doctorId: 'd1',
    mode: 'video',
    date: 'Today, 5 Oct 2025',
    dateIso: '2025-10-05',
    time: '5:30 PM',
    status: 'confirmed',
    fee: 800,
    platformFee: 49,
    discount: 50,
    discountLabel: 'Discount (KDC50)',
    for: 'Aarav Sharma',
    paidVia: 'UPI · aarav@okhdfcbank',
  },
  {
    id: 'a2',
    bookingId: 'KDC2410A4793',
    doctorId: 'd4',
    mode: 'clinic',
    date: 'Wed, 8 Oct 2025',
    dateIso: '2025-10-08',
    time: '11:00 AM',
    status: 'confirmed',
    fee: 800,
    platformFee: 49,
    discount: 0,
    location: 'Rainbow Children’s Hospital, Banjara Hills',
    for: 'Vihaan Sharma (Son)',
    paidVia: 'HDFC Credit Card •••• 4821',
  },
  {
    id: 'a3',
    bookingId: 'KDC2409A4410',
    doctorId: 'd5',
    mode: 'video',
    date: 'Mon, 22 Sep 2025',
    dateIso: '2025-09-22',
    time: '7:15 PM',
    status: 'completed',
    fee: 500,
    platformFee: 49,
    discount: 0,
    for: 'Aarav Sharma',
    paidVia: 'UPI · aarav@okhdfcbank',
  },
  {
    id: 'a4',
    bookingId: 'KDC2409A4288',
    doctorId: 'd2',
    mode: 'audio',
    date: 'Thu, 11 Sep 2025',
    dateIso: '2025-09-11',
    time: '1:00 PM',
    status: 'completed',
    fee: 500,
    platformFee: 49,
    discount: 0,
    for: 'Priya Sharma (Spouse)',
    paidVia: 'UPI · aarav@okhdfcbank',
  },
  {
    id: 'a5',
    bookingId: 'KDC2408A3914',
    doctorId: 'd3',
    mode: 'clinic',
    date: 'Sat, 23 Aug 2025',
    dateIso: '2025-08-23',
    time: '4:30 PM',
    status: 'cancelled',
    fee: 900,
    platformFee: 49,
    discount: 0,
    location: 'Yashoda Hospitals, Somajiguda',
    for: 'Aarav Sharma',
    reason: 'Cancelled by patient · Refunded to source in 3 days',
  },
]

export const consultationModes = [
  {
    id: 'video' as ConsultMode,
    label: 'Video Consultation',
    blurb: 'Face-to-face on a secure video call. Best for most conditions needing visual assessment.',
    duration: '15 min',
    icon: 'video',
    tag: 'Most booked',
  },
  {
    id: 'audio' as ConsultMode,
    label: 'Audio Consultation',
    blurb: 'A private voice call. Ideal for follow-ups, report reviews and low-bandwidth areas.',
    duration: '12 min',
    icon: 'phone',
  },
  {
    id: 'clinic' as ConsultMode,
    label: 'In-Person Consultation',
    blurb: 'Visit the doctor at the clinic for physical examination and procedures.',
    duration: '20 min',
    icon: 'building',
  },
]

export const clinics: Clinic[] = [
  {
    id: 'c1',
    name: 'Apollo Hospitals',
    address: 'Road No. 72, Film Nagar, Jubilee Hills, Hyderabad – 500033',
    distanceKm: 3.2,
    slots: 8,
    photo: SCENE.hospital,
    timing: 'Mon–Sat · 10:00 AM – 7:00 PM',
  },
  {
    id: 'c2',
    name: 'Apollo Clinic — Banjara Hills',
    address: 'Road No. 10, Banjara Hills, Hyderabad – 500034',
    distanceKm: 1.6,
    slots: 4,
    photo: SCENE.ward,
    timing: 'Mon, Wed, Fri · 5:00 PM – 8:00 PM',
  },
]

/* ------------------------------------------------------------- Prescription */

export const prescription: PrescriptionDoc = {
  id: 'KDC-RX-2025-48219',
  doctorId: 'd1',
  date: '22 September 2025',
  time: '7:42 PM',
  patient: { name: 'Aarav Sharma', age: 34, gender: 'Male', id: 'KDC-PT-4821905' },
  vitals: { bp: '138/88 mmHg', pulse: '82 bpm', weight: '74 kg', spo2: '98%' },
  diagnosis: ['Essential hypertension — Stage 1', 'Dyslipidaemia'],
  medicines: [
    {
      name: 'Telma 40 Tablet',
      generic: 'Telmisartan 40 mg',
      dosage: '1 tablet',
      frequency: 'Once daily — morning',
      duration: '30 days',
      note: 'Take after breakfast. Do not skip doses.',
    },
    {
      name: 'Rosuvas 10 Tablet',
      generic: 'Rosuvastatin 10 mg',
      dosage: '1 tablet',
      frequency: 'Once daily — bedtime',
      duration: '30 days',
      note: 'Report muscle pain or weakness immediately.',
    },
    {
      name: 'Ecosprin 75 Tablet',
      generic: 'Aspirin 75 mg',
      dosage: '1 tablet',
      frequency: 'Once daily — after dinner',
      duration: '30 days',
      note: 'Take with food to protect the stomach.',
    },
  ],
  advice: [
    'Restrict salt intake to under 5 g per day.',
    'Brisk walk 30 minutes, five days a week.',
    'Monitor blood pressure twice weekly and log the readings in KDC+.',
    'Avoid tobacco in all forms; limit alcohol.',
  ],
  investigations: ['Lipid Profile — after 8 weeks', 'Serum Creatinine & Electrolytes — after 4 weeks'],
  followUp: 'Review after 4 weeks, or earlier if BP exceeds 160/100 mmHg.',
}

export const prescriptionHistory: PrescriptionSummary[] = [
  { id: 'p1', doctorId: 'd1', date: '22 Sep 2025', specialty: 'Cardiologist', items: 3, status: 'active', rxId: 'KDC-RX-2025-48219' },
  { id: 'p2', doctorId: 'd2', date: '11 Sep 2025', specialty: 'Dermatologist', items: 2, status: 'completed', rxId: 'KDC-RX-2025-47712' },
  { id: 'p3', doctorId: 'd4', date: '2 Aug 2025', specialty: 'Paediatrician', items: 4, status: 'completed', rxId: 'KDC-RX-2025-44096' },
  { id: 'p4', doctorId: 'd5', date: '19 Jun 2025', specialty: 'General Physician', items: 5, status: 'completed', rxId: 'KDC-RX-2025-39840' },
]

const EXTRA_RX_MEDICINES: PrescriptionDoc['medicines'] = [
  { name: 'Dolo 650 Tablet', generic: 'Paracetamol 650 mg', dosage: '1 tablet', frequency: 'When required', duration: '5 days', note: 'Do not exceed four tablets in 24 hours.' },
  { name: 'Shelcal 500 Tablet', generic: 'Calcium + Vitamin D3', dosage: '1 tablet', frequency: 'Once daily — after lunch', duration: '30 days', note: 'Take after a meal.' },
]

const PRESCRIPTION_DIAGNOSIS: Record<string, string[]> = {
  'KDC-RX-2025-47712': ['Allergic contact dermatitis'],
  'KDC-RX-2025-44096': ['Acute viral upper respiratory infection'],
  'KDC-RX-2025-39840': ['Seasonal allergic rhinitis', 'Vitamin D insufficiency'],
}

/** The document behind a history row; only the latest is issued in full detail. */
export function prescriptionDocFor(summary: PrescriptionSummary): PrescriptionDoc {
  if (summary.rxId === prescription.id) return prescription
  const medicines = [...prescription.medicines, ...EXTRA_RX_MEDICINES].slice(0, summary.items)
  return {
    ...prescription,
    id: summary.rxId,
    doctorId: summary.doctorId,
    date: summary.date,
    diagnosis: PRESCRIPTION_DIAGNOSIS[summary.rxId] ?? prescription.diagnosis,
    medicines,
  }
}

/* ----------------------------------------------------------------- Pharmacy */

export const medicines: Medicine[] = [
  { id: 'm1', name: 'Telma 40 Tablet', generic: 'Telmisartan 40 mg', brand: 'Glenmark', pack: 'Strip of 15 tablets', mrp: 138, price: 118, rx: true, inStock: true, photo: SCENE.blister, category: 'Cardiac Care' },
  { id: 'm2', name: 'Rosuvas 10 Tablet', generic: 'Rosuvastatin 10 mg', brand: 'Sun Pharma', pack: 'Strip of 10 tablets', mrp: 224, price: 189, rx: true, inStock: true, photo: SCENE.tablets, category: 'Cardiac Care' },
  { id: 'm3', name: 'Ecosprin 75 Tablet', generic: 'Aspirin 75 mg', brand: 'USV', pack: 'Strip of 14 tablets', mrp: 12, price: 10, rx: true, inStock: true, photo: SCENE.pills, category: 'Cardiac Care' },
  { id: 'm4', name: 'Dolo 650 Tablet', generic: 'Paracetamol 650 mg', brand: 'Micro Labs', pack: 'Strip of 15 tablets', mrp: 34, price: 31, rx: false, inStock: true, photo: SCENE.blister, category: 'Pain Relief' },
  { id: 'm5', name: 'Pan 40 Tablet', generic: 'Pantoprazole 40 mg', brand: 'Alkem', pack: 'Strip of 15 tablets', mrp: 165, price: 142, rx: true, inStock: true, photo: SCENE.tablets, category: 'Digestive Care' },
  { id: 'm6', name: 'Shelcal 500 Tablet', generic: 'Calcium + Vitamin D3', brand: 'Torrent', pack: 'Strip of 15 tablets', mrp: 158, price: 142, rx: false, inStock: true, photo: SCENE.pills, category: 'Vitamins' },
  { id: 'm7', name: 'Zincovit Tablet', generic: 'Multivitamin + Zinc', brand: 'Apex Labs', pack: 'Strip of 15 tablets', mrp: 118, price: 105, rx: false, inStock: true, photo: SCENE.blister, category: 'Vitamins' },
  { id: 'm8', name: 'Montek LC Tablet', generic: 'Montelukast + Levocetirizine', brand: 'Sun Pharma', pack: 'Strip of 10 tablets', mrp: 212, price: 189, rx: true, inStock: false, photo: SCENE.tablets, category: 'Respiratory' },
]

export const pharmacyCategories: PharmacyCategory[] = [
  { id: 'pc1', name: 'Pain Relief', items: 248 },
  { id: 'pc2', name: 'Diabetes Care', items: 186 },
  { id: 'pc3', name: 'Cardiac Care', items: 164 },
  { id: 'pc4', name: 'Vitamins & Supplements', items: 392 },
  { id: 'pc5', name: 'Digestive Care', items: 211 },
  { id: 'pc6', name: 'Personal Care', items: 540 },
  { id: 'pc7', name: 'Baby & Mother', items: 178 },
  { id: 'pc8', name: 'Respiratory', items: 96 },
]

/** Copy for each medicine's detail page; anything absent falls back to a generic line. */
export const medicineDetails: Record<string, MedicineDetail> = {
  m1: {
    about:
      'Telmisartan belongs to the angiotensin receptor blocker (ARB) class. It relaxes blood vessels so the heart pumps blood more efficiently, lowering blood pressure and reducing the long-term risk of stroke and heart attack.',
    sideEffects: ['Dizziness', 'Back pain', 'Sinus inflammation', 'Diarrhoea'],
  },
  m2: {
    about: 'Rosuvastatin is a statin that lowers LDL cholesterol and triglycerides, reducing long-term cardiovascular risk.',
    sideEffects: ['Muscle pain', 'Headache', 'Nausea'],
  },
  m3: {
    about: 'Low-dose aspirin thins the blood and is used to reduce the risk of heart attack and stroke.',
    sideEffects: ['Stomach upset', 'Heartburn', 'Easy bruising'],
  },
  m4: { about: 'Paracetamol relieves mild to moderate pain and reduces fever.', sideEffects: ['Nausea', 'Rash'] },
  m5: { about: 'Pantoprazole reduces stomach acid and is used for reflux and gastric ulcers.', sideEffects: ['Headache', 'Diarrhoea', 'Flatulence'] },
  m6: { about: 'Calcium with vitamin D3 supports bone strength and prevents deficiency.', sideEffects: ['Constipation', 'Bloating'] },
  m7: { about: 'A daily multivitamin with zinc used to correct nutritional deficiencies.', sideEffects: ['Mild nausea'] },
  m8: { about: 'A combination for allergic rhinitis and asthma symptoms.', sideEffects: ['Drowsiness', 'Dry mouth', 'Headache'] },
}

/** The cart a returning patient sees first: the latest prescription, already verified. */
export const seedCart: { lines: CartLine[]; prescriptionLabel: string } = {
  lines: [
    { medicineId: 'm1', qty: 1, seeded: true },
    { medicineId: 'm2', qty: 1, seeded: true },
    { medicineId: 'm3', qty: 2, seeded: true },
  ],
  prescriptionLabel: 'Dr. Arjun Mehta · KDC-RX-2025-48219',
}

export const pharmacyOrders: PharmacyOrder[] = [
  {
    id: 'KDC-PH-99421',
    kind: 'pharmacy',
    placedAt: 0,
    placed: '3 Oct 2025, 2:14 PM',
    eta: 'Today by 7:30 PM',
    etaWhen: 'Arriving today by 7:30 PM',
    lines: [
      { medicineId: 'm1', qty: 1 },
      { medicineId: 'm2', qty: 1 },
      { medicineId: 'm3', qty: 2 },
    ],
    amount: 263,
    trackedTotal: 245,
    address: 'Flat 402, Lotus Residency, Road No. 12, Banjara Hills, Hyderabad – 500034',
    partner: 'KDC+ Pharmacy, Jubilee Hills',
    rider: { name: 'Suresh K.', mobile: '+91 90000 11245' },
    fixedStage: 3,
    stageTimes: ['2:14 PM', '2:26 PM', '4:05 PM', '6:40 PM'],
    payment: 'HDFC Credit Card •••• 4821',
  },
  {
    id: 'KDC-PH-99214',
    kind: 'pharmacy',
    placedAt: 0,
    placed: '22 Sep 2025, 8:02 PM',
    eta: 'Delivered 24 Sep, 11:20 AM',
    etaWhen: 'Delivered 24 Sep, 11:20 AM',
    lines: [
      { medicineId: 'm1', qty: 1 },
      { medicineId: 'm2', qty: 1 },
      { medicineId: 'm3', qty: 2 },
    ],
    amount: 263,
    address: 'Flat 402, Lotus Residency, Road No. 12, Banjara Hills, Hyderabad – 500034',
    partner: 'KDC+ Pharmacy, Jubilee Hills',
    rider: { name: 'Suresh K.', mobile: '+91 90000 11245' },
    fixedStage: 4,
    stageTimes: ['8:02 PM', '8:15 PM', '9:40 AM', '10:30 AM', '11:20 AM'],
    payment: 'UPI · aarav@okhdfcbank',
  },
]

/* -------------------------------------------------------------- Diagnostics */

export const labTests: LabTest[] = [
  {
    id: 't1',
    name: 'HbA1c (Glycosylated Haemoglobin)',
    short: 'HbA1c',
    parameters: 2,
    price: 549,
    mrp: 790,
    fasting: 'Not required',
    reportIn: '12 hours',
    homeCollection: true,
    category: 'Diabetes',
    description:
      'Measures average blood glucose over the previous 8–12 weeks. The standard test for diagnosing diabetes and monitoring long-term glycaemic control.',
    prep: ['No fasting required', 'Continue your regular medication unless advised otherwise', 'Avoid strenuous exercise an hour before the sample'],
  },
  {
    id: 't2',
    name: 'Lipid Profile — Complete',
    short: 'Lipid Profile',
    parameters: 9,
    price: 699,
    mrp: 1100,
    fasting: '10–12 hours',
    reportIn: '12 hours',
    homeCollection: true,
    category: 'Cardiac',
    description:
      'Evaluates total cholesterol, triglycerides, HDL, LDL and VLDL to assess cardiovascular risk and guide statin therapy.',
    prep: ['Fast for 10–12 hours; water is permitted', 'Avoid alcohol for 24 hours before the test', 'Take morning medication only after the sample is drawn'],
  },
  {
    id: 't3',
    name: 'Complete Blood Count (CBC)',
    short: 'CBC',
    parameters: 24,
    price: 399,
    mrp: 600,
    fasting: 'Not required',
    reportIn: '8 hours',
    homeCollection: true,
    category: 'Routine',
    description: 'A broad screen of red cells, white cells and platelets used to detect anaemia, infection and clotting disorders.',
    prep: ['No fasting required', 'Inform the technician of any ongoing antibiotic course'],
  },
  {
    id: 't4',
    name: 'Thyroid Profile (T3, T4, TSH)',
    short: 'Thyroid Profile',
    parameters: 3,
    price: 499,
    mrp: 800,
    fasting: 'Not required',
    reportIn: '12 hours',
    homeCollection: true,
    category: 'Thyroid',
    description: 'Assesses thyroid function to detect hypothyroidism and hyperthyroidism and to monitor thyroxine replacement.',
    prep: ['Sample preferably collected before 10:00 AM', 'Take thyroid medication after the sample is drawn'],
  },
  {
    id: 't5',
    name: 'Vitamin D (25-OH)',
    short: 'Vitamin D',
    parameters: 1,
    price: 999,
    mrp: 1500,
    fasting: 'Not required',
    reportIn: '24 hours',
    homeCollection: true,
    category: 'Vitamin',
    description: 'Measures 25-hydroxy vitamin D, the standard marker of vitamin D sufficiency and deficiency.',
    prep: ['No fasting required', 'Stop vitamin D supplements 24 hours before the test'],
  },
  {
    id: 't6',
    name: 'Liver Function Test (LFT)',
    short: 'LFT',
    parameters: 12,
    price: 649,
    mrp: 980,
    fasting: '8 hours',
    reportIn: '12 hours',
    homeCollection: true,
    category: 'Liver',
    description: 'Evaluates liver enzymes, bilirubin and proteins to assess hepatic function and detect liver injury.',
    prep: ['Fast for 8 hours before the sample', 'Avoid alcohol for 72 hours'],
  },
  {
    id: 't7',
    name: 'Kidney Function Test (KFT)',
    short: 'KFT',
    parameters: 10,
    price: 699,
    mrp: 1050,
    fasting: '8 hours',
    reportIn: '12 hours',
    homeCollection: true,
    category: 'Kidney',
    description: 'Assesses urea, creatinine, uric acid and electrolytes to evaluate renal function.',
    prep: ['Fast for 8 hours before the sample', 'Maintain normal fluid intake'],
  },
  {
    id: 't8',
    name: 'KDC+ Full Body Checkup — Advanced',
    short: 'Full Body Advanced',
    parameters: 84,
    price: 2499,
    mrp: 5600,
    fasting: '10–12 hours',
    reportIn: '24 hours',
    homeCollection: true,
    category: 'Full Body Checkup',
    description:
      'A comprehensive 84-parameter screen covering cardiac, renal, hepatic, thyroid, diabetic and haematology panels, with a free physician report review.',
    prep: ['Fast for 10–12 hours; water is permitted', 'Carry a list of current medication', 'Allow 20 minutes for sample collection'],
  },
]

/** Detail page lists; only the tests offered as packages carry a full breakdown. */
export const testDetails: Record<string, TestDetail> = {
  t1: { covers: ['HbA1c', 'Estimated Average Glucose'], audience: ['Anyone with diabetes, every three months', 'Adults with a family history of diabetes'] },
  t2: {
    covers: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL', 'Non-HDL', 'TC/HDL Ratio', 'LDL/HDL Ratio', 'TG/HDL Ratio'],
    audience: [
      'Adults over 35, once every year',
      'Anyone with hypertension, diabetes or a family history of heart disease',
      'Patients on statin therapy, for monitoring',
    ],
  },
  t3: { covers: ['Haemoglobin', 'RBC', 'WBC', 'Platelets', 'Differential count'], audience: ['Routine annual screening', 'Fever, fatigue or suspected infection'] },
  t4: { covers: ['T3', 'T4', 'TSH'], audience: ['Unexplained weight change or fatigue', 'Patients on thyroxine, for monitoring'] },
  t5: { covers: ['25-OH Vitamin D'], audience: ['Bone pain or muscle weakness', 'Limited sun exposure'] },
  t6: { covers: ['SGOT', 'SGPT', 'Bilirubin', 'Albumin', 'Alkaline Phosphatase'], audience: ['Long-term medication use', 'Regular alcohol intake'] },
  t7: { covers: ['Urea', 'Creatinine', 'Uric Acid', 'Sodium', 'Potassium'], audience: ['Hypertension or diabetes', 'Swelling or reduced urine output'] },
  t8: { covers: ['Cardiac panel', 'Renal panel', 'Hepatic panel', 'Thyroid panel', 'Diabetic panel', 'Haematology'], audience: ['Adults over 30, once every year', 'Anyone with a chronic condition'] },
}

export const testCategories: TestCategory[] = [
  { id: 'tc1', name: 'Full Body Checkup', tests: 14 },
  { id: 'tc2', name: 'Diabetes', tests: 22 },
  { id: 'tc3', name: 'Thyroid', tests: 9 },
  { id: 'tc4', name: 'Vitamin', tests: 16 },
  { id: 'tc5', name: 'Cardiac', tests: 18 },
  { id: 'tc6', name: 'Liver', tests: 11 },
  { id: 'tc7', name: 'Kidney', tests: 10 },
  { id: 'tc8', name: 'Women’s Health', tests: 20 },
]

export const labs: Lab[] = [
  { id: 'l1', name: 'Dr. Lal PathLabs', rating: 4.8, reviews: 4210, distanceKm: 1.2, price: 549, homeCollection: true, nabl: true, slots: 9, photo: SCENE.lab, locality: 'Banjara Hills' },
  { id: 'l2', name: 'Vijaya Diagnostic Centre', rating: 4.7, reviews: 3860, distanceKm: 2.4, price: 520, homeCollection: true, nabl: true, slots: 6, photo: SCENE.labTeam, locality: 'Somajiguda' },
  { id: 'l3', name: 'Apollo Diagnostics', rating: 4.6, reviews: 2940, distanceKm: 3.1, price: 599, homeCollection: true, nabl: true, slots: 4, photo: SCENE.lab, locality: 'Jubilee Hills' },
  { id: 'l4', name: 'Thyrocare', rating: 4.5, reviews: 5120, distanceKm: 5.0, price: 480, homeCollection: true, nabl: true, slots: 11, photo: SCENE.labTeam, locality: 'Madhapur' },
]

export const diagnosticOrders: DiagnosticOrder[] = [
  {
    id: 'KDC-DX-77215',
    kind: 'diagnostics',
    placedAt: 0,
    testId: 't1',
    labId: 'l1',
    method: 'Home Collection',
    date: 'Tue, 7 Oct 2025',
    slot: '7:00 AM – 8:00 AM',
    slotCompact: '7:00 – 8:00 AM',
    address: 'Flat 402, Lotus Residency, Road No. 12, Banjara Hills, Hyderabad – 500034',
    technician: { name: 'Ravi Teja', id: 'PH-2281', mobile: '+91 93910 44217' },
    amount: 549,
    fixedStage: 2,
    stageTimes: ['3 Oct, 1:12 PM', '5 Oct, 1:12 PM'],
    status: 'active',
  },
  {
    id: 'KDC-DX-77118',
    kind: 'diagnostics',
    placedAt: 0,
    testId: 't2',
    labId: 'l1',
    method: 'Home Collection',
    date: 'Sun, 28 Sep 2025',
    slot: '7:00 AM – 8:00 AM',
    slotCompact: '7:00 – 8:00 AM',
    address: 'Flat 402, Lotus Residency, Road No. 12, Banjara Hills, Hyderabad – 500034',
    technician: { name: 'Ravi Teja', id: 'PH-2281', mobile: '+91 93910 44217' },
    amount: 699,
    fixedStage: 4,
    stageTimes: ['26 Sep, 9:40 AM', '27 Sep, 4:30 PM', '28 Sep, 7:20 AM', '28 Sep, 9:10 AM', '28 Sep, 6:45 PM'],
    status: 'active',
    reportedWhen: 'Reported 28 Sep, 6:45 PM',
  },
]

/** Every report on the patient's record — the list behind "Lab Reports". */
export const labReports: PatientReport[] = [
  { id: 'KDC-LR-78004', name: 'Thyroid Profile (T3, T4, TSH)', kind: 'blood', lab: 'Dr. Lal PathLabs', date: '05 Oct 2025', month: 'October 2025', status: 'processing', flagged: 0, pages: 0 },
  { id: 'KDC-LR-66104', name: 'Lipid Profile — Complete', kind: 'blood', lab: 'Dr. Lal PathLabs', date: '28 Sep 2025', month: 'September 2025', status: 'ready', flagged: 2, pages: 3 },
  { id: 'KDC-LR-66098', name: 'Serum Creatinine & Electrolytes', kind: 'blood', lab: 'Dr. Lal PathLabs', date: '28 Sep 2025', month: 'September 2025', status: 'ready', flagged: 0, pages: 2 },
  { id: 'KDC-LR-61240', name: 'HbA1c (Glycosylated Haemoglobin)', kind: 'blood', lab: 'Vijaya Diagnostic Centre', date: '12 Aug 2025', month: 'August 2025', status: 'ready', flagged: 0, pages: 1 },
  { id: 'KDC-LR-61238', name: 'Complete Blood Count (CBC)', kind: 'blood', lab: 'Vijaya Diagnostic Centre', date: '12 Aug 2025', month: 'August 2025', status: 'ready', flagged: 1, pages: 2 },
  { id: 'KDC-LR-54011', name: 'Vitamin D (25-OH)', kind: 'blood', lab: 'Thyrocare', date: '19 Jun 2025', month: 'June 2025', status: 'ready', flagged: 1, pages: 1 },
  { id: 'KDC-LR-54007', name: 'Liver Function Test (LFT)', kind: 'blood', lab: 'Apollo Diagnostics', date: '19 Jun 2025', month: 'June 2025', status: 'ready', flagged: 0, pages: 2 },
  { id: 'KDC-IM-20418', name: '2D Echocardiogram', kind: 'imaging', lab: 'Apollo Hospitals — Imaging', date: '20 Mar 2025', month: 'March 2025', status: 'ready', flagged: 0, pages: 4 },
]

export const labReport = {
  id: 'KDC-LR-66104',
  test: 'Lipid Profile — Complete',
  lab: 'Dr. Lal PathLabs',
  branch: 'Banjara Hills, Hyderabad – 500034',
  nabl: 'NABL MC-2184',
  collected: '28 Sep 2025, 7:20 AM',
  reported: '28 Sep 2025, 6:45 PM',
  pathologist: 'Dr. S. Venkatesh, MD (Pathology)',
  refBy: 'Dr. Arjun Mehta',
  /** Labs deliver documents, not structured data. These are the files on record. */
  files: [
    { id: 'f1', name: 'KDC-LR-66104.pdf', kind: 'pdf' as const, pages: 3, size: '1.4 MB', primary: true },
    { id: 'f2', name: 'Sample-collection-slip.png', kind: 'image' as const, pages: 1, size: '268 KB' },
  ],
  /** Printed on the PDF — rendered inside the page preview, never as app UI. */
  results: [
    { name: 'Total Cholesterol', value: '214', unit: 'mg/dL', range: '< 200', flag: 'high' as const },
    { name: 'Triglycerides', value: '168', unit: 'mg/dL', range: '< 150', flag: 'high' as const },
    { name: 'HDL Cholesterol', value: '46', unit: 'mg/dL', range: '> 40', flag: 'normal' as const },
    { name: 'LDL Cholesterol', value: '134', unit: 'mg/dL', range: '< 130', flag: 'borderline' as const },
    { name: 'VLDL Cholesterol', value: '34', unit: 'mg/dL', range: '< 30', flag: 'borderline' as const },
    { name: 'Total Cholesterol / HDL Ratio', value: '4.6', unit: '', range: '< 5.0', flag: 'normal' as const },
    { name: 'Non-HDL Cholesterol', value: '168', unit: 'mg/dL', range: '< 160', flag: 'borderline' as const },
    { name: 'LDL / HDL Ratio', value: '2.9', unit: '', range: '< 3.5', flag: 'normal' as const },
    { name: 'Triglycerides / HDL Ratio', value: '3.7', unit: '', range: '< 4.0', flag: 'normal' as const },
  ],
}

/* ------------------------------------------------------- Records & timeline */

export const healthTimeline: TimelineEvent[] = [
  { id: 'h1', type: 'consultation', title: 'Video consultation — Dr. Arjun Mehta', meta: 'Cardiologist · Apollo Hospitals', date: '22 Sep 2025', time: '7:15 PM' },
  { id: 'h2', type: 'prescription', title: 'Prescription issued — 3 medicines', meta: 'Essential hypertension, Dyslipidaemia', date: '22 Sep 2025', time: '7:42 PM' },
  { id: 'h3', type: 'pharmacy', title: 'Medicines delivered', meta: 'Order KDC-PH-99214 · 3 items', date: '24 Sep 2025', time: '11:20 AM' },
  { id: 'h4', type: 'lab', title: 'Lipid Profile — sample collected', meta: 'Dr. Lal PathLabs · Home collection', date: '28 Sep 2025', time: '7:20 AM' },
  { id: 'h5', type: 'report', title: 'Lab report ready — 2 values flagged', meta: 'Lipid Profile — Complete', date: '28 Sep 2025', time: '6:45 PM' },
  { id: 'h6', type: 'followup', title: 'Follow-up scheduled', meta: 'Dr. Arjun Mehta · Video consultation', date: '5 Oct 2025', time: '5:30 PM' },
]

export const recordCounts = { prescriptions: 12, reports: 8, consultations: 17, documents: 5 }

/* ------------------------------------------------- Notifications & payments */

export const notifications: NotificationItem[] = [
  { id: 'n1', group: 'Today', category: 'Appointments', title: 'Your consultation starts in 30 minutes', body: 'Dr. Arjun Mehta · Video consultation at 5:30 PM', time: '5:00 PM', unread: true, action: 'Join waiting room' },
  { id: 'n2', group: 'Today', category: 'Diagnostics', title: 'Technician assigned for home collection', body: 'Ravi Teja will arrive on 7 Oct between 7:00–8:00 AM', time: '1:12 PM', unread: true },
  { id: 'n3', group: 'Today', category: 'Pharmacy', title: 'Order out for delivery', body: 'KDC-PH-99421 · Arriving by 7:30 PM', time: '11:40 AM', unread: false },
  { id: 'n4', group: 'Yesterday', category: 'Diagnostics', title: 'Lab report ready', body: 'Lipid Profile — Complete · 2 values need attention', time: '6:45 PM', unread: false, action: 'View report' },
  { id: 'n5', group: 'Yesterday', category: 'Payments', title: 'Payment successful', body: '₹849 paid for consultation with Dr. Arjun Mehta', time: '4:58 PM', unread: false },
  { id: 'n6', group: 'This week', category: 'Prescriptions', title: 'Refill reminder — Telma 40', body: 'Your 30-day course ends in 4 days', time: 'Mon', unread: false, action: 'Reorder' },
  { id: 'n7', group: 'This week', category: 'System', title: 'New device signed in', body: 'iPhone 16 Pro · Hyderabad, India', time: 'Sun', unread: false },
]

export const payments: PaymentRecord[] = [
  { id: 'pay1', type: 'Consultation', title: 'Dr. Arjun Mehta — Video', date: '5 Oct 2025', amount: 849, status: 'paid', method: 'UPI · aarav@okhdfcbank', ref: 'KDC2410A4821' },
  { id: 'pay2', type: 'Pharmacy', title: 'Medicine order — 3 items', date: '3 Oct 2025', amount: 263, status: 'paid', method: 'HDFC Credit Card •••• 4821', ref: 'KDC-PH-99421' },
  { id: 'pay3', type: 'Diagnostics', title: 'Lipid Profile — Dr. Lal PathLabs', date: '27 Sep 2025', amount: 699, status: 'paid', method: 'UPI · aarav@okhdfcbank', ref: 'KDC-DX-77118' },
  { id: 'pay4', type: 'Consultation', title: 'Dr. Sanjay Iyer — Video', date: '22 Sep 2025', amount: 549, status: 'paid', method: 'UPI · aarav@okhdfcbank', ref: 'KDC2409A4410' },
  { id: 'pay5', type: 'Consultation', title: 'Dr. Rohan Deshmukh — In-person', date: '23 Aug 2025', amount: 949, status: 'refunded', method: 'Refunded to source', ref: 'KDC2408A3914' },
]

export const addresses: Address[] = [
  { id: 'ad1', label: 'Home', line: 'Flat 402, Lotus Residency, Road No. 12', area: 'Banjara Hills, Hyderabad – 500034', phone: '+91 98490 42187', isDefault: true },
  { id: 'ad2', label: 'Office', line: '7th Floor, Cyber Gateway, Block C', area: 'HITEC City, Madhapur, Hyderabad – 500081', phone: '+91 98490 42187', isDefault: false },
  { id: 'ad3', label: 'Other', line: 'Plot 18, Sai Nagar Colony', area: 'Kompally, Secunderabad – 500100', phone: '+91 98661 20945', isDefault: false },
]

export const paymentMethods: PaymentMethod[] = [
  { id: 'pm1', kind: 'upi', label: 'aarav@okhdfcbank', sub: 'HDFC Bank · Default', brand: 'UPI' },
  { id: 'pm2', kind: 'card', label: 'HDFC Credit Card', sub: '•••• •••• •••• 4821 · Exp 09/28', brand: 'VISA' },
  { id: 'pm3', kind: 'card', label: 'ICICI Debit Card', sub: '•••• •••• •••• 7733 · Exp 02/27', brand: 'Mastercard' },
]

/** Baselines for the money summary card; payments made in the app add to these. */
export const paymentSummarySeed = { consultations: 1398, pharmacy: 453, diagnostics: 699 }

export const helpTopics: HelpTopic[] = [
  { id: 'ht1', title: 'Appointments', body: 'Booking, rescheduling and cancellation', articles: 14 },
  { id: 'ht2', title: 'Payments & Refunds', body: 'Charges, failed payments, refund timelines', articles: 11 },
  { id: 'ht3', title: 'Video Consultation', body: 'Joining, audio/video issues, waiting room', articles: 9 },
  { id: 'ht4', title: 'Pharmacy', body: 'Orders, delivery, returns and prescriptions', articles: 12 },
  { id: 'ht5', title: 'Diagnostics', body: 'Sample collection, preparation, reports', articles: 10 },
  { id: 'ht6', title: 'Account & Privacy', body: 'Profile, family members, data and security', articles: 8 },
]

export const helpQuestions = [
  {
    id: 'q1',
    question: 'How do I reschedule or cancel an appointment?',
    answer: 'Open the appointment from the Appointments tab, then choose Reschedule or Cancel. Cancelling at least one hour before the consultation refunds you in full.',
  },
  {
    id: 'q2',
    question: 'When will my refund be credited?',
    answer: 'Refunds reach the original payment method within 3–5 working days of the cancellation.',
  },
  {
    id: 'q3',
    question: 'The doctor has not joined the call — what should I do?',
    answer: 'Stay in the waiting room; you will see the expected delay there. If the doctor does not join within 15 minutes, the consultation is refunded automatically.',
  },
  {
    id: 'q4',
    question: 'How do I upload a prescription for medicines?',
    answer: 'Go to Pharmacy, tap Upload prescription, and take a photo or choose one from your gallery. A pharmacist verifies it before dispatch.',
  },
]
