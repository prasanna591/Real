import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Entrance } from '@/components/motion';
import { ProjectCard } from '@/components/project-card';
import { ShimmerBlock } from '@/components/shimmer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Gradients, BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFollow } from '@/lib/follow';
import { useOffline } from '@/lib/network';
import { useSession } from '@/lib/session';
import { listProjects } from '@/services/api';
import { formatPrice } from '@/lib/format';
import type { BuilderCard, FeedResponse, Project, PropertyType, ProjectStatus } from '@/types/api';

/* ─── Filter types ─── */
interface Filters {
  propertyType?: PropertyType;
  city?: string;
  status?: ProjectStatus;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'luxury_apartment', label: 'Apartments' },
  { value: 'villa', label: 'Villas' },
  { value: 'premium_residence', label: 'Residences' },
  { value: 'waterfront', label: 'Waterfront' },
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'sold_out', label: 'Sold out' },
];

const CITIES = ['Mumbai', 'Bengaluru', 'Pune', 'Delhi NCR'];

/* ─── Skeleton ─── */
function CardSkeleton() {
  const theme = useTheme();
  return (
    <View style={[styles.skeletonCard, { backgroundColor: theme.backgroundElement }]}>
      <ShimmerBlock width="100%" height={150} radius={0} />
      <View style={styles.skeletonBody}>
        <ShimmerBlock width={72} height={22} radius={999} />
        <ShimmerBlock width="70%" height={22} />
        <ShimmerBlock width="45%" height={14} />
        <ShimmerBlock width="55%" height={12} />
      </View>
    </View>
  );
}

/* ─── People to follow rail item ─── */
function BuilderChip({
  builder,
  people,
}: {
  builder: BuilderCard;
  people: { isFollowing: (id: number) => boolean; onToggle: (id: number) => void };
}) {
  const theme = useTheme();
  const following = people.isFollowing(builder.id);
  const initials = (builder.name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <View style={[styles.builderChip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.builderAvatar, { backgroundColor: theme.primarySoft }]}>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          {initials}
        </ThemedText>
      </View>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.builderChipName}>
        {builder.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {builder.project_count} {builder.project_count === 1 ? 'project' : 'projects'}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={following ? `Unfollow ${builder.name}` : `Follow ${builder.name}`}
        onPress={() => people.onToggle(builder.id)}
        style={[
          styles.followPill,
          {
            backgroundColor: following ? theme.background : theme.primary,
            borderColor: following ? theme.border : theme.primary,
          },
        ]}>
        <ThemedText type="smallBold" style={{ color: following ? theme.textSecondary : '#FFFFFF' }}>
          {following ? '✓' : '+ Follow'}
        </ThemedText>
      </Pressable>
    </View>
  );
}

