/**
 * The contract between checkout (flows-payment.ts) and the areas that sell something.
 * Live checkout first creates the purchase on the server, which holds the slot or stock
 * and prices it, then pays for it:
 *
 * - consultation: `holdConsultation` (flows-care.ts) → POST /patient/appointments
 * - pharmacy:     `holdPharmacy` (flows-commerce.ts) → POST /patient/pharmacy/orders
 * - diagnostic:   `holdDiagnostic` (flows-commerce.ts) → POST /patient/diagnostics/bookings
 * - membership:   `holdMembership` (flows-payment.ts) → POST /patient/membership
 *
 * The amount charged is always the server's total for that purchase, never the app's figure.
 */
export interface Hold {
  /** The purchase's code (appointment, pharmacy order, lab booking or membership): the payment's purposeCode. */
  purposeCode: string
  /** The server's total, in rupees. */
  amount: number
  /** False when it's paid at the door (cash on delivery, cash to the technician): nothing to charge now. */
  online: boolean
  /** Where checkout ends, and that screen's params. */
  screen: string
  params?: Record<string, unknown>
  /** Sync domains to reload once it's paid (or placed). */
  sync: string[]
}

/**
 * Sync domain names (services/live/sync.ts), one owner each:
 * care:     'doctors', 'appointments', 'prescriptions'
 * commerce: 'commerce-catalog', 'orders', 'reports'
 * account:  'family', 'medical', 'addresses', 'records', 'notifications', 'settings'
 * money:    'membership', 'payments'
 */
export type SyncName =
  | 'doctors' | 'appointments' | 'prescriptions'
  | 'commerce-catalog' | 'orders' | 'reports'
  | 'family' | 'medical' | 'addresses' | 'records' | 'notifications' | 'settings'
  | 'membership' | 'payments'
