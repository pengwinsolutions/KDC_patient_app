import './global.css';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastHost } from './src/components/ui/ToastHost';
import { PushBannerHost } from './src/components/ui/PushBanner';
import { DeviceFrame } from './src/components/ui/DeviceFrame';


const queryClient = new QueryClient();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <DeviceFrame>
            <RootNavigator />
            <ToastHost />
            <PushBannerHost />
          </DeviceFrame>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
