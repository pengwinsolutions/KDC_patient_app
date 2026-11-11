import { useEffect, useState } from 'react'

/** Seconds remaining, ticking down to zero; `restart` begins again. */
export function useCountdown(from: number) {
  const [remaining, setRemaining] = useState(from)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [generation])

  return {
    remaining,
    restart: (seconds = from) => {
      setRemaining(seconds)
      setGeneration((g) => g + 1)
    },
  }
}
