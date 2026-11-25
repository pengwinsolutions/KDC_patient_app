module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }],
    'nativewind/babel',
  ],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    // Build-time settings, inlined when the bundle is built (only these names):
    //   KDC_API_URL  the backend a build talks to (staging / QA builds); see src/services/config.ts
    //   KDC_PERF=1   log screen timings in any build (development builds always do); src/perf
    ['transform-inline-environment-variables', { include: ['KDC_API_URL', 'KDC_PERF'] }],
  ],
};
