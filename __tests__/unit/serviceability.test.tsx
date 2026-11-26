/**
 * Live delivery pincode serviceability (docs/pharmacy-wave3-api.md): the lookup
 * (GET /public/pharmacy/serviceable) and its cache, checkout's 422 pincode_not_serviceable
 * recorded against the address (the cart stays), and the checkout screen's early check:
 * an unserved address is marked, explained and blocks placing; another one can be chosen.
 * The http layer is mocked: no backend is needed.
 */
import React from 'react'

jest.doMock('../../src/services/config', () => ({
  API_CONFIG: { useMock: false, baseUrl: 'http://127.0.0.1:9/api/v1', timeoutMs: 2000 },
  LIVE: true,
}))
jest.doMock('../../src/navigation/navigation', () => ({
  useNav: () => require('../../test-utils/harness').nav,
  devLaunch: { active: true },
  routes: { aliases: {}, tabRoots: new Set() },
  MAIN: 'main',
  resetAction: jest.fn(),
}))
jest.doMock('@react-navigation/native', () => ({ useNavigation: () => ({ setOptions: jest.fn(), addListener: () => () => undefined }), useIsFocused: () => true }))
jest.doMock('../../src/store/toast', () => ({ ...jest.requireActual('../../src/store/toast'), showToast: jest.fn() }))

const SERVED = new Set(['500081'])
const lookup = async (path: string) => {
  const pincode = /pincode=(\d+)/.exec(path)?.[1] ?? ''
  const serviceable = SERVED.has(pincode)
  return { pincode, serviceable, restricted: true, message: serviceable ? 'We deliver medicines here.' : `We don’t deliver medicines to ${pincode} yet. Choose another address, or check back soon.` }
}
const pub = jest.fn(lookup)
const post = jest.fn()
jest.doMock('../../src/services/live/http', () => {
  const actual = jest.requireActual('../../src/services/live/http')
  return { ...actual, api: { ...actual.api, pub, post, get: jest.fn(async () => []) } }
})

const { ServiceError } = require('../../src/services/errors') as typeof import('../../src/services/errors')
const svc = require('../../src/services/live/serviceability') as typeof import('../../src/services/live/serviceability')
const flows = require('../../src/services/live/flows-commerce') as typeof import('../../src/services/live/flows-commerce')
const { runLivePayment } = require('../../src/services/live/flows-payment') as typeof import('../../src/services/live/flows-payment')
const { useAddresses } = require('../../src/store/addresses') as typeof import('../../src/store/addresses')
const { useCart } = require('../../src/store/cart') as typeof import('../../src/store/cart')
const { useCheckout } = require('../../src/flows/payment') as typeof import('../../src/flows/payment')
const { CheckoutScreen } = require('../../src/screens/pharmacy') as typeof import('../../src/screens/pharmacy')
const { cleanup, nav, press, render, resetNav, textOf } = require('../../test-utils/harness') as typeof import('../../test-utils/harness')
const { showToast } = jest.requireMock('../../src/store/toast') as { showToast: jest.Mock }

const REFUSAL = 'We don’t deliver medicines to 500034 yet. Choose another address, or check back soon.'
const addresses = [
  { id: '11', label: 'Home' as const, line: 'Flat 402, Lotus Residency', area: 'Banjara Hills – 500034', phone: '+91 70001 00002', isDefault: true },
  { id: '12', label: 'Office' as const, line: 'Cyber Gateway, Block C', area: 'HITEC City – 500081', phone: '+91 70001 00002', isDefault: false },
]
const intent = { kind: 'pharmacy' as const, amount: 120, title: 'Medicine order', subtitle: '', lines: [{ medicineId: 'MED-1', qty: 1 }], address: '', slot: 'Tomorrow, 9–12 PM', bill: { base: 120, platformFee: 0, discount: 0, total: 120 }, itemCount: 1 }

afterEach(cleanup)
beforeEach(() => {
  svc.resetServiceability()
  pub.mockClear()
  pub.mockImplementation(lookup)
  post.mockReset()
  showToast.mockClear()
  resetNav()
  useCheckout.getState().clear()
  useAddresses.setState({ items: addresses, selectedId: '11' })
  useCart.setState({ lines: [{ medicineId: 'MED-1', qty: 1 }], prescription: null })
})

