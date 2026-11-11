import React from 'react'
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

  it('opens the date sheet on the current value and reports a new date', async () => {
    const r = await render(<Form />)
    await press(r.root, '14 Mar 1991')
    expect(textOf(r.root)).toContain('Year')
    await press(r.root, 'Jun')
    await press(r.root, '20')
    await press(r.root, 'Done')
    await press(r.root, 'Submit')
    expect(submitted?.dob).toBe('20 Jun 1991')
  })

  it('clamps the day to the chosen month', async () => {
    const r = await render(<Form />)
    await press(r.root, '14 Mar 1991')
    await press(r.root, '31')
    await press(r.root, 'Feb')
    await press(r.root, 'Done')
    await press(r.root, 'Submit')
    expect(submitted?.dob).toBe('28 Feb 1991')
  })
})
