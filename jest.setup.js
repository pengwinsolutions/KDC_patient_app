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
