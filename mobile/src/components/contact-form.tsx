import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return 'Please enter a valid 10-digit phone number';
  if (digits.length > 12) return 'Phone number is too long';
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email.trim())) return 'Please enter a valid email address';
  return null;
}

export function FormError({ error }: { error: string | null }) {
  const theme = useTheme();
  if (!error) return null;
  return (
    <ThemedText type="small" style={{ color: theme.danger }}>
      {error}
    </ThemedText>
  );
}

export function SuccessCard({
  title,
  message,
  onDone,
}: {
  title: string;
  message: ReactNode;
  onDone: () => void;
}) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={[styles.safeArea, styles.center]} edges={['top', 'bottom']}>
        <ThemedView type="backgroundElement" style={styles.doneCard}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.doneMessage}>
            {message}
          </ThemedText>
          <View style={styles.doneButton}>
            <PrimaryButton label="Done" onPress={onDone} />
          </View>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  doneCard: {
    borderRadius: Spacing.four,
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
    width: '100%',
  },
  doneMessage: {
    textAlign: 'center',
  },
  doneButton: {
    width: '100%',
    marginTop: Spacing.three,
  },
});
