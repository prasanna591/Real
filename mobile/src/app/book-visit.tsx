import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/lib/session';
import { bookSiteVisit } from '@/services/api';

function parseScheduled(raw: string): Date | null {
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatSlot(daysFromNow: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour)}:${daysFromNow === 2 ? '30' : '00'}`;
}

export default function BookVisitScreen() {
  const params = useLocalSearchParams<{
    projectId: string;
    projectName?: string;
    unitId?: string;
    unitNumber?: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const { user } = useSession();

  const projectId = Number(params.projectId);
  const unitId = params.unitId ? Number(params.unitId) : undefined;

  const [nameInput, setName] = useState<string | null>(null);
  const [phoneInput, setPhone] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? '';
  const phone = phoneInput ?? user?.phone ?? '';
  const [slot, setSlot] = useState('');
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
    const scheduledAt = parseScheduled(slot);
    if (!scheduledAt) {
      setError('Use the format YYYY-MM-DD HH:MM');
      return;
    }
    if (scheduledAt.getTime() < Date.now()) {
      setError('Please pick a future date and time');
      return;
    }
    setIsSubmitting(true);
    try {
      await bookSiteVisit({
        projectId,
        unitId,
        visitorName: name.trim(),
        visitorPhone: phone.trim(),
        scheduledAt,
      });
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.center]} edges={['top', 'bottom']}>
          <ThemedView type="backgroundElement" style={styles.doneCard}>
            <ThemedText type="subtitle">Visit booked ✓</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your site visit to {params.projectName ?? 'the project'} is scheduled for{' '}
              {slot}. The sales team will confirm shortly.
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
            label="Date & time"
            value={slot}
            onChangeText={setSlot}
            placeholder="YYYY-MM-DD HH:MM"
            autoCapitalize="none"
          />
          <View style={styles.slotRow}>
            {[
              { label: 'Tomorrow · 10 AM', days: 1, hour: 10 },
              { label: 'Tomorrow · 4 PM', days: 1, hour: 16 },
              { label: 'In 2 days · 11 AM', days: 2, hour: 11 },
            ].map((preset) => {
              const selected = slot === formatSlot(preset.days, preset.hour);
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => setSlot(formatSlot(preset.days, preset.hour))}
                  style={[
                    styles.slotChip,
                    {
                      backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: selected ? theme.primary : theme.text }}>
                    {preset.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Format: YYYY-MM-DD HH:MM (e.g. tomorrow at this time)
          </ThemedText>

          {error && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          )}

          <PrimaryButton label="Confirm booking" onPress={handleSubmit} loading={isSubmitting} />
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
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  slotChip: {
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 4,
  },
});
