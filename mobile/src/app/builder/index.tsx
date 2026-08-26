import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBuilderAuth } from '@/lib/builder-auth';
import { listBuilderProjects } from '@/services/builder';
import type { BuilderProjectSummary } from '@/types/api';

const STATUS_COLORS: Record<string, string> = {
  draft: '#D97706',
  active: '#16A34A',
  sold_out: '#DC2626',
};

export default function BuilderConsoleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { session, isLoading: authLoading, signOut } = useBuilderAuth();
  const [projects, setProjects] = useState<BuilderProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/builder/login');
    }
  }, [authLoading, session, router]);

  const load = useCallback(async () => {
    try {
      setProjects(await listBuilderProjects());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session) return;
    listBuilderProjects()
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
        setError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load projects.');
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (authLoading || !session) {
    return (
      <ThemedView type="background" style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen options={{ title: 'Builder console' }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.container}>
          <View style={[styles.header, { maxWidth: MaxContentWidth }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">Your portfolio</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Signed in as {session.user.email}
              </ThemedText>
            </View>
            <Pressable onPress={() => signOut()} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                Sign out
              </ThemedText>
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.six }} />
          ) : error ? (
            <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
            </ThemedView>
          ) : (
            <FlatList
              data={projects}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={[styles.list, { maxWidth: MaxContentWidth }]}
              refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
              renderItem={({ item }) => (
                <Pressable onPress={() => router.push(`/builder/${item.id}`)}>
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.card, { borderColor: theme.border }]}>
                    <View style={styles.cardHead}>
                      <ThemedText type="subtitle" style={{ fontSize: 17 }}>
                        {item.name}
                      </ThemedText>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: `${STATUS_COLORS[item.status ?? 'draft'] ?? theme.textSecondary}1A` },
                        ]}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: STATUS_COLORS[item.status ?? 'draft'] ?? theme.textSecondary }}>
                          {(item.status ?? 'draft').toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {item.city} · {item.unit_count} units ·{' '}
                      {item.starting_price
                        ? `from ₹${(item.starting_price / 10000000).toFixed(2)} Cr`
                        : 'price on request'}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.success, marginTop: Spacing.one }}>
                      {item.available_units} available for sale
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedText type="default" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                  No projects yet. Create your first listing below.
                </ThemedText>
              }
            />
          )}

          <View style={[styles.footer, { maxWidth: MaxContentWidth }]}>
            <PrimaryButton label="＋ New project" onPress={() => router.push('/builder/new')} />
          </View>
        </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
  },
  list: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half + 2,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  footer: {
    alignSelf: 'center',
    width: '100%',
  },
});
