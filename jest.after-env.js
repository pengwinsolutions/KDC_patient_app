/* eslint-env jest */
jest.mock('./src/services/latency', () => ({
  MOCK_LATENCY_MS: 0,
  delay: (value) => Promise.resolve(value),
  rejectAfter: (error) => Promise.reject(error),
}));
