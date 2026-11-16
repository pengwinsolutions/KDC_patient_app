# KDC+ Patient

The patient app for KDC+:
- **Care:** finding doctors, booking consultations, appointments and the waiting room, prescriptions.
- **Shopping:** medicines with prescription upload, lab tests with home collection, lab reports.
- **Account:** family members and medical records, payments, KDC+ Plus membership, notifications and support.

It's a bare React Native CLI app (no Expo) for Android and iOS, ported from the KDC+ blueprint.

## Run

```bash
npm install
cd ios && pod install && cd ..   # iOS only
npm start                        # Metro
npm run android                  # or: npm run ios
```

## Live or demo

`src/services/config.ts` decides, per build:

- **Live** (`useMock: false`, the default): set `baseUrl` to the KDC+ backend's API root, e.g. `https://api.kdcplus.in/api/v1`. Patients sign in with their mobile number and a 6-digit SMS code. The first sign-in creates the account, and the patient then completes their profile (consent is required).
- **Demo** (`useMock: true`): the original prototype, with seeded data on its fixed date (5 Oct 2025) and a prefilled sign-in. Never use it with real patients.

## Where things live

| Path | What |
| --- | --- |
| `src/services/config.ts` | Live or demo, and the backend address |
| `src/services/index.ts` | The services switch: `services/live/*` (backend) or the mock services |
| `src/services/live/http.ts` | Calls the backend and throws `ServiceError` (`services/errors.ts`) with the server's message and field. Refreshes an expired access token once (one refresh at a time) and ends the session once when it can't continue, never on an outage. Uploads with progress |
| `src/services/live/sync*.ts` | Loads the stores from the backend, after sign-in and on every launch, and clears them on sign-out. The areas: care (doctors, appointments, prescriptions), commerce (catalogue, orders, reports), account (family, medical, addresses, records, notifications, settings), money (membership, payments) |
| `src/services/live/holds.ts`, `flows-*.ts` | Checkout: the server creates and prices the purchase, then it's paid through Razorpay Checkout (`flows-payment.ts`, `checkout.ts`) |
| `src/store/secure.ts` | The refresh token in the iOS Keychain / Android Keystore (`react-native-keychain`) |
| `src/store/storage.ts` | Live: only the session store persists, holding nothing but "intro seen". Everything about the patient stays in memory |

## Live mode

How live builds behave, following the backend's rules:

- **Session:**
  - The refresh token lives in the Keychain / Keystore (after first unlock, this device only). The access token is never written to disk.
  - Launching restores the session and reloads everything; an outage shows "Try again" and never signs out.
  - *Log out* ends the session on the server and clears everything from the phone.
  - *Delete account* confirms with an SMS code, then erases the account on the server.
- **Doctors and booking:**
  - Doctors, specialties, reviews and saved doctors come from the directory.
  - Dates and slots are the doctor's real availability, and the server refuses a slot someone has just taken.
  - Cancelling shows the server's quote (free, or a late fee and refund).
- **Consultations:** the waiting room joins and follows the session on the server. **There's no video or audio yet:** the provider (decision D5) isn't chosen, and the screen says so.
- **Payments:**
  - The server creates the purchase (appointment, order, lab booking or membership), which holds the slot or stock and prices it. The patient pays that total in Razorpay Checkout (UPI, cards, netbanking, wallets), and the server verifies it.
  - There's no card form in the app. Medicines can be paid on delivery, and lab tests at collection.
  - A closed Checkout keeps the purchase on hold, so retrying pays the same one.
- **Pharmacy and lab tests:**
  - The catalogue, stock and prices come from the server.
  - Prescription medicines need a KDC+ prescription or an uploaded photo; the server says what isn't covered.
  - Orders and bookings show the server's stages.
  - Lab reports show their results; their files can't be opened yet.
- **Membership:** plans, member rates and savings come from the server, so displayed member prices match the bills. Auto-renew is only a saved preference, because recurring billing isn't built.
- **Account:** family, medical info, addresses, the health timeline, notifications, settings (saved on the server) and support tickets.
- **Not yet:**
  - push notifications (needs the KDC+ Firebase files)
  - profile, family and doctor photos (need authenticated image loading)
  - opening report files, invoices and documents (needs a file viewer)
  - PDF prescription upload (no document picker installed)
  - the delivery and home-collection fees before ordering (not in the public settings)
  - reading or replying to a support ticket in the app
  - distance-based doctor search (the app doesn't ask for location)

## Native setup

- **Razorpay:** `react-native-razorpay` 3.0.0 is set up for both platforms.
  - iOS: its pod, plus `LSApplicationQueriesSchemes` (tez, phonepe, paytmmp) in `Info.plist` so UPI apps open.
  - Android: its ProGuard rules are in `android/app/proguard-rules.pro`.
- **Keychain:** `react-native-keychain` 11.0.0.

## Tests

`npm test` runs in demo mode: the stores, flows, payments, search, validation, and a render of every screen.

The live contract tests in `__tests__/live/` run the app's own stores and flows on a running backend:

| Suite | What it covers |
| --- | --- |
| `core` | SMS sign-in, onboarding, session restore, logout |
| `care` and `care-screens` | Search, doctor detail and slots, booking, reschedule, cancel, the waiting room, prescriptions, feedback; screens render blank, then the server's data |
| `commerce` | Medicines and tests, labs and slots, cash-on-delivery and prescription orders, lab bookings, stages, reports |
| `account` | Family, medical, addresses, settings, timeline, notifications, support, account deletion |
| `money` | Membership through Razorpay Checkout (a cancelled payment and its retry), history and summary, UPI ids, a consultation and pharmacy orders through checkout, ending the membership |

They're skipped unless `PATIENT_LIVE_URL` and `PATIENT_DATA` are set; see `test-support/live.ts`. The data file comes from the backend test kit.
