import { z } from 'zod'

const digits = (s: string) => s.replace(/\D/g, '')

/** Accepts spaces and a +91 prefix; what matters is the 10 digits. */
const stripCountry = (s: string) => {
  const d = digits(s)
  return d.length === 12 && d.startsWith('91') ? d.slice(2) : d
}

const requiredMobile = z.string().refine((s) => stripCountry(s).length === 10, 'Enter a 10-digit mobile number')

const optionalMobile = z.string().refine((s) => !s.trim() || stripCountry(s).length === 10, 'Enter a 10-digit mobile number')

const personName = z
  .string()
  .trim()
  .min(2, 'Enter the full name')
  .regex(/^[\p{L} .'-]+$/u, 'Use letters only')

export const normalizeMobile = stripCountry

export const formatMobile = (mobile: string) => {
  const d = stripCountry(mobile)
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`
}

export const maskMobile = (mobile: string) => {
  const d = stripCountry(mobile)
  return `+91 ${d.slice(0, 5)} •••• ${d.slice(8)}`
}

export const loginSchema = z.object({ mobile: requiredMobile })
export type LoginForm = z.infer<typeof loginSchema>

export const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter all 6 digits of the code'),
})
export type OtpForm = z.infer<typeof otpSchema>

export const profileSchema = z.object({
  name: personName,
  dob: z.string().min(1, 'Select your date of birth'),
  gender: z.string().min(1, 'Select your gender'),
  email: z.union([z.literal(''), z.email('Enter a valid email address')]),
  bloodGroup: z.string(),
  consent: z.boolean().refine(Boolean, 'Your consent is needed to store health information'),
})
export type ProfileForm = z.infer<typeof profileSchema>

export const familySchema = z.object({
  name: personName,
  relation: z.string().min(1, 'Select a relationship'),
  dob: z.string().min(1, 'Select a date of birth'),
  gender: z.string().min(1, 'Select a gender'),
  blood: z.string(),
  mobile: optionalMobile,
})
export type FamilyForm = z.infer<typeof familySchema>

export const addressSchema = z.object({
  label: z.enum(['Home', 'Office', 'Other']),
  line: z.string().trim().min(5, 'Enter the flat, building and street'),
  area: z.string().trim().min(3, 'Enter the area and city'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  phone: requiredMobile,
})
export type AddressForm = z.infer<typeof addressSchema>

export const upiSchema = z.object({
  upiId: z.string().trim().regex(/^[\w.-]{2,}@[a-zA-Z]{2,}$/, 'Enter a valid UPI ID, like name@bank'),
})
export type UpiForm = z.infer<typeof upiSchema>

const expiryIsFuture = (value: string, now = new Date()) => {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  if (month < 1 || month > 12) return false
  const lastMoment = new Date(2000 + Number(match[2]), month, 0, 23, 59, 59)
  return lastMoment >= now
}

export const cardSchema = z.object({
  number: z.string().refine((s) => digits(s).length === 16, 'Enter the 16-digit card number'),
  name: personName,
  expiry: z.string().refine((s) => expiryIsFuture(s), 'Enter a valid expiry, as MM/YY'),
  cvv: z.string().regex(/^\d{3}$/, 'Enter the 3-digit CVV'),
})
export type CardForm = z.infer<typeof cardSchema>

export const medicalSchema = z.object({
  bloodGroup: z.string().min(1, 'Select a blood group'),
  height: z.string().trim().regex(/^\d{2,3}(\.\d)?\s*(cm)?$/i, 'Enter height in cm'),
  weight: z.string().trim().regex(/^\d{1,3}(\.\d)?\s*(kg)?$/i, 'Enter weight in kg'),
  emergencyName: personName,
  emergencyRelation: z.string().trim().min(2, 'Enter the relationship'),
  emergencyMobile: requiredMobile,
})
export type MedicalForm = z.infer<typeof medicalSchema>

/**
 * Live: a new patient's record starts empty, so every part is optional; what is entered
 * must be valid, and an emergency contact needs a name and a mobile number together.
 */
export const medicalSchemaLive = z
  .object({
    bloodGroup: z.string(),
    height: z.union([z.literal(''), z.string().trim().regex(/^\d{2,3}(\.\d)?\s*(cm)?$/i, 'Enter height in cm')]),
    weight: z.union([z.literal(''), z.string().trim().regex(/^\d{1,3}(\.\d)?\s*(kg)?$/i, 'Enter weight in kg')]),
    emergencyName: z.union([z.literal(''), personName]),
    emergencyRelation: z.string().trim(),
    emergencyMobile: optionalMobile,
  })
  .refine((f) => !f.emergencyName.trim() || f.emergencyMobile.trim(), { path: ['emergencyMobile'], message: 'Enter the contact’s mobile number' })
  .refine((f) => !f.emergencyMobile.trim() || f.emergencyName.trim(), { path: ['emergencyName'], message: 'Enter the contact’s name' })
