import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBuilderAuth } from '@/lib/builder-auth';
import { builderLogin } from '@/services/builder';

export default function BuilderLoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signIn } = useBuilderAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const session = await builderLogin(email.trim(), password);
      await signIn(session);
      router.replace('/builder');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen options={{ title: 'Builder sign in' }} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="title">Builder console</ThemedText>
            <ThemedText type="default" style={{ color: theme.textSecondary }}>
              Manage listings, inventory and leads.
            </ThemedText>

            <View style={styles.form}>
              <TextField
                label="Work email"
                placeholder="you@company.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TextField
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {error && (
                <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
              )}
              <PrimaryButton label="Sign in" onPress={handleSubmit} loading={isSubmitting} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  form: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
});
