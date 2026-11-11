import { useEffect, useState } from 'react'

/** Seconds a call has run: from its real start, or from a preview baseline. */
export function useElapsed(startedAt: number | null, baselineSeconds: number) {
  const [seconds, setSeconds] = useState(baselineSeconds)
  useEffect(() => {
    const anchor = startedAt ?? Date.now() - baselineSeconds * 1000
    const tick = () => setSeconds(Math.floor((Date.now() - anchor) / 1000))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [startedAt, baselineSeconds])
  return seconds
}
