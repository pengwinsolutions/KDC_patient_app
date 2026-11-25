import React from 'react'
import { Platform } from 'react-native'
import { act, type ReactTestInstance } from 'react-test-renderer'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useForm } from 'react-hook-form'
import { cleanup, press, render, textOf } from '../../test-utils/harness'
import { FormDate, FormSelect } from '../../src/components/forms/Fields'
import { Btn } from '../../src/components/primitives'

afterEach(cleanup)

let submitted: Record<string, string> | undefined

function Form() {
  const { control, handleSubmit } = useForm({ defaultValues: { gender: '', dob: '14 Mar 1991' } })
  return (
    <>
      <FormSelect control={control} name="gender" label="Gender" placeholder="Choose" options={['Male', 'Female']} />
      <FormDate control={control} name="dob" label="Date of birth" />
      <Submit onSubmit={handleSubmit((v) => { submitted = v })} />
    </>
  )
}

function Submit({ onSubmit }: { onSubmit: () => void }) {
  return <Btn onPress={onSubmit}>Submit</Btn>
}

describe('select and date fields', () => {
  beforeEach(() => {
    submitted = undefined
  })

  it('opens a bottom sheet of options and reports the choice', async () => {
    const r = await render(<Form />)
    await press(r.root, 'Choose')
    expect(textOf(r.root)).toContain('Female')
    await press(r.root, 'Female')
    await press(r.root, 'Submit')
    expect(submitted?.gender).toBe('Female')
  })

  describe('date of birth on the native picker', () => {
    const picker = (root: ReactTestInstance) => root.findByProps({ testID: 'date-of-birth-picker' })

    it('iOS: opens the native wheel on the current value, with no future dates, and reports the new date on Done', async () => {
      const r = await render(<Form />)
      await press(r.root, '14 Mar 1991')
      const wheel = picker(r.root)
      expect(wheel.props).toMatchObject({ mode: 'date', display: 'spinner', value: new Date(1991, 2, 14) })
      expect(wheel.props.maximumDate.getTime()).toBeLessThanOrEqual(Date.now())
      expect(wheel.props.accentColor).toBe('#0068C8')
      expect(textOf(r.root)).toContain('14 March 1991')
      await act(async () => wheel.props.onChange({ type: 'set', nativeEvent: {} }, new Date(1991, 5, 20)))
      // The header follows the wheel: weekday, full date and the age it gives.
      const today = new Date()
      const age = today.getFullYear() - 1991 - (today.getMonth() > 5 || (today.getMonth() === 5 && today.getDate() >= 20) ? 0 : 1)
      expect(textOf(r.root)).toContain('Thursday')
      expect(textOf(r.root)).toContain('20 June 1991')
      expect(textOf(r.root)).toContain(`${age} years old`)
      await press(r.root, 'Done')
      await press(r.root, 'Submit')
      expect(submitted?.dob).toBe('20 Jun 1991')
    })

    describe('Android', () => {
      beforeEach(() => {
        jest.replaceProperty(Platform, 'OS', 'android')
      })
      afterEach(() => {
        jest.restoreAllMocks()
      })

      it('opens the system date dialog and reports the picked date', async () => {
        // Material's picker speaks UTC midnights both ways (a local midnight showed a day early east of UTC).
        const open = jest.spyOn(DateTimePickerAndroid, 'open').mockImplementation((p) => p.onChange?.({ type: 'set', nativeEvent: { timestamp: 0, utcOffset: 0 } }, new Date(Date.UTC(1991, 1, 28))))
        const r = await render(<Form />)
        await act(async () => press(r.root, '14 Mar 1991'))
        expect(open).toHaveBeenCalledWith(
          expect.objectContaining({ mode: 'date', design: 'material', title: 'Date of birth', timeZoneName: 'UTC', value: new Date(Date.UTC(1991, 2, 14)) }),
        )
        expect(r.root.findAllByProps({ testID: 'date-of-birth-picker' })).toHaveLength(0)
        await press(r.root, 'Submit')
        expect(submitted?.dob).toBe('28 Feb 1991')
      })

      it('keeps the old date when the dialog is cancelled', async () => {
        jest.spyOn(DateTimePickerAndroid, 'open').mockImplementation((p) => p.onChange?.({ type: 'dismissed', nativeEvent: { timestamp: 0, utcOffset: 0 } }, undefined))
        const r = await render(<Form />)
        await act(async () => press(r.root, '14 Mar 1991'))
        await press(r.root, 'Submit')
        expect(submitted?.dob).toBe('14 Mar 1991')
      })
    })
  })
})
