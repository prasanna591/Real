import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { signIn } from '@/services/api';

export default function AccountScreen() {
  const { user, isLoading: sessionLoading, signIn: persistUser, signOut } = useSession();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (name.trim().length < 1) {
      setError('Please enter your name');
      return;
    }
    if (phone.trim().length < 8) {
      setError('Please enter a valid phone number');
      return;
    }
    setIsSubmitting(true);
    try {
      const signedIn = await signIn(name.trim(), phone.trim(), email.trim());
      await persistUser(signedIn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Account</ThemedText>

          {sessionLoading ? (
            <ActivityIndicator />
          ) : user ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText type="subtitle">{user.name.charAt(0).toUpperCase()}</ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.userName}>
                {user.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {user.phone}
                {user.email ? ` · ${user.email}` : ''}
              </ThemedText>
              <View style={{ marginTop: Spacing.three }}>
                <PrimaryButton label="Sign out" onPress={() => signOut()} />
              </View>
            </ThemedView>
          ) : (
            <ThemedView style={styles.form}>
              <ThemedText type="small" themeColor="textSecondary">
                Sign in with your phone to save properties, enquire and book site visits.
              </ThemedText>
              <TextField
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
              />
              <TextField
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={15}
              />
              <TextField
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {error && (
                <ThemedText type="small" style={{ color: '#c94f4f' }}>
                  {error}
                </ThemedText>
              )}
              <PrimaryButton
                label="Continue"
                onPress={handleSubmit}
                loading={isSubmitting}
              />
            </ThemedView>
          )}
        </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 24,
    lineHeight: 30,
  },
  form: {
    gap: Spacing.three,
  },
});
