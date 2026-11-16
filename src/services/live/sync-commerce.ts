/**
 * Live sync for pharmacy and diagnostics:
 * - 'commerce-catalog': medicine and test categories, and the first page of each catalogue.
 * - 'orders': the patient's pharmacy orders and lab bookings. Clearing it also empties the cart,
 *   prescription uploads and the lab booking in progress.
 * - 'reports': the patient's lab reports.
 */
import { useCatalog } from '../../store/catalog'
import { useCart } from '../../store/cart'
import { useDiagnosticsDraft } from '../../store/diagnosticsDraft'
import { useOrders } from '../../store/orders'
import { useUploads } from '../../store/uploads'
import { listLabBookings, loadTestCatalog } from './diagnostics'
import { listPharmacyOrders, loadMedicineCatalog } from './pharmacy'
import { clearReportDetails, loadReports } from './reports'
import { registerDomain } from './sync'

export async function loadOrders() {
  const [pharmacy, diagnostics] = await Promise.all([listPharmacyOrders(), listLabBookings()])
  useOrders.getState().setAll(pharmacy, diagnostics)
}

registerDomain({
  name: 'commerce-catalog',
  load: async () => {
    await Promise.all([loadMedicineCatalog(), loadTestCatalog()])
  },
  // Public reference data; nothing about the patient.
  clear: () => undefined,
})

registerDomain({
  name: 'orders',
  load: loadOrders,
  clear: () => {
    useOrders.getState().reset()
    useCart.getState().reset()
    useUploads.getState().reset()
    useDiagnosticsDraft.getState().reset()
  },
})

registerDomain({
  name: 'reports',
  load: async () => {
    await loadReports()
  },
  clear: () => {
    useCatalog.setState({ labReports: [] })
    clearReportDetails()
  },
})
