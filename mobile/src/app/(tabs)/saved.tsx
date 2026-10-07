import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSaved } from '@/hooks/use-saved';
import { useSession } from '@/lib/session';
import { PROPERTY_TYPE_LABELS, formatPrice } from '@/lib/format';
import { getProject, getUnit, listSaved, signIn as signInService } from '@/services/api';

interface SavedRow {
  key: string;
  itemId: number;
  projectId: number;
  unitId: number | null;
  title: string;
  subtitle: string;
}

async function hydrateRows(userId: number): Promise<SavedRow[]> {
  const savedItems = await listSaved(userId);
  const hydrated = await Promise.all(
    savedItems.map(async (item): Promise<SavedRow | null> => {
      try {
        if (!item.project_id) return null;
        const project = await getProject(item.project_id);
        if (item.unit_id) {
          const unit = await getUnit(project.id, item.unit_id);
          return {
            key: `u-${item.unit_id}`,
            itemId: item.id,
            projectId: project.id,
            unitId: unit.id,
            title: `${project.name} · ${unit.unit_number}`,
            subtitle: `${unit.bhk} BHK · ${formatPrice(unit.price)}`,
          };
        }
        return {
          key: `p-${project.id}`,
          itemId: item.id,
          projectId: project.id,
          unitId: null,
          title: project.name,
          subtitle: `${PROPERTY_TYPE_LABELS[project.property_type]} · ${formatPrice(
            project.starting_price,
          )}`,
        };
      } catch {
        return null;
      }
    }),
  );
  return hydrated.filter((row): row is SavedRow => row !== null);
}

export default function SavedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, isLoading: sessionLoading, toggle } = useSaved();
  const { signIn } = useSession();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  const handleOneTapLogin = useCallback(async () => {
    if (name.trim().length < 1) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    if (phone.trim().length < 8) {
      Alert.alert('Phone required', 'Please enter a valid phone number.');
      return;
    }
    setIsLoginSubmitting(true);
    try {
      const signedIn = await signInService(name.trim(), phone.trim(), email.trim());
      await signIn(signedIn);
    } catch (err) {
      Alert.alert('Sign-in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setIsLoginSubmitting(false);
    }
  }, [name, phone, email, signIn]);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setRows(await hydrateRows(user.id));
    } catch {
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard async data-fetch pattern
    load();
  }, [load]);

  if (sessionLoading || isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centerContent]} edges={['top']}>
          <ThemedView type="backgroundElement" style={styles.signInPrompt}>
            <ThemedText type="subtitle">Save your favourites</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Sign in to shortlist properties and units.
            </ThemedText>
            <View style={styles.loginFields}>
              <TextField
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
              />
              <TextField
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 …"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <TextField
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <PrimaryButton
                label="Log in"
                onPress={handleOneTapLogin}
                loading={isLoginSubmitting}
                disabled={isLoginSubmitting}
              />
            </View>
            <ThemedText
              type="linkPrimary"
              onPress={() => router.push('/(tabs)/account')}
              style={{ marginTop: Spacing.one }}>
              Manage account →
            </ThemedText>
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          refreshing={isLoading}
          onRefresh={load}
          ListHeaderComponent={
            <ThemedText type="title" style={styles.title}>
              Saved
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/project/${item.projectId}`)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.backgroundElement },
                pressed && { opacity: 0.85 },
              ]}>
              <View style={styles.rowText}>
                <ThemedText type="default">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.subtitle}
                </ThemedText>
              </View>
              <Pressable hitSlop={12} onPress={() => toggle({ projectId: item.projectId, unitId: item.unitId ?? undefined }).then(load)}>
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  Remove
                </ThemedText>
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="heart-outline" size={44} color={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
                Nothing saved yet
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={{ textAlign: 'center' }}>
                Explore projects and tap ♡ Save to shortlist your favourite homes.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)')}
                style={[styles.exploreBtn, { backgroundColor: theme.primary }]}>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                  Explore projects
                </ThemedText>
              </Pressable>
            </View>
          }
        />
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInPrompt: {
    borderRadius: Spacing.four,
    padding: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
    width: '100%',
  },
  loginFields: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  exploreBtn: {
    borderRadius: 999,
    paddingHorizontal: Spacing.five,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});
