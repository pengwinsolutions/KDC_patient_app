import React, { useState } from 'react'
import { AlertTriangle } from '../primitives/icons'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Feedback'
import { rupee } from '../../mock-data/mock'
import { useNav } from '../../navigation/navigation'
import { useAppointments } from '../../store/appointments'
import { usePayments } from '../../store/payments'
import type { Appointment } from '../../types'

/** Asks before cancelling; on confirmation refunds and shows the cancelled state. */
export function CancelAppointmentModal({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const nav = useNav()
  const [busy, setBusy] = useState(false)
  const refund = appointment.fee + appointment.platformFee - appointment.discount
  const confirm = async () => {
    setBusy(true)
    await useAppointments.getState().cancel(appointment.id)
    usePayments.getState().markRefunded(appointment.bookingId)
    nav.navigate('st-cancelled', { replace: true })
  }
  return (
    <Modal
      tone="critical"
      icon={<AlertTriangle className="h-[26px] w-[26px]" strokeWidth={2} />}
      title="Cancel this appointment?"
      body={`${rupee(refund)} will be refunded to the original payment method within 3–5 working days.`}
      actions={
        <>
          <Button variant="danger" loading={busy} onClick={confirm}>
            Yes, cancel appointment
          </Button>
          <Button variant="tertiary" onClick={onClose}>
            Keep my appointment
          </Button>
        </>
      }
    />
  )
}
