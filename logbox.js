/**
 * Development-only filters for known third-party warnings, registered before anything else loads:
 * index.js imports this first. (In App.tsx they ran too late: NativeWind's runtime, loaded by
 * App's global.css import, reads React Native's deprecated ImageBackground export before them,
 * so its warning still covered the bottom of the screen.)
 */
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'ImageBackground is deprecated',
  'Sending `onAnimatedValueUpdate`',
  '[Reanimated] Dependencies should only be used',
  // Shown when the device has Reduce motion turned on.
  '[Reanimated] Reduced motion setting',
]);
