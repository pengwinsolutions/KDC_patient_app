/**
 * A page with a sticky footer must be able to scroll its end out from under the footer, however
 * tall the footer turns out to be (its content, the safe area and the font size all change it).
 * Screens used to rely on a guessed padding (pb-[120px]) that was short on some phones.
 */
import React from 'react'
import { ScrollView, Text } from 'react-native'
import { act } from 'react-test-renderer'
import { cleanup, render } from '../../test-utils/harness'
import { Div } from '../../src/components/primitives'
import { Screen } from '../../src/components/ui/Screen'
import { Button, StickyBar } from '../../src/components/ui/Button'

afterEach(cleanup)

function Page({ pad = 'pb-[120px]' }: { pad?: string }) {
  return (
    <Screen padBottom={false}>
      <Div className={`flex-1 px-5 ${pad}`}>
        <Text>Earliest available</Text>
      </Div>
      <StickyBar>
        <Text>Selected</Text>
        <Button onClick={() => undefined}>Continue</Button>
      </StickyBar>
    </Screen>
  )
}

const bottomPad = (r: Awaited<ReturnType<typeof render>>) => r.root.findByType(ScrollView).props.contentContainerStyle.paddingBottom as number

async function layoutFooter(r: Awaited<ReturnType<typeof render>>, height: number) {
  // The footer is the view that reports its layout and isn't the scroller.
  const footer = r.root.findAll((n) => typeof n.props.onLayout === 'function' && n.type !== ScrollView && typeof n.type === 'string').at(-1)!
  await act(async () => footer.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 390, height } } }))
}

test('a footer taller than the page’s own padding gets the difference back, plus a gap', async () => {
  const r = await render(<Page />)
  await layoutFooter(r, 180)
  // The page reserves 120: 180 + 16 gap − 120.
  expect(bottomPad(r)).toBe(76)
})

test('a page that already reserves enough gets nothing extra', async () => {
  const r = await render(<Page pad="pb-[220px]" />)
  const before = bottomPad(r)
  await layoutFooter(r, 180)
  expect(bottomPad(r)).toBe(before)
})

test('tailwind scale padding counts too (pb-24 is 96)', async () => {
  const r = await render(<Page pad="pb-24" />)
  await layoutFooter(r, 150)
  expect(bottomPad(r)).toBe(150 + 16 - 96)
})
