module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: { '\\.css$': '<rootDir>/__mocks__/style.js' },
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.after-env.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|nativewind|react-native-css-interop|lucide-react-native|react-native-reanimated|react-native-worklets|react-native-mmkv|react-native-nitro-modules|react-native-svg|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-image-picker|@hookform|react-hook-form|zustand)/)',
  ],
};
