import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { listMyEnquiries, signIn } from '@/services/api';
import type { MyEnquiry } from '@/types/api';

const ENQUIRY_STATUS_LABEL: Record<MyEnquiry['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit: 'Site visit',
  booked: 'Booked',
  closed: 'Closed',
};

export default function AccountScreen() {
  const { user, isLoading: sessionLoading, signIn: persistUser, signOut } = useSession();
  const theme = useTheme();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enquiries, setEnquiries] = useState<MyEnquiry[] | null>(null);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets when signed out
      setEnquiries(null);
      return;
    }
    let cancelled = false;
    setEnquiriesLoading(true);
    listMyEnquiries(user.phone)
      .then((rows) => {
        if (!cancelled) setEnquiries(rows);
      })
      .catch(() => {
        if (!cancelled) setEnquiries([]);
      })
      .finally(() => {
        if (!cancelled) setEnquiriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = () => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setEmail(user.email ?? '');
    }
    setIsEditing(true);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText type="title">Profile</ThemedText>

          {sessionLoading ? (
            <ActivityIndicator />
          ) : user && !isEditing ? (
            /* ─── Profile view ─── */
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <ThemedText type="subtitle" style={{ color: '#FFFFFF' }}>
                  {user.name.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText type="subtitle" style={styles.userName}>
                {user.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {user.phone}
              </ThemedText>
              {user.email ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {user.email}
                </ThemedText>
              ) : null}
              <View style={styles.profileActions}>
                <PrimaryButton label="Edit profile" onPress={startEditing} />
                <SecondaryButton label="Sign out" onPress={() => signOut()} />
              </View>
            </ThemedView>
          ) : isEditing ? (
            <ThemedView style={styles.form}>
              <ThemedText type="small" themeColor="textSecondary">
                {user ? 'Update your details below.' : 'Sign in with your phone to save properties, enquire and book site visits.'}
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
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              )}
              <PrimaryButton
                label={user ? 'Save changes' : 'Continue'}
                onPress={handleSubmit}
                loading={isSubmitting}
              />
              {user && (
                <SecondaryButton
                  label="Cancel"
                  onPress={() => setIsEditing(false)}
                />
              )}
            </ThemedView>
          ) : (
            /* ─── Sign in form ─── */
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
                <ThemedText type="small" style={{ color: theme.danger }}>
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

          {/* My enquiries */}
          {user && (
            <ThemedView type="backgroundElement" style={styles.enquiryCard}>
              <View style={styles.enquiryHeader}>
                <ThemedText type="smallBold">My enquiries</ThemedText>
                {enquiriesLoading && <ActivityIndicator size="small" color={theme.textSecondary} />}
              </View>
              {enquiries !== null && enquiries.length === 0 && !enquiriesLoading ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No enquiries yet. Visit a project and send an enquiry to track its status here.
                </ThemedText>
              ) : (
                (enquiries ?? []).map((enquiry) => (
                  <Pressable
                    key={enquiry.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/project/${enquiry.project_id}`)}
                    style={({ pressed }) => [
                      styles.enquiryRow,
                      { borderColor: theme.border, backgroundColor: theme.background },
                      pressed && { opacity: 0.85 },
                    ]}>
                    <View style={styles.enquiryText}>
                      <ThemedText type="default" numberOfLines={1}>
                        {enquiry.project_name}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {enquiry.unit_id ? 'Unit enquiry' : 'General enquiry'}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: theme.primarySoft },
                        enquiry.status === 'booked' && styles.statusPillBooked,
                        enquiry.status === 'closed' && styles.statusPillClosed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={{ color: enquiry.status === 'booked' || enquiry.status === 'closed' ? '#FFFFFF' : theme.primary }}>
                        {ENQUIRY_STATUS_LABEL[enquiry.status]}
                      </ThemedText>
                    </View>
                  </Pressable>
                ))
              )}
            </ThemedView>
          )}

          {/* Post your property */}
          <ThemedView type="backgroundElement" style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={[styles.postIcon, { backgroundColor: theme.primarySoft }]}>
                <ThemedText type="subtitle" style={{ color: theme.primary }}>
                  +
                </ThemedText>
              </View>
              <View style={styles.postText}>
                <ThemedText type="smallBold">Own a property?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  List it and reach thousands of buyers.
                </ThemedText>
              </View>
            </View>
            <PrimaryButton
              label="Post your property"
              onPress={() => router.push('/post-property')}
            />
          </ThemedView>
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
    borderRadius: Radius.xl,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 26,
    lineHeight: 32,
    marginTop: Spacing.one,
  },
  profileActions: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  form: {
    gap: Spacing.three,
  },
  postCard: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  postIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postText: {
    flex: 1,
    gap: 2,
  },
  enquiryCard: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  enquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enquiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
  },
  enquiryText: {
    flex: 1,
    gap: 2,
  },
  statusPill: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  statusPillBooked: {
    backgroundColor: '#16A34A',
  },
  statusPillClosed: {
    backgroundColor: '#64748B',
  },
});
