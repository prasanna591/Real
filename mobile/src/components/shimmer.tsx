import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks/use-theme';

interface Props {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function ShimmerBlock({ width = '100%', height, radius = 12, style }: Props) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1, false);
  }, [progress]);

  const sweep = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-180, 260]),
      },
    ],
  }));

  return (
    <View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.backgroundSelected, overflow: 'hidden' },
        style,
      ]}>
      <Animated.View style={[styles.sweepTrack, sweep]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sweepTrack: {
    width: 160,
    height: '100%',
  },
});
