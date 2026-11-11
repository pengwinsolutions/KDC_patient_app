import { useAddresses } from './addresses'
import { useAppointments } from './appointments'
import { useBooking } from './booking'
import { useCart } from './cart'
import { useDiagnosticsDraft } from './diagnosticsDraft'
import { useDiscovery } from './discovery'
import { useFamily } from './family'
import { useMembership } from './membership'
import { useNotifications } from './notifications'
import { useOrders } from './orders'
import { usePayments } from './payments'
import { useProfile } from './profile'
import { useRecords } from './records'
import { useSession } from './session'
import { useSettings } from './settings'
import { useUploads } from './uploads'

/**
 * Ends the session and wipes the patient's health data from this device, so
 * the next person to sign in on a shared phone never sees it.
 */
export function logout() {
  useSession.getState().clear()
  const stores = [
    useAddresses, useAppointments, useBooking, useCart, useDiagnosticsDraft, useDiscovery, useFamily,
    useMembership, useNotifications, useOrders, usePayments, useProfile, useRecords, useSettings, useUploads,
  ]
  stores.forEach((store) => store.getState().reset())
}