describe('the serviceability lookup', () => {
  it('reads the pincode from the app’s "area – PIN" line', () => {
    expect(svc.pincodeOf({ area: 'Banjara Hills – 500034' })).toBe('500034')
    expect(svc.pincodeOf({ area: 'Kompally, Secunderabad 500100' })).toBe('500100')
    expect(svc.pincodeOf({ area: 'No pin here' })).toBe('')
    expect(svc.pincodeOf(undefined)).toBe('')
  })

  it('asks the public endpoint once per pincode, and again when fresh', async () => {
    await expect(svc.checkServiceable('500034')).resolves.toMatchObject({ ok: false, message: REFUSAL })
    await svc.checkServiceable('500034')
    expect(pub).toHaveBeenCalledTimes(1)
    expect(pub).toHaveBeenCalledWith('public/pharmacy/serviceable?pincode=500034')
    await expect(svc.checkServiceable('500081', { fresh: true })).resolves.toMatchObject({ ok: true })
    await svc.checkServiceable('500081', { fresh: true })
    expect(pub).toHaveBeenCalledTimes(3)
  })

  it('a failed lookup records nothing (the server checks at checkout)', async () => {
    pub.mockRejectedValueOnce(new ServiceError('unavailable', 'offline'))
    await expect(svc.checkServiceable('500034')).rejects.toThrow('offline')
    expect(svc.useServiceability.getState().byPin['500034']).toBeUndefined()
  })
})

describe('checkout refusing the pincode (422 pincode_not_serviceable)', () => {
  const refusal = () => new ServiceError('invalid', REFUSAL, 'addressId')

  it('is recognised by its field and message, not other address errors', () => {
    expect(svc.isNotServiceable(refusal())).toBe(true)
    expect(svc.isNotServiceable(new ServiceError('invalid', 'Add a delivery address first.', 'addressId'))).toBe(false)
    expect(svc.isNotServiceable(new ServiceError('invalid', REFUSAL, 'slot'))).toBe(false)
  })

  it('marks the address’s pincode, rethrows, and keeps the cart', async () => {
    post.mockRejectedValueOnce(refusal())
    await expect(flows.holdPharmacy(intent, false)).rejects.toMatchObject({ field: 'addressId', message: REFUSAL })
    expect(post).toHaveBeenCalledWith('patient/pharmacy/orders', expect.objectContaining({ addressId: 11 }))
    expect(svc.useServiceability.getState().byPin['500034']).toMatchObject({ ok: false, message: REFUSAL })
    expect(useCart.getState().lines).toHaveLength(1)
  })

  it('the payment flow fails with the server’s message and holds nothing', async () => {
    post.mockRejectedValueOnce(refusal())
    const keep = jest.fn()
    await expect(runLivePayment(intent, null, keep)).resolves.toEqual({ ok: false, reason: REFUSAL, notServiceable: true })
    expect(keep).not.toHaveBeenCalled()
  })
})

describe('the checkout screen', () => {
  it('marks the unserved address, explains it and offers another', async () => {
    const r = await render(<CheckoutScreen />)
    const text = textOf(r.root)
    expect(text).toContain('We don’t deliver medicines to 500034 yet')
    expect(text).toContain('Your cart is kept.')
    expect(text).toContain('No medicine delivery to 500034 yet')
    expect(text).not.toContain('No medicine delivery to 500081 yet')

    await press(r.root, 'Choose a delivery address')
    expect(showToast).toHaveBeenCalledWith('We don’t deliver medicines to 500034 yet', 'critical', 'Choose another address or add a new one.')
    expect(useCheckout.getState().intent).toBeNull()

    await press(r.root, 'Deliver to Office (500081)')
    expect(useAddresses.getState().selectedId).toBe('12')
    expect(textOf(r.root)).not.toContain('We don’t deliver medicines to 500034 yet. ')
    await press(r.root, 'Place order')
    expect(pub).toHaveBeenLastCalledWith('public/pharmacy/serviceable?pincode=500081')
    expect(useCheckout.getState().intent).toMatchObject({ kind: 'pharmacy' })
    expect(nav.navigate).toHaveBeenCalledWith('st-payment-processing')
  })

  it('a pincode that stopped being served just before placing is caught then', async () => {
    useAddresses.setState({ items: addresses, selectedId: '12' })
    const r = await render(<CheckoutScreen />)
    SERVED.delete('500081')
    try {
      await press(r.root, 'Place order')
    } finally {
      SERVED.add('500081')
    }
    expect(showToast).toHaveBeenCalledWith('We don’t deliver medicines to 500081 yet', 'critical', 'Choose another address or add a new one.')
    expect(useCheckout.getState().intent).toBeNull()
    expect(textOf(r.root)).toContain('No medicine delivery to 500081 yet')
  })

  it('everything is served until a pharmacy sets an area (restricted: false)', async () => {
    pub.mockImplementation(async (path: string) => ({ pincode: /pincode=(\d+)/.exec(path)?.[1] ?? '', serviceable: true, restricted: false, message: 'We deliver medicines here.' }))
    const r = await render(<CheckoutScreen />)
    expect(textOf(r.root)).not.toContain('No medicine delivery')
    await press(r.root, 'Place order')
    expect(nav.navigate).toHaveBeenCalledWith('st-payment-processing')
  })
})
