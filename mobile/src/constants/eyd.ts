/** EYD design language — Deep Navy / Electric Blue, independent of the marketplace theme. */

export interface EyDTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  navy: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  blue: string;
  blueDark: string;
  blueSoft: string;
  warm: string;
  warmSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  onBlue: string;
}

const light: EyDTokens = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F7',
  navy: '#0B1F3A',
  text: '#0B1F3A',
  textSecondary: '#56688A',
  textMuted: '#8A97AE',
  border: '#E1E7F0',
  blue: '#1B5FE0',
  blueDark: '#1448B0',
  blueSoft: '#E9F0FE',
  warm: '#B4632A',
  warmSoft: '#F8EFE7',
  success: '#12805C',
  successSoft: '#E4F4EE',
  warning: '#B7791F',
  warningSoft: '#FBF1DE',
  danger: '#C0392B',
  dangerSoft: '#FBEAE8',
  onBlue: '#FFFFFF',
};

const dark: EyDTokens = {
  bg: '#070D18',
  surface: '#0E1626',
  surfaceAlt: '#141F33',
  navy: '#E9EEF7',
  text: '#E9EEF7',
  textSecondary: '#9AA9BF',
  textMuted: '#6F7F97',
  border: '#1F2C42',
  blue: '#5B93FF',
  blueDark: '#3F7BEE',
  blueSoft: '#13253F',
  warm: '#D08A4E',
  warmSoft: '#241A11',
  success: '#3FBF8F',
  successSoft: '#0F2A22',
  warning: '#E0A93C',
  warningSoft: '#2B2210',
  danger: '#F0706B',
  dangerSoft: '#2E1614',
  onBlue: '#04101F',
};

export function eydTokens(scheme: 'light' | 'dark'): EyDTokens {
  return scheme === 'dark' ? dark : light;
}

export const EyDRadius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const EyDSpacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export type EyDTone = 'neutral' | 'blue' | 'success' | 'warning' | 'danger' | 'warm';
