import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { type MotionStatus, getStatusMessage, getStatusColor } from '@/lib/motion-quality';

interface MotionIndicatorProps {
  status: MotionStatus;
  style?: ViewStyle;
}

export function MotionIndicator({ status, style }: MotionIndicatorProps) {
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const message = getStatusMessage(status);
  const color = getStatusColor(status);

  useEffect(() => {
    if (status === 'good') {
      pulseAnim.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [status, pulseAnim]);

  if (status === 'good') return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: color, opacity: pulseAnim },
        style,
      ]}
    >
      <ThemedText type="small" style={styles.text}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.three,
    left: '50%',
    transform: [{ translateX: -50 }],
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.xl,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