/* ─── Personalised feed item ─── */
function FeedCard({ item }: { item: FeedResponse['items'][number] }) {
  const theme = useTheme();
  const router = useRouter();
  const kindEmoji = item.kind === 'units' ? '🏗️' : item.kind === 'launch' ? '🚀' : item.kind === 'popular' ? '🔥' : '⭐';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/project/${item.project.id}`)}
      style={[styles.feedCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="eyebrow" themeColor="primary" style={styles.feedHeadline}>
        {kindEmoji} {item.headline}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={2}>
        {item.project.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {[item.project.locality, item.project.city].filter(Boolean).join(', ')} ·{' '}
        {formatPrice(item.project.starting_price)}
      </ThemedText>
    </Pressable>
  );
}

/* ─── Main screen ─── */
export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isOffline } = useOffline();
  const { user } = useSession();
  const { following, suggestions, feed, toggle, isFollowing, refresh: refreshFollows } = useFollow();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({});

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      const cacheKey = `projects.cache.${filters.propertyType ?? '*'}.${filters.city ?? '*'}.${filters.status ?? '*'}`;
      try {
        const fresh = await listProjects(filters);
        setProjects(fresh);
        if (fresh.length > 0) {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(fresh));
        }
      } catch (err) {
        /* fall back to cached data if available (offline-first) */
        try {
          const raw = await AsyncStorage.getItem(cacheKey);
          if (raw) {
            setProjects(JSON.parse(raw) as Project[]);
          } else {
            setError(err instanceof Error ? err.message : 'Something went wrong');
          }
        } catch {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard async data-fetch pattern
    load();
  }, [load]);

  /* client-side text search */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.locality.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const featured = useMemo(() => {
    const active = projects.filter((p) => p.status !== 'sold_out');
    // Trending = real social proof: views + saves, biggest first.
    return [...active]
      .sort((a, b) => (b.view_count + b.save_count) - (a.view_count + a.save_count))
      .slice(0, 5);
  }, [projects]);

  const toggleFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? undefined : value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const hasActiveFilters = Boolean(filters.propertyType || filters.city || filters.status || search);

  const handleFollow = async (builderId: number) => {
    if (!user) {
      // Saved screen hosts the one-tap phone sign-in.
      router.push('/saved');
      return;
    }
    await toggle(builderId);
  };

  /* ─── Header ─── */
  const header = (
    <View style={styles.header}>
      <Entrance>
        <ThemedText type="eyebrow" themeColor="primary">
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

      {/* Trending strip */}
      {featured.length > 0 && (
        <Entrance index={2}>
          <View style={styles.trendingHeader}>
            <ThemedText type="smallBold" themeColor="primary">
              🔥 Trending now
            </ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}>
            {featured.map((project) => (
              <Pressable
                key={project.id}
                accessibilityRole="button"
                onPress={() => router.push(`/project/${project.id}`)}
                style={[
                  styles.trendingChip,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.trendingName}>
                  {project.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {formatPrice(project.starting_price)} · {project.city}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </Entrance>
      )}

      {/* People to follow rail */}
      {suggestions.length > 0 && (
        <Entrance index={2}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" themeColor="primary">
              People to follow
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {following.length} {following.length === 1 ? 'builder' : 'builders'} followed
            </ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}>
            {suggestions.map((builder) => (
              <BuilderChip key={builder.id} builder={builder} people={{ isFollowing, onToggle: handleFollow }} />
            ))}
          </ScrollView>
        </Entrance>
      )}

      {/* Personalised feed */}
      {user && feed && feed.items.length > 0 && (
        <Entrance index={2}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold" themeColor="primary">
              From builders you follow
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              Latest updates
            </ThemedText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingRow}>
            {feed.items.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </ScrollView>
        </Entrance>
      )}

      {/* Search bar */}
      <Entrance index={1}>
        <View
          style={[
            styles.searchWrap,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search projects, localities, cities…"
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable accessibilityRole="button" onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </Entrance>

      {/* Offline banner */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.backgroundSelected, borderColor: theme.warning }]}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.warning, flex: 1 }}>
            You appear to be offline. Please check your connection.
          </ThemedText>
        </View>
      )}

      {/* Post your property CTA */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/post-property')}
        style={({ pressed }) => [
          styles.postCta,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <View style={[styles.postCtaIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="add" size={20} color={theme.primary} />
        </View>
        <View style={styles.postCtaText}>
          <ThemedText type="smallBold">Own a property?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            List it free and reach thousands of buyers
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </Pressable>

      {/* Room scans entry */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/scans')}
        style={({ pressed }) => [
          styles.postCta,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <View style={[styles.postCtaIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="scan-outline" size={20} color={theme.primary} />
        </View>
        <View style={styles.postCtaText}>
          <ThemedText type="smallBold">Room scans</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Capture AR walkthroughs of any space
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </Pressable>

      {/* Filter chips */}
      <Entrance index={2}>
        <View style={styles.filterSection}>
          <View style={styles.filterLabel}>
            <ThemedText type="small" themeColor="textSecondary">
              Property type
            </ThemedText>
            {hasActiveFilters && (
              <Pressable accessibilityRole="button" onPress={clearFilters} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  Clear all
                </ThemedText>
              </Pressable>
            )}
          </View>
          <View style={styles.chipRow}>
            {PROPERTY_TYPES.map((pt) => (
              <Pressable
                key={pt.value}
                accessibilityRole="button"
                onPress={() => toggleFilter('propertyType', pt.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      filters.propertyType === pt.value ? theme.text : theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: filters.propertyType === pt.value ? theme.background : theme.text,
                  }}>
                  {pt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.filterLabel}>
            <ThemedText type="small" themeColor="textSecondary">
              City
            </ThemedText>
          </View>
          <View style={styles.chipRow}>
            {CITIES.map((city) => (
              <Pressable
                key={city}
                accessibilityRole="button"
                onPress={() => toggleFilter('city', city)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      filters.city === city ? theme.text : theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: filters.city === city ? theme.background : theme.text }}>
                  {city}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.filterLabel}>
            <ThemedText type="small" themeColor="textSecondary">
              Status
            </ThemedText>
          </View>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((s) => (
              <Pressable
                key={s.value}
                accessibilityRole="button"
                onPress={() => toggleFilter('status', s.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      filters.status === s.value ? theme.text : theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: filters.status === s.value ? theme.background : theme.text,
                  }}>
                  {s.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </Entrance>

      {/* Result count */}
      {(!isLoading || isRefreshing) && (
        <View style={styles.resultRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
            {hasActiveFilters ? ' found' : ' available'}
          </ThemedText>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <ProjectCard
            project={item}
            index={index}
            isPopular={featured.some((f) => f.id === item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          isLoading && !isRefreshing ? (
            <View>
              {[0, 1, 2].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </View>
          ) : (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <Ionicons name="home-outline" size={56} color={theme.textSecondary} />
              <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
                {hasActiveFilters ? 'No matching projects' : 'No projects yet'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query.'
                  : 'New properties will appear here once listed by builders.'}
              </ThemedText>
              {hasActiveFilters && (
                <Pressable
                  accessibilityRole="button"
                  onPress={clearFilters}
                  style={[styles.ctaBtn, { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                    Clear filters
                  </ThemedText>
                </Pressable>
              )}
            </ThemedView>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void load(true);
              void refreshFollows();
            }}
            tintColor="#EA580C"
            colors={['#EA580C']}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      {!isLoading && error && (
        <ThemedView style={[styles.errorBox, { backgroundColor: theme.backgroundElement }]} type="backgroundElement">
          <ThemedText type="small">{error}</ThemedText>
          <ThemedText type="linkPrimary" onPress={() => load()} style={{ marginTop: Spacing.two }}>
            Tap to retry
          </ThemedText>
        </ThemedView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    gap: Spacing.three,
  },
  title: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.8,
  },
  accentBar: {
    width: 56,
    height: 4,
    borderRadius: 2,
  },
  trendingHeader: {
    marginBottom: Spacing.two,
  },
  trendingRow: {
    gap: Spacing.two,
    paddingRight: Spacing.two,
    paddingBottom: Spacing.one,
  },
  trendingChip: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 132,
    maxWidth: 180,
    gap: 2,
  },
  trendingName: {
    fontSize: 14,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  postCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
  },
  postCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postCtaText: {
    flex: 1,
    gap: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'DM Sans',
  },
  filterSection: {
    gap: Spacing.one + 2,
  },
  filterLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 4,
    borderWidth: 1,
  },
  resultRow: {
    paddingTop: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  builderChip: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    minWidth: 96,
    maxWidth: 132,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
  builderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderChipName: {
    maxWidth: 116,
  },
  followPill: {
    marginTop: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  feedCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    minWidth: 200,
    maxWidth: 240,
    gap: 6,
  },
  feedHeadline: {
    textTransform: 'uppercase',
  },
  skeletonCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  skeletonBody: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyState: {
    borderRadius: Radius.xl,
    padding: Spacing.six,
    gap: Spacing.three,
    alignItems: 'center',
  },
  ctaBtn: {
    borderRadius: 999,
    paddingHorizontal: Spacing.five,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    borderRadius: Radius.xl,
    padding: Spacing.four,
  },
});
