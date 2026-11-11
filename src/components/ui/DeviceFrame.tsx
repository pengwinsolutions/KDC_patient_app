import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEVICE } from './Screen';

/**
 * Root wrapper. Screens fill the whole window on phones and tablets alike.
 * Insets are read live rather than once at launch, because Android tablets
 * report the taskbar after the app starts; without this, footers and the tab
 * bar draw underneath it.
 */
export function DeviceFrame({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  DEVICE.safeTop = insets.top;
  DEVICE.safeBottom = insets.bottom;
  DEVICE.width = width;
  DEVICE.height = height;
  return <View style={{ flex: 1 }}>{children}</View>;
}

/** Content raised in a native Modal; full width, like the screens. */
export function FrameBox({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
