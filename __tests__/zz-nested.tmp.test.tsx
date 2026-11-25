import React from 'react'
import { cleanup, render, resetNav } from '../test-utils/harness'
import { SCREENS } from '../src/navigation/registry'
import { logout } from '../src/store/reset'
jest.mock('../src/navigation/navigation', () => ({ useNav: () => require('../test-utils/harness').nav, devLaunch: { active: true }, routes: { aliases: {}, tabRoots: new Set() }, MAIN: 'main', resetAction: jest.fn() }))
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ setOptions: jest.fn() }) }))
afterEach(cleanup)
test('renders per mount', async () => {
  logout(); resetNav()
  for (const id of ['doctor-search', 'profile', 'appointments', 'orders-home', 'home']) {
    const C = SCREENS.find((s) => s.id === id)!.Component
    const phases: string[] = []
    await render(<React.Profiler id={id} onRender={(_i, ph, ms) => phases.push(`${ph}:${ms.toFixed(0)}`)}><C /></React.Profiler>)
    console.log(id, phases.join(' '))
    await cleanup()
  }
})
