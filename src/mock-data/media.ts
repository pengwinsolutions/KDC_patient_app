/**
 * Photography register.
 *
 * Every photograph used in the prototype is declared here so the asset set can
 * be swapped for licensed KDC+ photography in one place before production.
 * Images are real clinical/editorial photography — no illustrations, no
 * mascots. All crops share consistent aspect ratios per usage class.
 */

const CDN = 'https://images.unsplash.com/'

export function photo(id: string, w: number, h: number, q = 80) {
  return `${CDN}${id}?w=${w}&h=${h}&fit=crop&crop=faces,entropy&q=${q}&auto=format`
}

/** Portrait crop used for every doctor avatar and profile hero (4:5). */
export function portrait(id: string, w = 320) {
  return photo(id, w, Math.round(w * 1.25))
}

export const PORTRAIT_IDS = {
  arjun: 'photo-1612349317150-e413f6a5b16d',
  priya: 'photo-1559839734-2b71ea197ec2',
  rohan: 'photo-1582750433449-648ed127bb54',
  kavya: 'photo-1594824476967-48c8b964273f',
  sanjay: 'photo-1622253692010-333f2da6031d',
  neha: 'photo-1559757175-0eb30cd8c063',
  vikram: 'photo-1622902046580-2b47f47f5471',
  ananya: 'photo-1631217868264-e5b90bb7e133',
  imran: 'photo-1537368910025-700350fe46c7',
  meera: 'photo-1666214280557-f1b5022eb634',
  patientMale: 'photo-1607990281513-2c110a25bd8c',
  patientFemale: 'photo-1573496359142-b8d87734a5a2',
} as const

export const SCENE = {
  /** Onboarding 1 — consulting from anywhere (1:1 hero crop) */
  telehealth: photo('photo-1576091160550-2173dba999ef', 820, 840),
  /** Onboarding 2 — an Indian consultant, neutral ground so the sheet below reads clean */
  clinician: photo('photo-1612276529731-4b21494e6d71', 820, 840),
  /** Onboarding 3 — laboratory and connected records */
  records: photo('photo-1551884170-09fb70a3a2ed', 820, 840),
  /** Privacy — human trust (landscape band crop) */
  trust: photo('photo-1584515933487-779824d29309', 900, 520),
  /** Clinic & hospital context */
  hospital: photo('photo-1587351021759-3e566b6af7cc', 800, 460),
  ward: photo('photo-1538108149393-fbbd81895907', 800, 460),
  theatre: photo('photo-1516549655169-df83a0774514', 800, 460),
  /** Diagnostics */
  lab: photo('photo-1579154204601-01588f351e67', 800, 460),
  labTeam: photo('photo-1551884170-09fb70a3a2ed', 800, 460),
  homeCollection: photo('photo-1631815589968-fdb09a223b1e', 800, 460),
  /** Pharmacy */
  pills: photo('photo-1471864190281-a93a3070b6de', 600, 600),
  blister: photo('photo-1631549916768-4119b2e5f926', 600, 600),
  tablets: photo('photo-1628771065518-0d82f1938462', 600, 600),
  stethoscope: photo('photo-1505751172876-fa1923c5c528', 800, 460),
} as const

/** Doctor-app photography: clinicians at work, never patient-facing warmth. */
export const DOCTOR_SCENE = {
  /** Welcome hero — a consultant between cases */
  welcome: photo('photo-1582750433449-648ed127bb54', 820, 900),
  /** Clinical team, used behind verification and support */
  team: photo('photo-1551884170-09fb70a3a2ed', 900, 520),
  /** Theatre / procedure context */
  theatre: photo('photo-1516549655169-df83a0774514', 900, 520),
  /** Clinic exterior for the clinic-information screen */
  clinic: photo('photo-1587351021759-3e566b6af7cc', 900, 460),
} as const
