import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Entrance, Skeleton } from '@/components/motion';
import { ProjectCard } from '@/components/project-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Gradients, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { listProjects } from '@/services/api';
import type { Project } from '@/types/api';

function CardSkeleton() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <Skeleton width={92} height={22} radius={999} />
        <Skeleton width={72} height={16} />
      </View>
      <Skeleton width="70%" height={26} />
      <Skeleton width="45%" height={14} />
      <View style={styles.skeletonFooter}>
        <Skeleton width={140} height={12} />
        <Skeleton width={60} height={12} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      setProjects(await listProjects());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <Entrance>
                <ThemedText type="smallBold" themeColor="primary" style={styles.eyebrow}>
                  PREMIUM PROPERTIES
                </ThemedText>
                <ThemedText type="title" style={styles.title}>
                  Explore your{'\n'}
                  <ThemedText type="title" themeColor="primary">
                    future home
                  </ThemedText>
                </ThemedText>
                <LinearGradient
                  colors={[Gradients.hero[0], Gradients.hero[2]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.accentBar}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  Interactive property experiences from trusted builders
                </ThemedText>
              </Entrance>
            </View>
          }
          renderItem={({ item, index }) => <ProjectCard project={item} index={index} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          ListEmptyComponent={
            isLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <CardSkeleton key={i} />
                ))}
              </>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor="#EA580C" colors={['#EA580C']} />
          }
          showsVerticalScrollIndicator={false}
        />
        {!isLoading && error && (
          <ThemedView style={[styles.errorBox]} type="backgroundElement">
            <ThemedText type="small">{error}</ThemedText>
            <ThemedText type="linkPrimary" onPress={() => load()} style={{ marginTop: Spacing.two }}>
              Tap to retry
            </ThemedText>
          </ThemedView>
        )}
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
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.two,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontSize: 12,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  accentBar: {
    width: 56,
    height: 4,
    borderRadius: 2,
  },
  skeletonCard: {
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  errorBox: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    borderRadius: 20,
    padding: Spacing.four,
  },
});
