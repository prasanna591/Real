import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { FormError, SuccessCard, validateEmail, validatePhone } from '@/components/contact-form';
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
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
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
      <SuccessCard
        title="Enquiry sent"
        message={
          <>
            The sales team for {params.projectName ?? 'this project'} will reach out to you
            shortly.
          </>
        }
        onDone={() => router.back()}
      />
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

          <View style={styles.form}>
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
          </View>

          <FormError error={error} />

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
  form: {
    gap: Spacing.three,
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
