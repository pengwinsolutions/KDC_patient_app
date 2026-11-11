import React from 'react'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Btn } from '../primitives'
import { Field, Input, SelectField } from '../ui/Inputs'
import { DateField } from '../ui/DateField'

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  required?: boolean
  hint?: string
}

/** A labelled text input bound to a form field, with its inline error. */
export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  ...input
}: BaseProps<T> & Omit<Record<string, any>, 'control' | 'name' | 'label'>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Field label={label} required={required} hint={hint} error={fieldState.error?.message}>
      <Input value={field.value ?? ''} onChangeText={field.onChange} onBlur={field.onBlur} {...input} />
    </Field>
  )
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  options,
  placeholder,
}: BaseProps<T> & { options: string[]; placeholder?: string }) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Field label={label} required={required} hint={hint} error={fieldState.error?.message}>
      <SelectField value={field.value} placeholder={placeholder} options={options} sheetTitle={label} onChange={field.onChange} />
    </Field>
  )
}

export function FormDate<T extends FieldValues>({
  control,
  name,
  label,
  required,
  hint,
  placeholder,
}: BaseProps<T> & { placeholder?: string }) {
  const { field, fieldState } = useController({ control, name })
  return (
    <Field label={label} required={required} hint={hint} error={fieldState.error?.message}>
      <DateField value={field.value} placeholder={placeholder} sheetTitle={label} onChange={field.onChange} />
    </Field>
  )
}

export const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'O+', 'O−', 'AB+', 'AB−']

/** Single-choice chips; `chipClass` carries each form's blueprint sizing. */
export function ChoiceChips({
  options,
  value,
  onChange,
  chipClass,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
  chipClass: string
}) {
  return (
    <>
      {options.map((o) => (
        <Btn
          key={o}
          onPress={() => onChange(o)}
          className={`${chipClass} ${o === value ? 'bg-brand-600 text-white shadow-cta' : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200'}`}
        >
          {o}
        </Btn>
      ))}
    </>
  )
}
