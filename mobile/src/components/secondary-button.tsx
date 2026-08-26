import { StyleSheet, Text, StyleProp, ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PressableScale } from '@/components/motion';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SecondaryButton({ label, onPress, disabled, compact, style }: SecondaryButtonProps) {
  const theme = useTheme();

  return (
    <PressableScale onPress={onPress} disabled={disabled} style={style}>
      <Text
        style={[
          styles.label,
          compact && styles.compact,
          {
            color: theme.primary,
            backgroundColor: theme.primarySoft,
            borderColor: `${theme.primary}55`,
          },
        ]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  label: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    textAlignVertical: 'center',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: Spacing.four,
  },
  compact: {
    height: 52,
    minWidth: 64,
    paddingHorizontal: Spacing.two,
  },
});
