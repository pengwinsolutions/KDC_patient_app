import React from 'react'
import { cleanup, render, resetNav, textOf } from '../../test-utils/harness'
import { SCREENS } from '../../src/navigation/registry'
import { logout } from '../../src/store/reset'

jest.mock('../../src/navigation/navigation', () => ({
  useNav: () => require('../../test-utils/harness').nav,
  devLaunch: { active: true },
  routes: { aliases: {}, tabRoots: new Set() },
  MAIN: 'main',
  resetAction: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ setOptions: jest.fn() }) }))

afterEach(cleanup)

describe('every screen in the registry', () => {
  beforeEach(() => {
    logout()
    resetNav()
  })

  test('registry has all 80 screens', () => {
    expect(SCREENS).toHaveLength(80)
  })

  test.each(SCREENS.map((s) => [s.id, s.Component] as const))('%s renders', async (_id, Component) => {
    const renderer = await render(<Component />)
    expect(textOf(renderer.root).length).toBeGreaterThan(0)
  })
})

describe('first-view copy matches the blueprint', () => {
  beforeEach(() => {
    logout()
    resetNav()
  })

  const screen = (id: string) => SCREENS.find((s) => s.id === id)!.Component

  test.each([
    ['doctor-list', ['Cardiologists', '38 doctors available', 'Showing 8 of 38', '5 available today']],
    ['doctor-filters', ['38 doctors match', 'Show 38 doctors']],
    ['select-slot', ['Monday, 6 October 2025', 'Mon, 6 Oct · 5:30 PM', '₹800']],
    ['summary', ['Mon, 6 Oct 2025 · 5:30 PM', 'Total payable', '₹649', 'Free cancellation until 4:30 PM', 'Aarav Sharma (Self)']],
    ['booking-success', ['KDC2410A4821', 'Mon, 6 Oct', '5:30 PM', '15 min · Video']],
    ['appointments', ['Upcoming', 'Later this week', 'Past consultations']],
    ['appointment-detail', ['Starting in 28 minutes', 'Today, 5 Oct 2025 · 5:30 PM', 'Discount (KDC50)', '₹799']],
    ['cart', ['3 items', 'Prescription verified', 'Dr. Arjun Mehta · KDC-RX-2025-48219', 'Item total (3)', '₹327', '₹245']],
    ['order-tracking', ['KDC-PH-99421', 'Arriving today by 7:30 PM', '3 items · ₹245', 'Step 4 of 5 · Out for delivery', 'Expected by 7:30 PM']],
    ['orders-home', ['Out for delivery', 'Telma 40, Rosuvas 10, Ecosprin 75', 'Tue, 7 Oct · 7:00 – 8:00 AM', 'Report ready', '₹263']],
    ['diagnostic-slot', ['This test needs 10–12 hours of fasting', 'Tue, 7 Oct · 7:00–8:00 AM', '₹412', '₹549']],
    ['diagnostic-confirm', ['KDC-DX-77215', 'Home Collection', '7:00 AM – 8:00 AM', '₹412']],
    ['diagnostic-tracking', ['Step 3 of 5 · Awaiting collection', 'Fasting required from 9:00 PM tonight', 'Booking confirmed']],
    ['lab-select', ['Lipid Profile — Complete', 'Dr. Lal PathLabs · 1.2 km']],
    ['test-search', ['8 tests found']],
    ['medicine-search', ['8 results for “tab”']],
    ['membership-manage', ['Saved since 12 Jan 2026', 'Across 16 bills', '96 days left', 'Renewal reminder', '25% off every bill']],
    ['membership-checkout', ['₹2,950', 'Valid until 12 Jan 2027', '25% off across all three services']],
    ['payments', ['₹1,398', '₹453', '₹699']],
    ['st-payment-failed', ['Your 5:30 PM slot with Dr. Arjun Mehta is held for 9 more minutes.']],
    ['st-cancelled', ['KDC2410A4821', '5 Oct 2025, 4:12 PM', 'Dr. Arjun Mehta on 6 October']],
    ['profile', ['Aarav Sharma', '5 profiles', '3 addresses', 'Valid until 12 Jan 2027']],
    ['consult-complete', ['Duration 14 min 06 sec']],
    ['video-call', ['08:4']],
    ['otp', ['+91 98490 •••• 87', '00:2']],
  ])('%s', async (id, phrases) => {
    const Component = screen(id)
    const renderer = await render(<Component />)
    const text = textOf(renderer.root)
    phrases.forEach((p) => expect(text).toContain(p))
  })
})
