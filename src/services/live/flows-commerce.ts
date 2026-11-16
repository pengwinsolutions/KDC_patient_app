/**
 * Live checkout for pharmacy orders and lab bookings: the server creates the purchase, holding the
 * stock or the collection slot, and prices it. Checkout (flows-payment.ts) then pays `Hold.amount`
 * online, or nothing now for cash on delivery / cash to the technician. The server's messages
 * (out of stock, a prescription that doesn't cover an Rx medicine, a slot just taken) are thrown
 * as ServiceError for checkout to show.
 */
import type { PaymentIntent } from '../../flows/payment'
import { toIso, to24h } from '../../domain/schedule'
import { useAddresses } from '../../store/addresses'
import { useCart } from '../../store/cart'
import { useOrders } from '../../store/orders'
import { useUploads } from '../../store/uploads'
import { ServiceError } from '../errors'
import { type ApiLabBooking, toDiagnosticOrder } from './diagnostics'
import type { Hold } from './holds'
import { api } from './http'
import { type ApiPharmacyOrder, toPharmacyOrder } from './pharmacy'

/** The address the patient picked, as the server's id. */
function selectedAddressId(): number {
  const { items, selectedId } = useAddresses.getState()
  const id = Number(items.find((a) => a.id === selectedId)?.id ?? selectedId)
  if (!Number.isInteger(id) || id <= 0) throw new ServiceError('invalid', 'Add a delivery address first.', 'addressId')
  return id
}

/** What covers the cart's prescription medicines: a KDC+ prescription's code, or uploaded files. */
function cartPrescriptions(): { prescriptionCodes?: string[]; prescriptionFileIds?: number[] } {
  const attached = useCart.getState().prescription
  if (!attached) return {}
  if (attached.source === 'kdc') {
    // The code is carried on the cart; older carts only have it at the end of the label ("Dr. … · KDC-RX-…").
    const code = attached.code ?? attached.label.split(' · ').at(-1)?.trim()
    return code ? { prescriptionCodes: [code] } : {}
  }
  const upload = useUploads.getState().items.find((u) => u.id === attached.uploadId)
  return upload?.fileId ? { prescriptionFileIds: [upload.fileId] } : {}
}

export async function holdPharmacy(intent: Extract<PaymentIntent, { kind: 'pharmacy' }>, online: boolean): Promise<Hold> {
  const order = await api.post<ApiPharmacyOrder>('patient/pharmacy/orders', {
    lines: intent.lines.map((l) => ({ medicineCode: l.medicineId, qty: l.qty })),
    addressId: selectedAddressId(),
    slot: intent.slot,
    paymentMethod: online ? 'online' : 'cod',
    ...cartPrescriptions(),
  })
  const mapped = toPharmacyOrder(order)
  useOrders.getState().upsertPharmacy(mapped)
  return {
    purposeCode: order.code,
    amount: mapped.amount,
    online: online && order.paymentRequired,
    screen: 'order-tracking',
    params: { id: order.code },
    sync: ['orders'],
  }
}

export async function holdDiagnostic(intent: Extract<PaymentIntent, { kind: 'diagnostic' }>, online: boolean): Promise<Hold> {
  const home = intent.method === 'Home Collection'
  const booking = await api.post<ApiLabBooking>('patient/diagnostics/bookings', {
    testCodes: [intent.testId],
    labCode: intent.labId,
    method: home ? 'home_collection' : 'lab_visit',
    date: toIso(intent.date),
    window: to24h(intent.time),
    ...(home ? { addressId: selectedAddressId() } : {}),
    paymentType: online ? 'online' : 'cash',
  })
  const mapped = toDiagnosticOrder(booking)
  useOrders.getState().upsertDiagnostic(mapped)
  return {
    purposeCode: booking.code,
    amount: mapped.amount,
    online: online && booking.paymentRequired,
    screen: 'diagnostic-confirm',
    sync: ['orders'],
  }
}
