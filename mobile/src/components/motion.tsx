import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';

const SPRING = { damping: 18, stiffness: 260, mass: 0.6 } as const;

export function PressableScale({
  onPress,
  style,
  children,
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
}: {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link';
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
        scale.value = withSpring(0.972, SPRING);
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }}
      onPressOut={() => {
        // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
        scale.value = withSpring(1, SPRING);
      }}>
      <Animated.View style={[animated, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Entrance({
  index = 0,
  delay,
  style,
  children,
}: {
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const ms = delay ?? Math.min(index * 70, 420);
  return (
    <Animated.View entering={FadeInDown.duration(480).delay(ms).easing(Easing.out(Easing.cubic))} style={style}>
      {children}
    </Animated.View>
  );
}

export function Skeleton({ width, height, radius = 12 }: { width?: number | `${number}%`; height: number; radius?: number }) {
  const theme = useTheme();
  const opacity = useSharedValue(0.45);
  const shimmer = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared value
    opacity.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        shimmer,
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: theme.backgroundSelected },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {},
});
