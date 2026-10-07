import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'display' | 'eyebrow' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const colorKey = themeColor ?? (type === 'linkPrimary' ? 'primary' : 'text');

  return (
    <Text
      style={[
        { color: theme[colorKey] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'display' && styles.display,
        type === 'eyebrow' && styles.eyebrow,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 46,
    letterSpacing: -1.0,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  display: {
    fontFamily: Fonts.serif,
    fontSize: 44,
    fontWeight: '600',
    lineHeight: 50,
    letterSpacing: -1.2,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: Fonts.sans,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Fonts.sans,
    lineHeight: 30,
    fontSize: 14,
    fontWeight: '700',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
  },
});
