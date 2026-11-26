/**
 * Wave 5 on order tracking: the pharmacy's proposed change (accept / reject with the order cancelled) and
 * returns on a delivered order (the three-step sheet with a photo, the status card, withdrawing). The
 * after-sales store is seeded as services/live/returns.ts fills it; its calls are mocked.
 */
import React from 'react'
import { cleanup, nav, press, render, resetNav, textOf, type } from '../../test-utils/harness'
import { OrderTrackingScreen } from '../../src/screens/pharmacy'
import { OrdersScreen } from '../../src/screens/orders'
import { useOrders } from '../../src/store/orders'
import { pharmacyOrders } from '../../src/mock-data/mock'
import { getMedicine } from '../../src/store/catalog'
import { services } from '../../src/services'
import type { OrderChange, ReturnView } from '../../src/domain/orderTracking'
import type { PharmacyOrder } from '../../src/types'

jest.mock('../../src/navigation/navigation', () => ({
  useNav: () => require('../../test-utils/harness').nav,
  devLaunch: { active: true },
  routes: { aliases: {}, tabRoots: new Set() },
  MAIN: 'main',
  resetAction: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ setOptions: jest.fn() }) }))
jest.mock('../../src/store/toast', () => ({ ...jest.requireActual('../../src/store/toast'), showToast: jest.fn() }))
jest.mock('../../src/services/live/returns', () => {
  const actual = jest.requireActual('../../src/services/live/returns')
  return {
    ...actual,
    acceptChange: jest.fn(),
    rejectChange: jest.fn(),
    requestReturn: jest.fn(),
    cancelReturn: jest.fn(),
    uploadReturnPhoto: jest.fn(async () => 301),
    deleteReturnPhoto: jest.fn(async () => undefined),
  }
})

const { showToast } = jest.requireMock('../../src/store/toast') as { showToast: jest.Mock }
type Live = typeof import('../../src/services/live/returns')
const live = jest.requireMock('../../src/services/live/returns') as Omit<Live, 'acceptChange' | 'rejectChange' | 'requestReturn' | 'cancelReturn' | 'uploadReturnPhoto'> & Record<'acceptChange' | 'rejectChange' | 'requestReturn' | 'cancelReturn' | 'uploadReturnPhoto', jest.Mock>

const base: PharmacyOrder = { ...pharmacyOrders[0], id: 'KDC-PH-W5' }
const firstName = getMedicine(base.lines[0].medicineId).name

const proposal: OrderChange = {
  code: 'KDC-OC-1',
  orderCode: base.id,
  status: 'proposed',
  note: 'Dolo is short',
  lines: [{ orderItemId: 1, action: 'substitute', from: { name: 'Dolo 650', qty: 2, unitPaise: 3000, amountPaise: 6000 }, to: { medicineCode: 'M2', name: 'Calpol 650', qty: 2, unitPaise: 2100, amountPaise: 4200 }, differencePaise: -1800 }],
  oldTotalPaise: 13200,
  newTotalPaise: 11400,
  differencePaise: -1800,
  refundPaise: 1800,
  expiresAt: new Date(Date.now() + 90 * 60_000).toISOString(),
  decidedAt: null,
  decisionNote: null,
  createdAt: new Date().toISOString(),
}

const requested: ReturnView = {
  code: 'KDC-RT-1',
  orderCode: base.id,
  pharmacy: { code: 'PH1', name: 'Apollo Pharmacy' },
  source: 'patient',
  reason: 'damaged',
  reasonLabel: 'Damaged',
  note: null,
  status: 'requested',
  paymentMethod: 'online',
  lines: [{ id: 1, orderItemId: 9, name: firstName, batchNo: 'B1', qty: 1, receivedQty: null, disposition: null }],
  photoFileIds: [301],
  decision: null,
  receivedAt: null,
  creditNote: null,
  refund: null,
  createdAt: new Date().toISOString(),
}

function show(order: PharmacyOrder) {
  useOrders.setState({ pharmacy: [order, ...pharmacyOrders] })
  nav.params = { id: order.id }
  return render(<OrderTrackingScreen />)
}

