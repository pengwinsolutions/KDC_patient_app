/**
 * Progressive rendering for long screens: what's on the first screen draws at once, and the
 * sections below the fold (wrapped in <Deferred>) fill in right after the first frame, as an
 * interruptible React transition — a tap or scroll in that moment is handled first. The person
 * never sees the gap: the content is off-screen when it appears.
 *
 * `minHeight` reserves roughly the space the section will take, so the scroll length doesn't jump.
 * Tests render everything immediately.
 */
import React, { startTransition, useEffect, useState } from 'react'
import { View } from 'react-native'

const IMMEDIATE = process.env.NODE_ENV === 'test'

export function Deferred({ children, minHeight = 0 }: { children: React.ReactNode; minHeight?: number }) {
  const [ready, setReady] = useState(IMMEDIATE)
  useEffect(() => {
    if (ready) return
    // Two frames: the first screen is committed and drawn before this work starts.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => startTransition(() => setReady(true)))
    })
    return () => cancelAnimationFrame(frame)
  }, [ready])
  return ready ? <>{children}</> : <View style={{ minHeight }} />
}
