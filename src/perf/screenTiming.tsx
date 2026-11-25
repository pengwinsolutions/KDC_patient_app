/**
 * Screen timing, logged as "[perf] <screen> …" (Metro / React Native DevTools):
 * - "shown Nms": from the screen's first render until it is laid out and drawn (JS render,
 *   native views and layout). Works in any build: always in development, and in a release
 *   bundle built with KDC_PERF=1.
 * - "mount|update Nms" (development only, React's Profiler): JS render time, and re-renders
 *   slow enough to notice — a run of them is a re-render storm.
 * Otherwise a plain pass-through.
 */
import React from 'react'
import { View } from 'react-native'

const ENABLED = __DEV__ || process.env.KDC_PERF === '1'
const SLOW_UPDATE_MS = 8
const fill = { flex: 1 }

export function ScreenTiming({ id, children }: { id: string; children: React.ReactNode }) {
  const start = React.useRef(performance.now())
  const shown = React.useRef(false)
  if (!ENABLED) return <>{children}</>

  const timed = (
    <View
      style={fill}
      onLayout={() => {
        if (shown.current) return
        shown.current = true
        // The frame after layout is when it's on screen.
        requestAnimationFrame(() => console.log(`[perf] ${id} shown ${(performance.now() - start.current).toFixed(0)}ms`))
      }}
    >
      {children}
    </View>
  )
  if (!__DEV__) return timed
  return (
    <React.Profiler
      id={id}
      onRender={(_id, phase, actualMs) => {
        if (phase === 'mount' || actualMs >= SLOW_UPDATE_MS) console.log(`[perf] ${id} ${phase} ${actualMs.toFixed(0)}ms`)
      }}
    >
      {timed}
    </React.Profiler>
  )
}