afterEach(cleanup)
beforeEach(() => {
  resetNav()
  showToast.mockClear()
  ;[live.acceptChange, live.rejectChange, live.requestReturn, live.cancelReturn, live.uploadReturnPhoto].forEach((f) => f.mockClear())
  live.useAfterSales.setState({ returns: {}, changes: {}, mine: null, deliveredAt: {} })
})

describe('order tracking: proposed change', () => {
  it('shows what changes, the new total, the refund and the time left, and accepts', async () => {
    live.useAfterSales.setState({ changes: { [base.id]: [proposal] } })
    live.acceptChange.mockImplementation(async () => {
      const done = { ...proposal, status: 'accepted' as const, decidedAt: new Date().toISOString() }
      live.useAfterSales.setState({ changes: { [base.id]: [done] } })
      return done
    })
    const r = await show({ ...base, status: 'placed', fixedStage: 0 })
    const text = textOf(r.root)
    expect(text).toContain('The pharmacy needs your OK to change this order')
    expect(text).toContain('“Dolo is short”')
    expect(text).toContain('Dolo 650 × 2 → Calpol 650 × 2 (same composition)')
    expect(text).toContain('−₹18')
    expect(text).toContain('₹114')
    expect(text).toMatch(/1 h \d\d min left/)
    await press(r.root, 'Accept change')
    expect(textOf(r.root)).toContain('Accept the change?')
    await press(r.root, 'Yes, accept change')
    expect(live.acceptChange).toHaveBeenCalledWith(base.id, 'KDC-OC-1')
    expect(showToast).toHaveBeenCalledWith('Change accepted', 'success', 'Your order is updated. ₹18 is being refunded.')
    expect(textOf(r.root)).toContain('You accepted the pharmacy’s change')
    expect(textOf(r.root)).not.toContain('needs your OK')
  })

  it('rejects with a reason and cancels the order', async () => {
    live.useAfterSales.setState({ changes: { [base.id]: [proposal] } })
    live.rejectChange.mockResolvedValue({ ...proposal, status: 'rejected' })
    const r = await show({ ...base, status: 'confirmed', fixedStage: 1 })
    await press(r.root, 'Reject')
    await type(r.root, 'e.g. I’d rather wait for the original brand', 'Want the original')
    await press(r.root, 'Cancel the whole order instead')
    await press(r.root, 'Reject and cancel order')
    expect(live.rejectChange).toHaveBeenCalledWith(base.id, 'KDC-OC-1', { note: 'Want the original', cancelOrder: true })
    expect(showToast).toHaveBeenCalledWith('Change rejected and order cancelled', 'success', 'Your online payment is refunded in full.')
  })

  it('can’t be answered once expired', async () => {
    live.useAfterSales.setState({ changes: { [base.id]: [{ ...proposal, expiresAt: new Date(Date.now() - 1000).toISOString() }] } })
    const r = await show({ ...base, status: 'placed', fixedStage: 0 })
    expect(textOf(r.root)).toContain('This proposal has expired.')
    await press(r.root, 'Accept change')
    expect(textOf(r.root)).not.toContain('Accept the change?')
  })
})

