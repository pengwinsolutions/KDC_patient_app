/* eslint-env jest */
const mockStores = new Map();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key) => mockStores.get(key),
    set: (key, value) => mockStores.set(key, value),
    remove: (key) => mockStores.delete(key),
  }),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// The Keychain, in memory (react-native-keychain has no native module under Jest).
jest.mock('react-native-keychain', () => {
  const store = new Map();
  return {
    ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AfterFirstUnlockThisDeviceOnly' },
    setGenericPassword: async (username, password, opts) => {
      store.set(opts?.service ?? 'default', { username, password });
      return true;
    },
    getGenericPassword: async (opts) => store.get(opts?.service ?? 'default') ?? false,
    resetGenericPassword: async (opts) => store.delete(opts?.service ?? 'default'),
  };
});

// Razorpay Checkout has no native module under Jest; contract tests replace `open` (see __tests__/live/).
// LiveKit needs WebRTC native modules: tests use the controllable stand-in in test-support/livekit.tsx.
jest.mock('@livekit/react-native', () => require('./test-support/livekit').reactNative);
jest.mock('livekit-client', () => require('./test-support/livekit').client);
// Firebase isn't configured in tests: push is off (src/notifications/push.ts is a no-op without an app).
jest.mock('@react-native-firebase/app', () => ({ getApps: () => [] }));
jest.mock('@react-native-firebase/messaging', () => ({}));
jest.mock('react-native-razorpay', () => ({ __esModule: true, default: { open: jest.fn(async () => ({})) } }));

// Demo by default; with PATIENT_LIVE_URL the app's live layer talks to that backend (contract tests).
jest.mock('./src/services/config', () => {
  const live = Boolean(process.env.PATIENT_LIVE_URL);
  return {
    API_CONFIG: { useMock: !live, baseUrl: process.env.PATIENT_LIVE_URL ?? 'https://api.kdcplus.in/api/v1', timeoutMs: 20000 },
    LIVE: live,
  };
});
