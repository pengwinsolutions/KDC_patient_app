/**
 * Where the app gets its data, fixed per build.
 *
 * - Live (`useMock: false`): the KDC+ backend at `baseUrl` (its /api/v1 root).
 * - Demo (`useMock: true`): the in-app mock services and seeded data, on the
 *   prototype's fixed date (5 Oct 2025). Never use it with real patients.
 *
 * Release builds always talk to production. Development builds talk to the backend on
 * the developer's computer (`npm run start:dev` in KDC_backend, port 4000): `localhost`
 * reaches it from the iOS Simulator, and from an Android phone or emulator once
 * `npm run api:reverse` has forwarded the port over USB. Point DEVELOPMENT_API at a
 * staging server to test against that instead.
 */
const PRODUCTION_API = 'https://api.kdcplus.in/api/v1'
const DEVELOPMENT_API = 'http://localhost:4000/api/v1'

/** Set at build time (KDC_API_URL=… when bundling) for staging and QA builds; wins over both. */
const BUILD_API = process.env.KDC_API_URL

export const API_CONFIG = {
  useMock: false,
  baseUrl: BUILD_API || (__DEV__ ? DEVELOPMENT_API : PRODUCTION_API),
  timeoutMs: 20_000,
}

export const LIVE = !API_CONFIG.useMock
