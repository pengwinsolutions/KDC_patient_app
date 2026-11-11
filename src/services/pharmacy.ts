import type { CartLine, Medicine, PharmacyOrder } from '../types'
import { searchMedicines, type MedicineQuery } from '../domain/catalogue'
import { medicines } from '../mock-data/mock'
import { delay } from './latency'

export interface PlaceOrderRequest {
  lines: CartLine[]
  address: string
  slot: string
  amount: number
  payment: string
}

export interface PharmacyService {
  searchMedicines(query: MedicineQuery): Promise<Medicine[]>
  placeOrder(request: PlaceOrderRequest): Promise<PharmacyOrder>
}

export const mockPharmacyService: PharmacyService = {
  searchMedicines: (query) => delay(searchMedicines(medicines, query)),
  placeOrder: (r) => {
    const placedAt = Date.now()
    const when = r.slot.replace(', ', ' · ')
    return delay({
      id: `KDC-PH-${String(placedAt).slice(-5)}`,
      kind: 'pharmacy' as const,
      placedAt,
      placed: 'Just now',
      eta: when,
      etaWhen: `Arriving ${when}`,
      lines: r.lines.map(({ medicineId, qty }) => ({ medicineId, qty })),
      amount: r.amount,
      address: r.address,
      partner: 'KDC+ Pharmacy, Jubilee Hills',
      rider: { name: 'Suresh K.', mobile: '+91 90000 11245' },
      payment: r.payment,
    })
  },
}
