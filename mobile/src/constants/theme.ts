import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FFEDD5',
    textSecondary: '#475569',
    border: '#E2E8F0',
    primary: '#EA580C',
    primaryDark: '#C2410C',
    primarySoft: '#FFF7ED',
    accent: '#1D4ED8',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
  },
  dark: {
    text: '#F1F5F9',
    background: '#0B1120',
    backgroundElement: '#151E31',
    backgroundSelected: '#3B2A1A',
    textSecondary: '#94A3B8',
    border: '#253048',
    primary: '#FB923C',
    primaryDark: '#F97316',
    primarySoft: '#2A1C10',
    accent: '#60A5FA',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Gradients = {
  cta: ['#F97316', '#EA580C'] as const,
  ember: ['#FB923C', '#EA580C'] as const,
  hero: ['rgba(234,88,12,0)', 'rgba(234,88,12,0.35)', 'rgba(234,88,12,0)'] as const,
};

export const Motion = {
  fast: 150,
  base: 220,
  slow: 320,
  stagger: 60,
  pressScale: 0.965,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'DM Sans',
    serif: 'Playfair Display',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'DM Sans',
    serif: 'Playfair Display',
    rounded: 'DM Sans',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 56, android: 84, web: 88 }) ?? 0;
export const MaxContentWidth = 800;

export const Radius = { sm: 10, md: 14, lg: 20, xl: 28 } as const;

export const StatusColors = {
  available: '#16A34A',
  booked: '#D97706',
  sold: '#DC2626',
  draft: '#D97706',
  active: '#16A34A',
  sold_out: '#DC2626',
} as const;

export const Shadows = {
  card: (Platform.select({
    web: {
      boxShadow:
        '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.03)',
    },
    ios: {
      shadowColor: '#0F172A',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
  }) ?? {}) as ViewStyle,
  cardHover: (Platform.select({
    web: {
      boxShadow:
        '0 2px 4px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.1), 0 0 0 1px rgba(15,23,42,0.04)',
    },
  }) ?? {}) as ViewStyle,
};
