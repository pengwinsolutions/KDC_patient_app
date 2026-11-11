import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useToastStore } from '../../store/toast';
import { Toast } from './Feedback';
import { DEVICE } from './Screen';

/** Renders the current toast over whichever screen is showing. */
export function ToastHost() {
  const toast = useToastStore((s) => s.current);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, top: DEVICE.safeTop + 8, zIndex: 100 }}>
      <Animated.View key={toast.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}>
        <Toast tone={toast.tone} title={toast.title} body={toast.body} />
      </Animated.View>
    </View>
  );
}
