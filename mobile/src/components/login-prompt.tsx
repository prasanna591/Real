import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { validateEmail, validatePhone } from '@/components/contact-form';
import { signIn } from '@/services/api';

interface Props {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginPrompt({
  visible,
  title = 'Log in to continue',
  subtitle = 'Sign in with your phone to enquire, book visits and view walkthroughs.',
  onClose,
  onSuccess,
}: Props) {
  const theme = useTheme();
  const { signIn: persistUser } = useSession();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

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
      const user = await signIn(name.trim(), phone.trim(), email.trim());
      await persistUser(user);
      reset();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Dismiss" />
        <SafeAreaView style={styles.sheetWrap} edges={['bottom']}>
          <ThemedView type="backgroundElement" style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <ThemedText type="subtitle" style={styles.title}>
                {title}
              </ThemedText>
              <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
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
              {error && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}
              <PrimaryButton label="Continue" onPress={handleSubmit} loading={isSubmitting} />
            </View>

            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <ThemedText type="small" themeColor="textSecondary">
                or
              </ThemedText>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            <Pressable accessibilityRole="button" onPress={handleClose} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.primary, textAlign: 'center' }}>
                Continue browsing as guest
              </ThemedText>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,120,128,0.4)',
    alignSelf: 'center',
    marginBottom: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    flex: 1,
    paddingRight: Spacing.two,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
});
