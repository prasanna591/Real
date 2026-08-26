import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSaved } from '@/hooks/use-saved';
import { PROPERTY_TYPE_LABELS, formatPrice } from '@/lib/format';
import { getProject, getUnit, listSaved } from '@/services/api';

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
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    let cancelled = false;
    const rowsPromise = user ? hydrateRows(user.id) : Promise.resolve<SavedRow[]>([]);
    rowsPromise
      .then((nextRows) => {
        if (!cancelled) setRows(nextRows);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
            <ThemedText
              type="linkPrimary"
              onPress={() => router.push('/(tabs)/account')}
              style={{ marginTop: Spacing.two }}>
              Go to Account →
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
                <ThemedText type="smallBold" style={{ color: '#e0245e' }}>
                  Remove
                </ThemedText>
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary">
              Nothing saved yet. Explore projects and tap ♡ Save.
            </ThemedText>
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
});
