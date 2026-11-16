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

export function registerDomain(d: SyncDomain) {
  if (!domains.some((x) => x.name === d.name)) domains.push(d)
}

export async function syncAll(): Promise<void> {
  await Promise.all(domains.map((d) => d.load()))
}

export async function syncOne(...names: string[]): Promise<void> {
  await Promise.all(domains.filter((d) => names.includes(d.name)).map((d) => d.load()))
}

export function clearAll() {
  domains.forEach((d) => d.clear())
}

export const domainNames = () => domains.map((d) => d.name)
