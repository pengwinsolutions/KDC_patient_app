/**
 * The medical information workflow: what's shown and what's missing, editing by section with
 * suggestions, values checked by the server's limits, negative blood groups kept, unsaved changes
 * protected, each family member's own record, and a real call to the emergency contact.
 */
import React from 'react'
import { Linking, TextInput } from 'react-native'
import { act } from 'react-test-renderer'
import { cleanup, nav, press, render, resetNav, textOf, type } from '../../test-utils/harness'
import { MedicalInfoEditScreen, MedicalInfoScreen } from '../../src/screens/medical'
import { useProfile } from '../../src/store/profile'
import { useFamily } from '../../src/store/family'
import { services } from '../../src/services'
import type { MedicalInfo } from '../../src/types'

jest.mock('../../src/navigation/navigation', () => ({ useNav: () => require('../../test-utils/harness').nav }))
// The editor guards leaving through React Navigation's beforeRemove; the test drives it.
const mockListeners: Record<string, (e: unknown) => void> = {}
const mockDispatch = jest.fn()
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    addListener: (event: string, fn: (e: unknown) => void) => {
      mockListeners[event] = fn
      return () => delete mockListeners[event]
    },
    dispatch: mockDispatch,
  }),
}))

const EMPTY: MedicalInfo = { bloodGroup: '', allergies: [], conditions: [], medications: [], surgeries: [], emergency: { name: '', relation: '', mobile: '' }, height: '', weight: '' }

beforeEach(() => {
  resetNav()
  mockDispatch.mockClear()
  useProfile.getState().setMedical({ ...EMPTY, bloodGroup: 'O-', height: '170 cm', weight: '68 kg', allergies: ['Penicillin'] })
  useFamily.getState().setAll([
    { id: '1', name: 'Ravi Teja', relation: 'Self', age: 36, dob: '14 Mar 1990', gender: 'Male', blood: 'O-', primary: true, records: 0 },
    { id: '2', name: 'Lakshmi Teja', relation: 'Mother', age: 61, dob: '12 May 1965', gender: 'Female', blood: '', records: 0 },
  ])
})
afterEach(async () => {
  jest.restoreAllMocks()
  await cleanup()
})

describe('viewing', () => {
  it('shows the record with a negative blood group, BMI by Asian cut-offs, and what’s missing', async () => {
    const r = await render(<MedicalInfoScreen />)
    const text = textOf(r.root)
    expect(text).toContain('O−')
    expect(text).toContain('BMI 23.5')
    expect(text).toContain('Overweight')
    expect(text).toContain('2 of 3')
    expect(text).toContain('Add emergency contact')
    expect(text).toContain('Penicillin')
    expect(text).toContain('Shared only with doctors you consult')
  })

  it('opens the editor at the section that was tapped, for this person', async () => {
    const r = await render(<MedicalInfoScreen />)
    await press(r.root, 'Add emergency contact')
    expect(nav.navigate).toHaveBeenLastCalledWith('medical-info-edit', { params: { memberId: '1', focus: 'emergency' } })
    await press(r.root, 'Add to Current medication')
    expect(nav.navigate).toHaveBeenLastCalledWith('medical-info-edit', { params: { memberId: '1', focus: 'medications' } })
  })

  it('switches to a family member’s own record', async () => {
    const load = jest.spyOn(services.profile, 'loadMedical').mockResolvedValue({ ...EMPTY, allergies: ['Sulfa drugs'], bloodGroup: 'B+' })
    const r = await render(<MedicalInfoScreen />)
    await press(r.root, 'Lakshmi Teja')
    expect(load).toHaveBeenCalledWith('2')
    expect(textOf(r.root)).toContain('Sulfa drugs')
    expect(textOf(r.root)).toContain('Mother · 61 yrs')
  })

  it('calls the emergency contact for real', async () => {
    useProfile.getState().setMedical({ ...useProfile.getState().medical, emergency: { name: 'Asha Rao', relation: 'Spouse', mobile: '98765 43210' } })
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    const r = await render(<MedicalInfoScreen />)
    await press(r.root, 'Call Asha Rao')
    expect(open).toHaveBeenCalledWith('tel:+919876543210')
  })
})

