import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * The small "You" tile over a video call, with properly rounded corners on Android too.
 *
 * Android draws call video on its own surface, which ignores borderRadius and overflow:hidden,
 * so a rounded tile shows the video's square corners poking past its border. Instead of
 * clipping, the video sits slightly inset and an opaque rounded frame on top trims it: the
 * frame's inner opening is rounded, and the inset keeps the video's square corners inside the
 * frame's outer curve (inset ≥ radius × (1 − 1/√2), about 0.29 × radius), so nothing pokes out.
 * Same look on iOS.
 */
const RADIUS = 16;
const INSET = 5; // ≥ 16 × 0.293 = 4.7
const FRAME = 5; // ≥ INSET, so the frame covers the video's edges and corners
const FRAME_COLOR = '#0B1424';

export function SelfViewFrame({
  width,
  height,
  style,
  label = 'You',
  children,
}: {
  width: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
  /** The video (or a placeholder), laid out to fill the inner area. */
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const inner = { width: width - INSET * 2, height: height - INSET * 2 };
  return (
    <View pointerEvents="box-none" style={[{ position: 'absolute', width, height }, style]}>
      <View style={[styles.inner, inner]}>{children(inner)}</View>
      <View pointerEvents="none" style={styles.frame} />
      <View pointerEvents="none" style={styles.hairline} />
      <View pointerEvents="none" style={styles.labelWrap}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { position: 'absolute', left: INSET, top: INSET, backgroundColor: '#1E293B', overflow: 'hidden' },
  frame: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS, borderWidth: FRAME, borderColor: FRAME_COLOR },
  hairline: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  labelWrap: {
    position: 'absolute',
    left: FRAME + 5,
    bottom: FRAME + 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(11,20,36,0.6)',
  },
  label: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
});
