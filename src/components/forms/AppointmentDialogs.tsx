import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from '../primitives/icons'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Feedback'
import { rupee } from '../../mock-data/mock'
import { useNav } from '../../navigation/navigation'
import { LIVE } from '../../services/config'
import { errorMessage } from '../../services/errors'
import { useAppointments } from '../../store/appointments'
import { usePayments } from '../../store/payments'
import { showToast } from '../../store/toast'
import type { Appointment } from '../../types'

const liveAppointments = () => require('../../services/live/appointments') as typeof import('../../services/live/appointments')

/**
 * Asks before cancelling; on confirmation refunds and shows the cancelled state.
 * Live: the server quotes what cancelling now costs (free, or a late-cancellation fee).
 */
export function CancelAppointmentModal({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const nav = useNav()
  const [busy, setBusy] = useState(false)
  const quote = useQuery({
    queryKey: ['cancel-quote', appointment.id],
    queryFn: () => liveAppointments().cancellationQuote(appointment.id),
    enabled: LIVE,
    gcTime: 0,
  })
  const paid = appointment.fee + appointment.platformFee - appointment.discount
  const refund = LIVE ? quote.data?.refundAmount ?? (quote.data ? 0 : null) : paid
  const body = !LIVE
    ? `${rupee(paid)} will be refunded to the original payment method within 3–5 working days.`
    : !quote.data
      ? quote.isError
        ? errorMessage(quote.error, 'We could not check the refund. You can still cancel.')
        : 'Checking what you’ll get back…'
      : quote.data.free
        ? `${rupee(refund ?? 0)} will be refunded to the original payment method within 3–5 working days.`
        : `It’s past the free-cancellation time, so a ${rupee(quote.data.lateFee)} fee applies. ${rupee(refund ?? 0)} will be refunded within 3–5 working days.`
  const confirm = async () => {
    setBusy(true)
    try {
      await useAppointments.getState().cancel(appointment.id)
    } catch (e) {
      setBusy(false)
      showToast(errorMessage(e, 'We could not cancel. Please try again.'), 'critical')
      return
    }
    if (LIVE) void (require('../../services/live/sync') as typeof import('../../services/live/sync')).syncOne('payments')
    else usePayments.getState().markRefunded(appointment.bookingId)
    nav.navigate('st-cancelled', { replace: true })
  }
  return (
    <Modal
      tone="critical"
      icon={<AlertTriangle className="h-[26px] w-[26px]" strokeWidth={2} />}
      title="Cancel this appointment?"
      body={body}
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