describe('editing', () => {
  it('preselects the saved negative blood group and saves it in the server’s form', async () => {
    const save = jest.spyOn(services.profile, 'saveMedical').mockImplementation(async (info) => info)
    const r = await render(<MedicalInfoEditScreen />)
    expect(r.root.findAll((n) => n.props.accessibilityLabel === 'Blood group O−, selected').length).toBeGreaterThan(0)
    await press(r.root, 'Blood group AB−')
    await press(r.root, 'Save medical information')
    expect(save.mock.calls[0][0].bloodGroup).toBe('AB-')
    expect(save.mock.calls[0][1]).toBeUndefined() // the account holder
    expect(useProfile.getState().medical.bloodGroup).toBe('AB-')
    expect(nav.back).toHaveBeenCalled()
  })

  it('"Don’t know" saves no blood group', async () => {
    const save = jest.spyOn(services.profile, 'saveMedical').mockImplementation(async (info) => info)
    const r = await render(<MedicalInfoEditScreen />)
    await press(r.root, 'Blood group Don’t know')
    await press(r.root, 'Save medical information')
    expect(save.mock.calls[0][0].bloodGroup).toBe('')
  })

  it('adds from suggestions, refuses duplicates, and saves nothing until something changes', async () => {
    const save = jest.spyOn(services.profile, 'saveMedical').mockImplementation(async (info) => info)
    const r = await render(<MedicalInfoEditScreen />)
    expect(textOf(r.root)).toContain('No changes yet')
    await press(r.root, 'Add Latex')
    await type(r.root, 'Type an allergy and press enter', 'penicillin')
    await act(async () => r.root.findAll((n) => n.type === TextInput && n.props.placeholder === 'Type an allergy and press enter')[0].props.onSubmitEditing())
    expect(textOf(r.root)).toContain('penicillin is already added')
    await press(r.root, 'Save medical information')
    expect(save.mock.calls[0][0].allergies).toEqual(['Penicillin', 'Latex'])
  })

  it('checks height and weight by the server’s limits, and shows BMI as you type', async () => {
    const save = jest.spyOn(services.profile, 'saveMedical').mockImplementation(async (info) => info)
    const r = await render(<MedicalInfoEditScreen />)
    await type(r.root, '170', '300')
    await press(r.root, 'Save medical information')
    expect(textOf(r.root)).toContain('Between 30 and 250 cm')
    expect(save).not.toHaveBeenCalled()
    await type(r.root, '170', '165')
    expect(textOf(r.root)).toContain('BMI 25')
    await press(r.root, 'Save medical information')
    expect(save.mock.calls[0][0]).toMatchObject({ height: '165 cm', weight: '68 kg' })
  })

  it('asks before throwing away unsaved changes', async () => {
    const r = await render(<MedicalInfoEditScreen />)
    const leave = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } }
    // Nothing changed: leaving is free.
    await act(async () => mockListeners.beforeRemove(leave))
    expect(leave.preventDefault).not.toHaveBeenCalled()
    await press(r.root, 'Add Latex')
    await act(async () => mockListeners.beforeRemove(leave))
    expect(leave.preventDefault).toHaveBeenCalled()
    expect(textOf(r.root)).toContain('Discard your changes?')
    await press(r.root, 'Keep editing')
    expect(textOf(r.root)).not.toContain('Discard your changes?')
    await act(async () => mockListeners.beforeRemove(leave))
    await press(r.root, 'Discard changes')
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' })
  })

  it('edits a family member’s own record', async () => {
    jest.spyOn(services.profile, 'loadMedical').mockResolvedValue({ ...EMPTY })
    const save = jest.spyOn(services.profile, 'saveMedical').mockImplementation(async (info) => info)
    nav.params = { memberId: '2', focus: 'allergies' }
    const r = await render(<MedicalInfoEditScreen />)
    expect(textOf(r.root)).toContain('Lakshmi Teja')
    await press(r.root, 'Add Aspirin')
    await press(r.root, 'Save medical information')
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ allergies: ['Aspirin'] }), '2')
    // The account holder's record is untouched.
    expect(useProfile.getState().medical.allergies).toEqual(['Penicillin'])
  })
})
