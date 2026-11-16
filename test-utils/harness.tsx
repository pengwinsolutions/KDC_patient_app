/* eslint-env jest */
import React from 'react'
import { Text, TextInput } from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactTestRenderer, { type ReactTestInstance } from 'react-test-renderer'

/** The navigation surface screens see; assertions read its spies. */
export const nav = {
  current: 'test',
  stack: [] as string[],
  tab: 'home',
  from: undefined as string | undefined,
  params: {} as Record<string, unknown>,
  navigate: jest.fn(),
  back: jest.fn(),
  resetTo: jest.fn(),
  finishTo: jest.fn(),
  isStatic: false,
}

export function resetNav() {
  nav.from = undefined
  nav.params = {}
  nav.navigate.mockClear()
  nav.back.mockClear()
  nav.resetTo.mockClear()
  nav.finishTo.mockClear()
}

const mounted: ReactTestRenderer.ReactTestRenderer[] = []

/** Unmounts every tree from the last test, so its timers and subscriptions end with it. */
export async function cleanup() {
  await ReactTestRenderer.act(async () => {
    mounted.splice(0).forEach((r) => r.unmount())
  })
}

export async function render(element: React.ReactElement) {
  /* gcTime Infinity: no garbage-collection timers left running after a test (live screen tests load real data). */
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } } })
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<QueryClientProvider client={client}>{element}</QueryClientProvider>)
  })
  await flush()
  mounted.push(renderer!)
  return renderer!
}

export async function flush() {
  await ReactTestRenderer.act(async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  })
}

export function textOf(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => stringify(t.props.children))
    .join(' ')
    .replace(/\s+/g, ' ')
}

function stringify(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(stringify).join('')
  return ''
}

export function allPressables(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')
}

export function pressable(root: ReactTestInstance, label: string): ReactTestInstance {
  const all = allPressables(root)
  const match =
    all.find((p) => p.props.accessibilityLabel === label || textOf(p).trim() === label) ??
    all.find((p) => textOf(p).includes(label))
  if (!match) throw new Error(`No pressable labelled "${label}" in:\n${textOf(root)}`)
  return match
}

export async function press(root: ReactTestInstance, label: string) {
  const target = pressable(root, label)
  await ReactTestRenderer.act(async () => {
    await target.props.onPress?.()
  })
  await flush()
}

export async function type(root: ReactTestInstance, placeholder: string | null, value: string, index = 0) {
  const inputs = root.findAllByType(TextInput)
  const input = placeholder ? inputs.find((i) => i.props.placeholder === placeholder) : inputs[index]
  if (!input) throw new Error(`No input for "${placeholder}"`)
  await ReactTestRenderer.act(async () => {
    input.props.onChangeText?.(value)
  })
  await flush()
}
