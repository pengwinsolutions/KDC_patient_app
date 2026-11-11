import {
  addressSchema,
  cardSchema,
  familySchema,
  formatMobile,
  loginSchema,
  maskMobile,
  medicalSchema,
  normalizeMobile,
  otpSchema,
  profileSchema,
  upiSchema,
} from '../../src/validation/schemas'

const errorOf = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? null : r.error?.issues[0].message

describe('mobile', () => {
  it('accepts exactly 10 digits, with spaces', () => {
    expect(loginSchema.safeParse({ mobile: '98490 42187' }).success).toBe(true)
    expect(loginSchema.safeParse({ mobile: '9849042187' }).success).toBe(true)
  })

  it('rejects too few or too many digits', () => {
    expect(errorOf(loginSchema.safeParse({ mobile: '98490' }))).toBe('Enter a 10-digit mobile number')
    expect(loginSchema.safeParse({ mobile: '984904218712' }).success).toBe(false)
  })

  it('normalizes, formats and masks', () => {
    expect(normalizeMobile('+91 98490 42187')).toBe('9849042187')
    expect(formatMobile('9849042187')).toBe('+91 98490 42187')
    expect(maskMobile('9849042187')).toBe('+91 98490 •••• 87')
  })
})

describe('otp', () => {
  it('needs six digits', () => {
    expect(otpSchema.safeParse({ code: '123456' }).success).toBe(true)
    expect(otpSchema.safeParse({ code: '1234' }).success).toBe(false)
    expect(otpSchema.safeParse({ code: 'abcdef' }).success).toBe(false)
  })
})

describe('profile', () => {
  const valid = { name: 'Aarav Sharma', dob: '14 Mar 1991', gender: 'Male', email: 'a@b.co', bloodGroup: 'O+', consent: true }

  it('accepts a complete profile and a blank email', () => {
    expect(profileSchema.safeParse(valid).success).toBe(true)
    expect(profileSchema.safeParse({ ...valid, email: '' }).success).toBe(true)
  })

  it('requires consent, a valid email and date', () => {
    expect(profileSchema.safeParse({ ...valid, consent: false }).success).toBe(false)
    expect(profileSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
    expect(profileSchema.safeParse({ ...valid, dob: '' }).success).toBe(false)
  })

  it('rejects digits in a name', () => {
    expect(profileSchema.safeParse({ ...valid, name: 'A1' }).success).toBe(false)
  })
})

describe('family member', () => {
  const valid = { name: 'Priya S', relation: 'Spouse', dob: '02 Jun 1994', gender: 'Female', blood: '', mobile: '' }

  it('allows an empty optional mobile', () => {
    expect(familySchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a partial mobile', () => {
    expect(familySchema.safeParse({ ...valid, mobile: '123' }).success).toBe(false)
  })

  it('requires dob and gender', () => {
    expect(familySchema.safeParse({ ...valid, dob: '' }).success).toBe(false)
    expect(familySchema.safeParse({ ...valid, gender: '' }).success).toBe(false)
  })
})

describe('address', () => {
  const valid = { label: 'Home', line: 'Flat 402, Lotus', area: 'Banjara Hills', pincode: '500034', phone: '9849042187' }

  it('needs a 6-digit PIN and full line', () => {
    expect(addressSchema.safeParse(valid).success).toBe(true)
    expect(addressSchema.safeParse({ ...valid, pincode: '5000' }).success).toBe(false)
    expect(addressSchema.safeParse({ ...valid, line: 'A' }).success).toBe(false)
  })
})

describe('payment details', () => {
  it('validates UPI IDs', () => {
    expect(upiSchema.safeParse({ upiId: 'aarav@okhdfc' }).success).toBe(true)
    expect(upiSchema.safeParse({ upiId: 'fail@upi' }).success).toBe(true)
    expect(upiSchema.safeParse({ upiId: 'no-at-sign' }).success).toBe(false)
  })

  it('validates card number, expiry and cvv', () => {
    const card = { number: '4111 1111 1111 1111', name: 'Aarav Sharma', expiry: '12/99', cvv: '123' }
    expect(cardSchema.safeParse(card).success).toBe(true)
    expect(cardSchema.safeParse({ ...card, number: '4111' }).success).toBe(false)
    expect(cardSchema.safeParse({ ...card, expiry: '01/20' }).success).toBe(false)
    expect(cardSchema.safeParse({ ...card, expiry: '13/99' }).success).toBe(false)
    expect(cardSchema.safeParse({ ...card, cvv: '12' }).success).toBe(false)
  })
})

describe('medical', () => {
  const valid = { bloodGroup: 'O+', height: '176 cm', weight: '74 kg', emergencyName: 'Priya Sharma', emergencyRelation: 'Spouse', emergencyMobile: '+91 98661 20945' }

  it('accepts the seeded medical record and rejects bad values', () => {
    expect(medicalSchema.safeParse(valid).success).toBe(true)
    expect(medicalSchema.safeParse({ ...valid, height: 'tall' }).success).toBe(false)
    expect(medicalSchema.safeParse({ ...valid, emergencyMobile: '123' }).success).toBe(false)
  })
})
