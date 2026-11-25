import {
  addEntry,
  bmi,
  essentials,
  ITEM_MAX_LENGTH,
  LIST_MAX_ITEMS,
  measureError,
  HEIGHT_CM,
  WEIGHT_KG,
  openSuggestions,
  parseMeasure,
  toApiBlood,
  toDisplayBlood,
} from '../../src/domain/medical'

describe('blood group', () => {
  it('saves every picker spelling in the server’s form, so negative groups are never lost', () => {
    expect(['A−', 'B−', 'O−', 'AB−'].map(toApiBlood)).toEqual(['A-', 'B-', 'O-', 'AB-'])
    expect(toApiBlood('o–')).toBe('O-')
    expect(toApiBlood(' ab+ ')).toBe('AB+')
    expect(toApiBlood('Don’t know')).toBeNull()
    expect(toApiBlood('')).toBeNull()
  })
  it('shows the stored value as the picker’s chip, so editing preselects it', () => {
    expect(toDisplayBlood('O-')).toBe('O−')
    expect(toDisplayBlood('AB+')).toBe('AB+')
    expect(toDisplayBlood(null)).toBe('')
  })
})

describe('measurements', () => {
  it('reads numbers with or without units, one decimal at most', () => {
    expect(parseMeasure('172')).toBe(172)
    expect(parseMeasure('172.5 cm')).toBe(172.5)
    expect(parseMeasure('68.5kg')).toBe(68.5)
    expect(parseMeasure('tall')).toBeNull()
    expect(parseMeasure('68.55')).toBeNull()
  })
  it('uses the server’s ranges, so Save never fails on them', () => {
    expect(measureError('', HEIGHT_CM, 'cm')).toBeNull()
    expect(measureError('172', HEIGHT_CM, 'cm')).toBeNull()
    expect(measureError('300', HEIGHT_CM, 'cm')).toBe('Between 30 and 250 cm')
    expect(measureError('0', WEIGHT_KG, 'kg')).toBe('Between 1 and 300 kg')
    expect(measureError('abc', WEIGHT_KG, 'kg')).toBe('Enter a number in kg')
  })
  it('BMI uses the Asian adult cut-offs, and none for children', () => {
    expect(bmi(170, 60)).toEqual({ value: 20.8, band: 'Healthy' })
    expect(bmi(170, 68)).toEqual({ value: 23.5, band: 'Overweight' })
    expect(bmi(170, 75)?.band).toBe('Obese')
    expect(bmi(170, 50)?.band).toBe('Underweight')
    expect(bmi(140, 35, 12)).toBeNull()
    expect(bmi(null, 60)).toBeNull()
  })
})

describe('lists', () => {
  it('adds trimmed entries once, case-insensitively', () => {
    expect(addEntry(['Penicillin'], '  Latex ')).toEqual({ list: ['Penicillin', 'Latex'], error: null })
    expect(addEntry(['Penicillin'], 'penicillin')).toEqual({ list: ['Penicillin'], error: 'penicillin is already added' })
    expect(addEntry([], '   ').error).toBeNull()
  })
  it('keeps to the server’s limits', () => {
    expect(addEntry([], 'x'.repeat(ITEM_MAX_LENGTH + 1)).error).toMatch(/under 120/)
    const full = Array.from({ length: LIST_MAX_ITEMS }, (_, i) => `Item ${i}`)
    expect(addEntry(full, 'One more').error).toBe('Up to 30 entries')
  })
  it('offers only suggestions not already added', () => {
    expect(openSuggestions('allergies', ['penicillin'])).not.toContain('Penicillin')
  })
})

test('essentials: blood group, measurements and an emergency contact', () => {
  const empty = { bloodGroup: '', height: '', weight: '', allergies: [], conditions: [], medications: [], surgeries: [], emergency: { name: '', relation: '', mobile: '' } }
  expect(essentials(empty).filter((e) => e.done)).toHaveLength(0)
  const full = { ...empty, bloodGroup: 'O-', height: '172 cm', weight: '68 kg', emergency: { name: 'Asha', relation: 'Spouse', mobile: '98765 43210' } }
  expect(essentials(full).every((e) => e.done)).toBe(true)
})
