/**
 * @format
 */

// First: development warning filters must be in place before any library loads.
import './logbox';
import { AppRegistry } from 'react-native';
import { registerGlobals } from '@livekit/react-native';
import App from './App';
import { registerBackgroundPush } from './src/notifications/push';
import { name as appName } from './app.json';

// WebRTC for consultation calls (LiveKit); must run before anything uses it.
registerGlobals();
// Push that arrives while the app is closed (on only when Firebase is configured).
registerBackgroundPush();

AppRegistry.registerComponent(appName, () => App);
