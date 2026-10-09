import { useColorScheme } from 'react-native';

import { eydTokens, type EyDTokens } from '@/constants/eyd';

export function useEyDTheme(): EyDTokens {
  const scheme = useColorScheme();
  return eydTokens(scheme === 'dark' ? 'dark' : 'light');
}