describe('order tracking: returns', () => {
  const delivered = { ...base, status: 'delivered', fixedStage: 4 }

  it('requests a return in three steps with a photo, sending one Idempotency-Key', async () => {
    live.useAfterSales.setState({ returns: { [base.id]: [] }, deliveredAt: { [base.id]: new Date(Date.now() - 86_400_000).toISOString() } })
    jest.spyOn(services.documents, 'pickFromGallery').mockResolvedValue({ status: 'picked', file: { name: 'pack.jpg', size: '1 MB', uri: 'file:///pack.jpg', kind: 'image' } })
    live.requestReturn.mockResolvedValue({ ...requested })
    const r = await show(delivered)
    expect(textOf(r.root)).toContain('Something wrong with a medicine?')
    await press(r.root, 'Return or report a problem')
    expect(textOf(r.root)).toContain('Step 1 of 3 · Medicines')
    await press(r.root, 'Continue')
    expect(textOf(r.root)).toContain('Choose at least one medicine')
    await press(r.root, `Return one more ${firstName}`)
    await press(r.root, 'Continue')
    expect(textOf(r.root)).toContain('Step 2 of 3 · What happened')
    await press(r.root, 'Damaged')
    await press(r.root, 'Continue')
    expect(textOf(r.root)).toContain('Add a photo of the medicine')
    await press(r.root, 'From gallery')
    expect(live.uploadReturnPhoto).toHaveBeenCalled()
    expect(textOf(r.root)).toContain('1/5')
    await press(r.root, 'Continue')
    expect(textOf(r.root)).toContain('Step 3 of 3 · Review')
    await press(r.root, 'Send return request')
    expect(live.requestReturn).toHaveBeenCalledWith(base.id, { reason: 'damaged', lines: [{ medicineCode: base.lines[0].medicineId, qty: 1 }], photoFileIds: [301] }, expect.stringMatching(/^rt-/))
    expect(showToast).toHaveBeenCalledWith('Return requested', 'success', 'The pharmacy will review it. We’ll let you know.')
  })

  it('shows the return’s status and withdraws it while requested', async () => {
    live.useAfterSales.setState({ returns: { [base.id]: [requested] }, deliveredAt: { [base.id]: new Date().toISOString() } })
    live.cancelReturn.mockResolvedValue({ ...requested, status: 'cancelled' })
    const r = await show(delivered)
    const text = textOf(r.root)
    expect(text).toContain('KDC-RT-1')
    expect(text).toContain('Pharmacy reviewing')
    expect(text).toContain('Apollo Pharmacy reviews it')
    await press(r.root, 'Withdraw return')
    expect(textOf(r.root)).toContain('Withdraw this return?')
    await press(r.root, 'Yes, withdraw')
    expect(live.cancelReturn).toHaveBeenCalledWith('KDC-RT-1')
  })

  it('shows the refund once refunded, and the rejection reason', async () => {
    const refunded = { ...requested, status: 'refunded' as const, decision: { at: new Date().toISOString(), note: null }, receivedAt: new Date().toISOString(), creditNote: { number: 'PAB12C/2627/0001', totalPaise: 3100, issuedAt: new Date().toISOString() }, refund: { amountPaise: 3100, method: 'online' as const, at: new Date().toISOString() } }
    const rejected = { ...requested, code: 'KDC-RT-2', status: 'rejected' as const, decision: { at: new Date().toISOString(), note: 'The seal was intact' } }
    live.useAfterSales.setState({ returns: { [base.id]: [refunded, rejected] }, deliveredAt: { [base.id]: new Date().toISOString() } })
    const r = await show(delivered)
    const text = textOf(r.root)
    expect(text).toContain('₹31 refunded to your original payment method')
    expect(text).toContain('Credit note PAB12C/2627/0001')
    expect(text).toContain('The pharmacy said: “The seal was intact”')
  })

  it('offers no return after the window closes', async () => {
    live.useAfterSales.setState({ returns: { [base.id]: [] }, deliveredAt: { [base.id]: new Date(Date.now() - 30 * 86_400_000).toISOString() } })
    const r = await show(delivered)
    expect(textOf(r.root)).not.toContain('Return or report a problem')
  })

  it('lists my returns on the Orders tab', async () => {
    useOrders.setState({ pharmacy: [delivered], diagnostics: [] })
    live.useAfterSales.setState({ mine: [{ ...requested, status: 'refunded', refund: { amountPaise: 3100, method: 'online', at: new Date().toISOString() } }] })
    const r = await render(<OrdersScreen />)
    expect(textOf(r.root)).toContain('My returns')
    expect(textOf(r.root)).toContain('₹31 refunded')
    await press(r.root, 'Return KDC-RT-1')
    expect(nav.navigate).toHaveBeenCalledWith('order-tracking', { params: { id: base.id } })
  })
})
