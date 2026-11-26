/** Wave 5 domain rules: the return window, what's still returnable, the return draft's checks, return steps and proposals. */
import {
  canRequestReturn,
  changeLineText,
  changeTimeLeft,
  openChange,
  returnableQty,
  returnDraftErrors,
  returnSteps,
  signedRupees,
  type OrderChange,
  type ReturnView,
} from '../../src/domain/orderTracking'

const DAY = 86_400_000
const delivered = '2026-11-20T10:00:00.000Z'
const at = Date.parse(delivered)

const ret = (over: Partial<ReturnView> = {}): ReturnView => ({
  code: 'KDC-RT-1',
  orderCode: 'KDC-PH-1',
  pharmacy: { code: 'PH1', name: 'Apollo' },
  source: 'patient',
  reason: 'damaged',
  reasonLabel: 'Damaged',
  note: null,
  status: 'requested',
  paymentMethod: 'online',
  lines: [{ id: 1, orderItemId: 9, name: 'Dolo 650', batchNo: 'B1', qty: 2, receivedQty: null, disposition: null }],
  photoFileIds: [301],
  decision: null,
  receivedAt: null,
  creditNote: null,
  refund: null,
  createdAt: '2026-11-21T10:00:00.000Z',
  ...over,
})

describe('returns', () => {
  it('opens only for a delivered order, within the window', () => {
    expect(canRequestReturn('delivered', delivered, at + 6 * DAY)).toBe(true)
    expect(canRequestReturn('delivered', delivered, at + 7 * DAY)).toBe(true)
    expect(canRequestReturn('delivered', delivered, at + 7 * DAY + 1)).toBe(false)
    expect(canRequestReturn('out_for_delivery', delivered, at)).toBe(false)
    expect(canRequestReturn('delivered', null, at)).toBe(false)
  })

  it('counts live returns against what was delivered; rejected and withdrawn ones free the packs', () => {
    const lines = [{ name: 'Dolo 650', qty: 3 }, { name: 'Telma 40', qty: 1 }]
    expect(returnableQty(lines, [ret()])).toEqual([1, 1])
    expect(returnableQty(lines, [ret({ status: 'rejected' }), ret({ status: 'cancelled' })])).toEqual([3, 1])
    // A received return holds what the pharmacy accepted.
    const received = ret({ status: 'received', lines: [{ ...ret().lines[0], receivedQty: 1 }] })
    expect(returnableQty(lines, [received])).toEqual([2, 1])
  })

  it('checks the draft step by step', () => {
    const empty = { qty: [0, 0], reason: null, note: '', photos: 0 }
    expect(returnDraftErrors(empty, 0)).toHaveProperty('lines')
    expect(returnDraftErrors({ ...empty, qty: [1, 0] }, 0)).toEqual({})
    expect(Object.keys(returnDraftErrors({ ...empty, qty: [1, 0] }, 1))).toEqual(['reason'])
    expect(returnDraftErrors({ ...empty, qty: [1, 0], reason: 'damaged' }, 1)).toHaveProperty('photos')
    expect(returnDraftErrors({ ...empty, qty: [1, 0], reason: 'damaged', photos: 1 }, 1)).toEqual({})
    expect(returnDraftErrors({ ...empty, qty: [1, 0], reason: 'other' }, 1)).toHaveProperty('note')
    expect(returnDraftErrors({ ...empty, qty: [1, 0], reason: 'expired', note: 'ok' }, 1)).toHaveProperty('note')
    expect(returnDraftErrors({ ...empty, qty: [1, 0], reason: 'expired', photos: 1, uploading: 1 }, 1)).toHaveProperty('photos')
  })

  it('shows where a return stands, with the refund and the rejection reason', () => {
    const when = (s: string) => s.slice(0, 10)
    expect(returnSteps(ret(), when).map((s) => s.state)).toEqual(['done', 'active', 'pending', 'pending'])
    const rejected = returnSteps(ret({ status: 'rejected', decision: { at: '2026-11-22T10:00:00.000Z', note: 'Seal was intact' } }), when)
    expect(rejected[1]).toMatchObject({ title: 'Not accepted', state: 'failed' })
    expect(rejected[1].body).toContain('Seal was intact')
    const refunded = returnSteps(
      ret({ status: 'refunded', decision: { at: '2026-11-22T10:00:00.000Z', note: null }, receivedAt: '2026-11-23T10:00:00.000Z', creditNote: { number: 'PAB12C/2627/0001', totalPaise: 3100, issuedAt: '2026-11-23T10:00:00.000Z' }, refund: { amountPaise: 3100, method: 'online', at: '2026-11-23T11:00:00.000Z' } }),
      when,
    )
    expect(refunded.every((s) => s.state === 'done')).toBe(true)
    expect(refunded[2].body).toContain('PAB12C/2627/0001')
    expect(refunded[3].body).toContain('₹31 refunded')
  })
})

