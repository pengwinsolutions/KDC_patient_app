/**
 * Live builds: the stores are filled from the backend, not from seed data. Each area
 * registers how to load and how to forget its data. `syncAll` runs after sign-in and on
 * every launch (the splash screen); `clearAll` on sign-out, so nothing about the patient
 * or their family stays on the phone.
 */
export interface SyncDomain {
  name: string
  load(): Promise<void>
  clear(): void
}

const domains: SyncDomain[] = []

/**
 * Loads every area's module, so each has registered itself. The bundler evaluates modules lazily
 * (inline requires), so a side-effect import elsewhere may not have run yet on a cold start with a
 * saved session — then nothing would load.
 */
function ensureDomains() {
  require('./sync-care')
  require('./sync-commerce')
  require('./sync-account')
  require('./sync-money')
}

export function registerDomain(d: SyncDomain) {
  if (!domains.some((x) => x.name === d.name)) domains.push(d)
}

export async function syncAll(): Promise<void> {
  ensureDomains()
  await Promise.all(domains.map((d) => d.load()))
}

export async function syncOne(...names: string[]): Promise<void> {
  ensureDomains()
  await Promise.all(domains.filter((d) => names.includes(d.name)).map((d) => d.load()))
}

export function clearAll() {
  ensureDomains()
  domains.forEach((d) => d.clear())
}

export const domainNames = () => domains.map((d) => d.name)
