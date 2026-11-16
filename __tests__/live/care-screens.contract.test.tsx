/// <reference types="node" />
/**
 * Live care screens render from server data (and blank, never demo, before it loads): the
 * search, list, doctor profile, booking steps, appointments and prescriptions. See test-support/live.ts.
 * PATIENT_INDEX (0–49) picks fresh numbers for a rerun: the server allows 5 sign-in codes per number an hour.
 */
import React from 'react'
import { cleanup, flush, nav, render, resetNav, textOf } from '../../test-utils/harness'
import { data, liveSuite, signIn } from '../../test-support/live'

jest.mock('../../src/navigation/navigation', () => ({
  useNav: () => require('../../test-utils/harness').nav,
  devLaunch: { active: true },
  routes: { aliases: {}, tabRoots: new Set() },
  MAIN: 'main',
  resetAction: jest.fn(),
}))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ setOptions: jest.fn() }) }))

liveSuite('the patient app on the live backend: care screens', () => {
  jest.setTimeout(120_000)
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { SCREENS } = require('../../src/navigation/registry') as typeof import('../../src/navigation/registry')
  const { syncOne } = require('../../src/services/live/sync') as typeof import('../../src/services/live/sync')
  const { useBooking } = require('../../src/store/booking') as typeof import('../../src/store/booking')
  const { useAppointments } = require('../../src/store/appointments') as typeof import('../../src/store/appointments')
  const screen = (id: string) => SCREENS.find((s) => s.id === id)!.Component
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      await flush()
      await new Promise((r) => setTimeout(r, 120))
    }
  }
  afterEach(cleanup)
  beforeEach(resetNav)

  it('render blank before anything loads (no demo doctors, appointments or prescriptions)', async () => {
    for (const id of ['doctor-profile', 'appointment-detail', 'appointments', 'prescription', 'prescription-history', 'consult-complete', 'summary']) {
      const r = await render(React.createElement(screen(id)))
      const text = textOf(r.root)
      expect(text).not.toMatch(/Arjun Mehta|KDC2410|Telangana State Medical Council|Lisinopril|Sunita/)
    }
  })

  it('render the server’s doctors, slots and appointments', async () => {
    await signIn(`98765982${50 + Number(process.env.PATIENT_INDEX ?? 0)}`, { name: 'Sneha Reddy' })
    await syncOne('doctors', 'appointments', 'prescriptions')
    const arjun = data.doctors[0]

    let r = await render(React.createElement(screen('doctor-search')))
    expect(textOf(r.root)).toContain('Cardiology')

    useBooking.getState().selectDoctor(arjun.code)
    r = await render(React.createElement(screen('doctor-profile')))
    await settle()
    let text = textOf(r.root)
    expect(text).toContain('Dr. Arjun Mehta')
    expect(text).toContain('TSMC/P11D/8001')
    expect(text).toContain('Andhra Pradesh Medical Council')

    r = await render(React.createElement(screen('select-slot')))
    await settle()
    text = textOf(r.root)
    expect(text).toMatch(/\d{1,2}:\d{2} (AM|PM)/)

    r = await render(React.createElement(screen('select-date')))
    await settle()
    expect(textOf(r.root)).toContain('Earliest available')

    const appointment = useAppointments.getState().items[0]
    if (appointment) {
      nav.params = { id: appointment.id }
      r = await render(React.createElement(screen('appointment-detail')))
      expect(textOf(r.root)).toContain(appointment.bookingId)
    }
  })
})
