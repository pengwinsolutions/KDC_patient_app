import { Btn, Div, P, Span, TextAreaField, TextField } from '../primitives/index'
import { useLocal } from '../../hooks/useLocal'
import React from 'react'
import { Search, ChevronDown, Check } from '../primitives/icons'
import { SheetModal } from './Feedback'

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label?: string
  hint?: string
  error?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <Div className="gap-[7px]">
      {label && (
        <P className="block text-body-sm font-semibold text-ink-600">
          {label}
          {required && <Span className="ml-0.5 text-critical-600">*</Span>}
        </P>
      )}
      {children}
      {error ? (
        <P className="text-caption text-critical-600">{error}</P>
      ) : hint ? (
        <P className="text-caption text-ink-400">{hint}</P>
      ) : null}
    </Div>
  )
}

const inputBase =
  'h-[52px] w-full rounded-ctl bg-white px-4 text-body-lg text-ink-900 placeholder:text-ink-300 ring-1 ring-inset  ring-ink-200   focus:ring-[1.5px] ring-inset focus:border-brand-600'

export function Input({
  prefix,
  suffix,
  className = '',
  ...rest
}: Omit<Record<string, any>, 'prefix'> & { prefix?: React.ReactNode; suffix?: React.ReactNode }) {
  if (prefix || suffix) {
    return (
      <Div className="flex-row h-[52px] w-full items-center rounded-ctl bg-white px-4 ring-1 ring-inset  ring-ink-200  ">
        {prefix && <Div className="mr-3 flex-row items-center text-body-lg text-ink-600">{prefix}</Div>}
        <TextField
          className={`h-full min-w-0 flex-1 bg-transparent text-body-lg text-ink-900  placeholder:text-ink-300 ${className}`}
          {...rest}
        />
        {suffix && <Div className="ml-3 flex-row items-center">{suffix}</Div>}
      </Div>
    )
  }
  return <TextField className={`${inputBase} ${className}`} {...rest} />
}

export function TextArea({ className = '', ...rest }: Record<string, any>) {
  return (
    <TextAreaField
      className={`min-h-[104px] w-full  rounded-ctl bg-white p-4 text-body-lg text-ink-900 placeholder:text-ink-300 ring-1 ring-inset  ring-ink-200  focus:ring-[1.5px] ring-inset focus:border-brand-600 ${className}`}
      {...rest}
    />
  )
}

export function SelectField({
  value,
  placeholder = 'Select',
  className = '',
  onClick,
  options,
  sheetTitle,
  onChange,
}: {
  value?: string
  placeholder?: string
  className?: string
  onClick?: () => void
  /** When given, the field opens a bottom sheet listing these. */
  options?: string[]
  sheetTitle?: string
  onChange?: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Btn
        onPress={options ? () => setOpen(true) : onClick}
        className={`tap flex-row h-[52px] w-full items-center justify-between rounded-ctl bg-white px-4 text-left ring-1 ring-inset  ring-ink-200 ${className}`}
      >
        <Span className={`text-body-lg ${value ? 'text-ink-900' : 'text-ink-300'}`}>{value || placeholder}</Span>
        <ChevronDown className="h-[18px] w-[18px] text-ink-400" />
      </Btn>
      {options && (
        <SheetModal visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? placeholder}>
          <Div className="gap-2 pb-2">
            {options.map((option) => (
              <RadioRow
                key={option}
                title={option}
                selected={option === value}
                onClick={() => {
                  onChange?.(option)
                  setOpen(false)
                }}
              />
            ))}
          </Div>
        </SheetModal>
      )}
    </>
  )
}

export function SearchInput({
  placeholder = 'Search',
  value,
  onChange,
  onClick,
  onSubmit,
  trailing,
  readOnly,
  className = '',
}: {
  placeholder?: string
  value?: string
  onChange?: (v: string) => void
  onClick?: () => void
  onSubmit?: () => void
  trailing?: React.ReactNode
  readOnly?: boolean
  className?: string
}) {
  return (
    <Div
      onPress={onClick}
      className={`flex-row h-[48px] w-full items-center gap-2.5 rounded-ctl bg-ink-50 px-3.5 ring-1 ring-inset  ring-transparent   ${className}`}
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-ink-400" strokeWidth={2.2} />
      <TextField
        className="min-w-0 flex-1 bg-transparent text-body text-ink-900  placeholder:text-ink-400"
        placeholder={placeholder}
        value={value}
        readOnly={readOnly || Boolean(onClick)}
        onChange={(e: any) => onChange?.(e.target.value)}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
      />
      {trailing}
    </Div>
  )
}

