/* eslint-disable @typescript-eslint/no-require-imports -- lazy requires break import cycles between stores and live services */
import { LIVE } from '../services/config'
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
  if (LIVE) {
    // Ends the session on the server (and forgets the Keychain token), then drops everything loaded.
    const token = useSession.getState().token
    void (require('../services/live/http') as typeof import('../services/live/http')).endSession(token)
    ;(require('../services/live/sync') as typeof import('../services/live/sync')).clearAll()
    ;(require('./catalog') as typeof import('./catalog')).clearPatientCatalog()
  }
  useSession.getState().clear()
  const stores = [
    useAddresses, useAppointments, useBooking, useCart, useDiagnosticsDraft, useDiscovery, useFamily,
    useMembership, useNotifications, useOrders, usePayments, useProfile, useRecords, useSettings, useUploads,
  ]
  stores.forEach((store) => store.getState().reset())
}
