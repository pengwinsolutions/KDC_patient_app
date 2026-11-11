/** Simulated network round trip for the mock services. */
export const MOCK_LATENCY_MS = 220

export function delay<T>(value: T, ms = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export async function rejectAfter(error: Error, ms = MOCK_LATENCY_MS): Promise<never> {
  await delay(undefined, ms)
  throw error
}
