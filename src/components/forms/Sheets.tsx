import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Address, FamilyMember } from '../../types'
import { Div, Span } from '../primitives'
import { Button } from '../ui/Button'
import { Field, RadioRow } from '../ui/Inputs'
import { SheetModal } from '../ui/Feedback'
import { FormInput, ChoiceChips } from './Fields'
import { addressSchema, cardSchema, normalizeMobile, formatMobile, upiSchema, type AddressForm, type CardForm, type UpiForm } from '../../validation/schemas'
import { useAddresses } from '../../store/addresses'
import { usePayments } from '../../store/payments'
import { patientLabel } from '../../store/family'
import { showToast } from '../../store/toast'

/* ---------------------------------------------------------------- Address */

const ADDRESS_LABELS: AddressForm['label'][] = ['Home', 'Office', 'Other']
const PIN_SEPARATOR = ' – '

function addressDefaults(address?: Address): AddressForm {
  const [area, pincode] = (address?.area ?? '').split(PIN_SEPARATOR)
  return {
    label: address?.label ?? 'Home',
    line: address?.line ?? '',
    area: area ?? '',
    pincode: pincode ?? '',
    phone: address ? normalizeMobile(address.phone) : '',
  }
}

/** Adds an address, or edits and deletes one when `address` is given. */
export function AddressFormSheet({ visible, address, onClose }: { visible: boolean; address?: Address; onClose: () => void }) {
  const { add, update, remove } = useAddresses.getState()
  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: addressDefaults(address),
  })
  useEffect(() => {
    if (visible) reset(addressDefaults(address))
  }, [visible, address, reset])

  const save = handleSubmit(async ({ label, line, area, pincode, phone }) => {
    const changes = { label, line, area: `${area}${PIN_SEPARATOR}${pincode}`, phone: formatMobile(phone) }
    if (address) await update(address.id, changes)
    else await add(changes)
    showToast(address ? 'Address updated' : 'Address added')
    onClose()
  })

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={address ? 'Edit address' : 'Add a new address'}
      footer={
        <Div className="gap-2.5">
          <Button loading={formState.isSubmitting} onClick={save}>
            {address ? 'Save address' : 'Add address'}
          </Button>
          {address && (
            <Button
              variant="text"
              className="!text-critical-600"
              onClick={async () => {
                await remove(address.id)
                showToast('Address removed')
                onClose()
              }}
            >
              Delete address
            </Button>
          )}
        </Div>
      }
    >
      <Div className="gap-4 pb-2">
        <Field label="Save as">
          <Div className="flex-row gap-2">
            <ChoiceChips
              options={ADDRESS_LABELS}
              value={watch('label')}
              onChange={(v) => setValue('label', v as AddressForm['label'])}
              chipClass="tap h-[40px] rounded-chip px-4 text-body-sm font-semibold"
            />
          </Div>
        </Field>
        <FormInput control={control} name="line" label="Flat, building and street" required placeholder="Flat 402, Lotus Residency" />
        <FormInput control={control} name="area" label="Area and city" required placeholder="Banjara Hills, Hyderabad" />
        <Div className=" grid-cols-2 gap-3">
          <FormInput control={control} name="pincode" label="PIN code" required inputMode="numeric" maxLength={6} placeholder="500034" />
          <FormInput control={control} name="phone" label="Mobile" required inputMode="numeric" placeholder="98490 42187" />
        </Div>
      </Div>
    </SheetModal>
  )
}

/* ------------------------------------------------------------------- UPI */

export function UpiFormSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { control, handleSubmit, reset } = useForm<UpiForm>({
    resolver: zodResolver(upiSchema),
    defaultValues: { upiId: '' },
  })
  useEffect(() => {
    if (visible) reset({ upiId: '' })
  }, [visible, reset])
  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Add new UPI ID"
      footer={
        <Button
          onClick={handleSubmit(({ upiId }) => {
            usePayments.getState().addUpi(upiId.trim())
            onClose()
          })}
        >
          Verify and add
        </Button>
      }
    >
      <Div className="pb-2">
        <FormInput control={control} name="upiId" label="UPI ID" required placeholder="name@bank" autoCapitalize="none" autoCorrect={false} />
      </Div>
    </SheetModal>
  )
}

/* ------------------------------------------------------------------ Card */

export function CardFormSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const blank: CardForm = { number: '', name: '', expiry: '', cvv: '' }
  const { control, handleSubmit, reset } = useForm<CardForm>({
    resolver: zodResolver(cardSchema),
    defaultValues: blank,
  })
  useEffect(() => {
    if (visible) reset({ number: '', name: '', expiry: '', cvv: '' })
  }, [visible, reset])
  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Add credit or debit card"
      footer={
        <Button
          onClick={handleSubmit(({ number, name, expiry }) => {
            usePayments.getState().addCard(number.replace(/\D/g, '').slice(-4), expiry, name)
            onClose()
          })}
        >
          Save card
        </Button>
      }
    >
      <Div className="gap-4 pb-2">
        <FormInput control={control} name="number" label="Card number" required inputMode="numeric" maxLength={19} placeholder="0000 0000 0000 0000" />
        <FormInput control={control} name="name" label="Name on card" required placeholder="As printed on the card" />
        <Div className=" grid-cols-2 gap-3">
          <FormInput control={control} name="expiry" label="Expiry" required inputMode="numeric" maxLength={5} placeholder="MM/YY" />
          <FormInput control={control} name="cvv" label="CVV" required inputMode="numeric" maxLength={3} secureTextEntry placeholder="•••" />
        </Div>
      </Div>
    </SheetModal>
  )
}

/* ------------------------------------------------- Family member chooser */

export function PatientPickerSheet({
  visible,
  members,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean
  members: FamilyMember[]
  selectedId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <SheetModal visible={visible} onClose={onClose} title="Who is this consultation for?">
      <Div className="gap-2 pb-2">
        {members.map((m) => (
          <RadioRow
            key={m.id}
            title={patientLabel(m)}
            subtitle={<Span>{m.age} yrs · {m.gender}</Span>}
            selected={m.id === selectedId}
            onClick={() => {
              onSelect(m.id)
              onClose()
            }}
          />
        ))}
      </Div>
    </SheetModal>
  )
}
