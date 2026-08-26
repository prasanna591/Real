import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/lib/session';
import { submitEnquiry } from '@/services/api';

export default function EnquiryScreen() {
  const params = useLocalSearchParams<{
    projectId: string;
    projectName?: string;
    unitId?: string;
    unitNumber?: string;
  }>();
  const router = useRouter();
  const { user } = useSession();

  const projectId = Number(params.projectId);
  const unitId = params.unitId ? Number(params.unitId) : undefined;

  const [nameInput, setName] = useState<string | null>(null);
  const [phoneInput, setPhone] = useState<string | null>(null);
  const [emailInput, setEmail] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? '';
  const phone = phoneInput ?? user?.phone ?? '';
  const email = emailInput ?? user?.email ?? '';
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

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
      await submitEnquiry({
        projectId,
        unitId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.center]} edges={['top', 'bottom']}>
          <ThemedView type="backgroundElement" style={styles.doneCard}>
            <ThemedText type="subtitle">Enquiry sent ✓</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              The sales team for {params.projectName ?? 'this project'} will reach out to you
              shortly.
            </ThemedText>
            <View style={{ width: '100%', marginTop: Spacing.three }}>
              <PrimaryButton label="Done" onPress={() => router.back()} />
            </View>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="small" themeColor="textSecondary">
            {params.projectName ?? 'Project'}
            {params.unitNumber ? ` · Unit ${params.unitNumber}` : ''}
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
          <TextField
            label="Message (optional)"
            value={message}
            onChangeText={setMessage}
            placeholder="I'm interested in..."
            multiline
            style={styles.messageInput}
          />

          {error && (
            <ThemedText type="small" style={{ color: '#c94f4f' }}>
              {error}
            </ThemedText>
          )}

          <PrimaryButton label="Send enquiry" onPress={handleSubmit} loading={isSubmitting} />
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  messageInput: {
    height: 96,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
});
