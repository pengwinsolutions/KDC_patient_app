/**
 * Live mode with nothing loaded yet (a new patient, or before the first sync): every screen must
 * render without crashing. Demo builds always have seed data, so the demo screen tests can't catch a
 * screen that assumes a list has a first item. No backend is needed: the address below refuses
 * connections, so any load a screen starts fails like an outage.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react'
import ReactTestRenderer, { act } from 'react-test-renderer'

jest.doMock('../src/services/config', () => ({
  API_CONFIG: { useMock: false, baseUrl: 'http://127.0.0.1:9/api/v1', timeoutMs: 2000 },
  LIVE: true,
}))
jest.doMock('../src/navigation/navigation', () => ({
  useNav: () => ({ current: 'x', stack: [], tab: 'home', params: {}, navigate: jest.fn(), back: jest.fn(), resetTo: jest.fn(), finishTo: jest.fn(), isStatic: false }),
  devLaunch: { active: true }, // splash and other timed screens stay put instead of navigating
  MAIN: 'main',
  routes: { aliases: {}, tabRoots: new Set() },
  resetAction: jest.fn(),
}))

jest.doMock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  // A few screens listen to navigation events directly (e.g. leaving checkout).
  useNavigation: () => ({ addListener: () => () => undefined, setOptions: jest.fn(), dispatch: jest.fn(), navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => false }),
  useIsFocused: () => true,
}))

const { SCREENS } = require('../src/navigation/registry') as typeof import('../src/navigation/registry')
const { LIVE } = require('../src/services/config') as typeof import('../src/services/config')
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query') as typeof import('@tanstack/react-query')

describe('live mode, nothing loaded: every screen renders', () => {
  it('runs in live mode', () => expect(LIVE).toBe(true))

  it.each(SCREENS.map((d) => [d.id, d.Component] as const))('%s', async (_id, Component) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    let renderer!: ReactTestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = ReactTestRenderer.create(
        <QueryClientProvider client={client}>
          <Component />
        </QueryClientProvider>,
      )
    })
    expect(renderer.toJSON()).toBeTruthy()
    await act(async () => renderer.unmount())
    client.clear()
  })
})