/** 6-digit OTP entry. `filled` drives the mock state in the prototype. */
export function OtpInput({
  length = 6,
  value = '',
  error = false,
  focusIndex,
  onChange,
}: {
  length?: number
  value?: string
  error?: boolean
  focusIndex?: number
  onChange?: (v: string) => void
}) {
  const [code, setCode] = useLocal(value, onChange)
  const [edited, setEdited] = React.useState(false)
  const active = edited ? code.length : focusIndex ?? code.length
  return (
    <Div className="relative flex-row gap-2.5">
      {Array.from({ length }).map((_, i) => {
        const char = code[i]
        const isActive = i === active
        return (
          <Div
            key={i}
            className={`flex-col h-[58px] flex-1 items-center justify-center rounded-ctl text-title-md tabular-nums  ${
              error
                ? 'bg-critical-50 text-critical-700 ring-[1.5px] ring-inset  ring-critical-600'
                : char
                  ? 'bg-brand-50 text-ink-900 ring-1 ring-inset  ring-brand-200'
                  : isActive
                    ? 'bg-white text-ink-900 ring-[1.5px] ring-inset  ring-brand-600'
                    : 'bg-ink-50 text-ink-900 ring-1 ring-inset  ring-transparent'
            }`}
          >
            {char ?? (isActive ? <Span className="h-[26px] w-[2px] animate-pulse rounded-full bg-brand-600" /> : '')}
          </Div>
        )
      })}
      <TextField
        className="absolute inset-0 text-transparent"
        style={{ opacity: 0.011, color: 'transparent' }}
        caretHidden
        selectionColor="transparent"
        value={code}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        onChangeText={(v: string) => {
          setEdited(true)
          setCode(v.replace(/\D/g, ''))
        }}
      />
    </Div>
  )
}

export function Checkbox({
  checked,
  label,
  onClick,
}: {
  checked?: boolean
  label: React.ReactNode
  onClick?: () => void
}) {
  const [on, setOn] = useLocal(Boolean(checked))
  return (
    <Btn onPress={() => { setOn(!on); onClick?.() }} className="flex-row items-start gap-3 text-left">
      <Span
        className={`mt-[1px] flex-col h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[7px]  ${
          on ? 'bg-brand-600' : 'bg-white ring-1 ring-inset  ring-ink-300'
        }`}
      >
        {on && <Check className="h-[13px] w-[13px] text-white" strokeWidth={3.4} />}
      </Span>
      <Span className="text-body-sm leading-[19px] text-ink-600">{label}</Span>
    </Btn>
  )
}

export function RadioRow({
  selected,
  title,
  subtitle,
  leading,
  trailing,
  onClick,
}: {
  selected?: boolean
  title: React.ReactNode
  subtitle?: React.ReactNode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Btn
      onPress={onClick}
      className={`tap flex-row w-full items-center gap-3.5 rounded-tile bg-white p-4 text-left  ${
        selected ? 'ring-[1.5px] ring-inset  ring-brand-600' : 'ring-1 ring-inset  ring-ink-100'
      }`}
    >
      {leading}
      <Div className="min-w-0 flex-1">
        <P className="truncate text-title-sm text-ink-900">{title}</P>
        {subtitle && <P className="mt-0.5 truncate text-body-sm text-ink-500">{subtitle}</P>}
      </Div>
      {trailing}
      <Span
        className={`flex-col h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full  ${
          selected ? 'bg-brand-600' : 'ring-1 ring-inset  ring-ink-300'
        }`}
      >
        {selected && <Span className="h-[7px] w-[7px] rounded-full bg-white" />}
      </Span>
    </Btn>
  )
}

export function Toggle({ on: initial, onClick }: { on?: boolean; onClick?: () => void }) {
  const [on, setOn] = useLocal(Boolean(initial))
  return (
    <Btn
      onPress={() => { setOn(!on); onClick?.() }}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full  ${on ? 'bg-vital-600' : 'bg-ink-200'}`}
    >
      <Span
        className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(11,31,51,.2)] "
        style={{ left: on ? 22 : 2 }}
      />
    </Btn>
  )
}
