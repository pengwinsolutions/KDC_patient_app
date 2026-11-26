/**
 * Order tracking with the Wave 2 delivery states: the delivery code while out for delivery,
 * a failed attempt (reason, what happens next, attempts), and a return to the pharmacy.
 * The orders are seeded as the live mapping (services/live/pharmacy.ts toPharmacyOrder) makes them.
 */
import React from 'react'
import { cleanup, nav, press, render, resetNav, textOf } from '../../test-utils/harness'
import { OrderTrackingScreen } from '../../src/screens/pharmacy'
import { OrdersScreen } from '../../src/screens/orders'
import { useOrders } from '../../src/store/orders'
import { useCart } from '../../src/store/cart'
import { pharmacyOrders } from '../../src/mock-data/mock'
import type { PharmacyOrder } from '../../src/types'

jest.mock('../../src/navigation/navigation', () => ({
  useNav: () => require('../../test-utils/harness').nav,
  devLaunch: { active: true },
  routes: { aliases: {}, tabRoots: new Set() },
  MAIN: 'main',
  resetAction: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ setOptions: jest.fn() }) }))
jest.mock('../../src/store/toast', () => ({
  ...jest.requireActual('../../src/store/toast'),
  showToast: jest.fn(),
}))

const { showToast } = jest.requireMock('../../src/store/toast') as { showToast: jest.Mock }

const base: PharmacyOrder = { ...pharmacyOrders[0], id: 'KDC-PH-W2' }
const attempt1 = { attempt: 1, outAt: '2026-11-25T10:00:00.000Z', outcome: 'failed', reason: 'nobody was home', endedAt: '2026-11-25T10:40:00.000Z' }

function show(order: PharmacyOrder) {
  useOrders.setState({ pharmacy: [order, ...pharmacyOrders] })
  nav.params = { id: order.id }
  return render(<OrderTrackingScreen />)
}

afterEach(cleanup)
beforeEach(() => {
  resetNav()
  showToast.mockClear()
  useCart.getState().clear()
})

describe('order tracking: Wave 2 delivery', () => {
  it('shows the delivery code and the rider while out for delivery', async () => {
    const r = await show({ ...base, status: 'out_for_delivery', fixedStage: 3, statusLabel: 'Out for delivery', deliveryOtp: '4821', rider: { name: 'Ravi Kumar', mobile: '9000022001' } })
    const text = textOf(r.root)
    expect(text).toContain('Delivery code')
    expect(text).toContain('Delivery code 4 8 2 1')
    expect(text).toContain('Share this code with the delivery partner only when you receive your order.')
    expect(text).toContain('Ravi Kumar')
    await press(r.root, 'Call rider')
    expect(showToast).toHaveBeenCalledWith('Calling Ravi Kumar', 'info', '9000022001')
  })

  it('says the code is locked instead of showing it', async () => {
    const r = await show({ ...base, status: 'out_for_delivery', fixedStage: 3, deliveryOtp: null, deliveryCodeLocked: true })
    expect(textOf(r.root)).toContain('Your delivery code is locked')
    expect(textOf(r.root)).not.toContain('Share this code with the delivery partner')
  })

  it('shows a failed attempt with its reason, the retry and the attempts', async () => {
    const r = await show({ ...base, status: 'delivery_failed', fixedStage: 3, statusLabel: 'Delivery attempt failed', deliveryOtp: null, deliveryAttempts: [attempt1] })
    const text = textOf(r.root)
    expect(text).toContain('We couldn’t deliver your order')
    expect(text).toContain('Reason: nobody was home')
    expect(text).toContain('We’ll try again')
    expect(text).toContain('2 attempts left')
    expect(text).toContain('Attempt 1 of 3 didn’t go through')
    expect(text).toContain('Delivery attempts')
    expect(text).toContain('Not delivered')
    expect(text).not.toContain('Delivery code')
  })

  it('after the last attempt says the pharmacy will call', async () => {
    const attempts = [attempt1, { ...attempt1, attempt: 2 }, { ...attempt1, attempt: 3, reason: 'we couldn’t reach you by phone' }]
    const r = await show({ ...base, status: 'delivery_failed', fixedStage: 3, deliveryAttempts: attempts })
    expect(textOf(r.root)).toContain('This was the last attempt')
    expect(textOf(r.root)).toContain('Reason: we couldn’t reach you by phone')
  })

  it('a returned order shows the refund and orders again', async () => {
    const r = await show({ ...base, status: 'returned', cancelled: true, statusLabel: 'Returned to pharmacy', cancelReason: 'Returned to store: nobody was home', refundAmount: 245, payment: 'UPI', deliveryAttempts: [attempt1] })
    const text = textOf(r.root)
    expect(text).toContain('Your order went back to the pharmacy')
    expect(text).toContain('We couldn’t deliver it: nobody was home')
    expect(text).toContain('₹245 is being refunded')
    await press(r.root, 'Order again')
    expect(useCart.getState().lines.map((l) => l.medicineId)).toEqual(base.lines.map((l) => l.medicineId))
    expect(nav.navigate).toHaveBeenCalledWith('cart')
  })

  it('the Orders tab badges the new statuses', async () => {
    useOrders.setState({
      pharmacy: [
        { ...base, id: 'KDC-PH-F', status: 'delivery_failed', fixedStage: 3, statusLabel: 'Delivery attempt failed', etaWhen: 'Delivery missed · we’ll try again' },
        { ...base, id: 'KDC-PH-R', status: 'returned', cancelled: true, statusLabel: 'Returned to pharmacy', refundAmount: 0 },
        { ...base, id: 'KDC-PH-O', status: 'out_for_delivery', fixedStage: 3, statusLabel: 'Out for delivery', deliveryOtp: '1234' },
      ],
      diagnostics: [],
    })
    const r = await render(<OrdersScreen />)
    const text = textOf(r.root)
    expect(text).toContain('Delivery attempt failed')
    expect(text).toContain('Delivery missed · we’ll try again')
    expect(text).toContain('Returned to pharmacy')
    expect(text).toContain('On the way · delivery code 1234')
  })
})