describe('proposed changes', () => {
  const change: OrderChange = {
    code: 'KDC-OC-1',
    orderCode: 'KDC-PH-1',
    status: 'proposed',
    note: 'Dolo is short',
    lines: [
      { orderItemId: 1, action: 'substitute', from: { name: 'Dolo 650', qty: 2, unitPaise: 3000, amountPaise: 6000 }, to: { medicineCode: 'M2', name: 'Calpol 650', qty: 2, unitPaise: 2100, amountPaise: 4200 }, differencePaise: -1800 },
      { orderItemId: 2, action: 'reduce', from: { name: 'Telma 40', qty: 3, unitPaise: 1000, amountPaise: 3000 }, to: { medicineCode: null, name: 'Telma 40', qty: 1, unitPaise: 1000, amountPaise: 1000 }, differencePaise: -2000 },
      { orderItemId: 3, action: 'remove', from: { name: 'Shelcal', qty: 1, unitPaise: 500, amountPaise: 500 }, to: null, differencePaise: -500 },
    ],
    oldTotalPaise: 13200,
    newTotalPaise: 8900,
    differencePaise: -4300,
    refundPaise: 4300,
    expiresAt: '2026-11-26T12:00:00.000Z',
    decidedAt: null,
    decisionNote: null,
    createdAt: '2026-11-26T10:00:00.000Z',
  }
  it('describes each line and the money', () => {
    expect(change.lines.map(changeLineText)).toEqual(['Dolo 650 × 2 → Calpol 650 × 2 (same composition)', 'Telma 40: 3 → 1 pack', 'Shelcal × 1 won’t be sent'])
    expect(signedRupees(-4300)).toBe('−₹43')
    expect(signedRupees(2550)).toBe('+₹25.5')
    expect(signedRupees(0)).toBe('No change')
  })
  it('counts down to the expiry and finds the open proposal', () => {
    const exp = Date.parse(change.expiresAt)
    expect(changeTimeLeft(change.expiresAt, exp - (65 * 60 + 5) * 1000)).toBe('1 h 05 min')
    expect(changeTimeLeft(change.expiresAt, exp - 250 * 1000)).toBe('4 min 10 s')
    expect(changeTimeLeft(change.expiresAt, exp)).toBeNull()
    expect(openChange([{ ...change, code: 'B', status: 'expired' }, change])?.code).toBe('KDC-OC-1')
    expect(openChange([{ ...change, status: 'accepted' }])).toBeNull()
  })
})

describe('Wave 5 notifications', () => {
  it('order.return_updated / change_proposed / change_applied open the order (deep link {type: order})', () => {
    const { notificationRoute } = require('../../src/services/live/notifications') as typeof import('../../src/services/live/notifications')
    const n = { id: '1', group: 'Today', category: 'Pharmacy', title: 'Change proposed', body: '', time: '', unread: true, target: { type: 'order', code: 'KDC-PH-1' } } as never
    expect(notificationRoute(n)).toEqual({ screen: 'order-tracking', params: { id: 'KDC-PH-1' } })
  })
})
