import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSaved } from '@/hooks/use-saved';
import { trackEvent } from '@/lib/analytics';
import { PROPERTY_TYPE_LABELS, formatDate, formatPrice } from '@/lib/format';
import { getProject, listMedia } from '@/services/api';
import type { MediaAsset, Project } from '@/types/api';

export default function ProjectDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const theme = useTheme();
  const { user, isSaved, toggle } = useSaved();

  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trackedView = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getProject(projectId), listMedia(projectId)])
      .then(([projectData, mediaData]) => {
        if (cancelled) return;
        setProject(projectData);
        setMedia(mediaData);
        if (!trackedView.current) {
          trackedView.current = true;
          trackEvent({ eventType: 'view', projectId });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error || !project) {
    return (
      <ThemedView style={[styles.container, styles.center, styles.content]}>
        <ThemedText type="small">{error ?? 'Project not found'}</ThemedText>
        <ThemedText type="linkPrimary" onPress={() => router.back()}>
          Go back
        </ThemedText>
      </ThemedView>
    );
  }

  const heroMedia =
    media.find((item) => item.media_type === 'photo') ??
    media.find((item) => item.media_type === 'model_3d');
  const saved = isSaved({ projectId });

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
              <ThemedText type="smallBold">← Back</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => toggle({ projectId })}
              disabled={!user}
              hitSlop={12}>
              <ThemedText
                type="smallBold"
                style={{ color: saved ? '#e0245e' : theme.textSecondary }}>
                {saved ? '♥ Saved' : '♡ Save'}
              </ThemedText>
            </Pressable>
          </View>

          <View
            style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
            {heroMedia ? (
              <Image source={{ uri: heroMedia.url }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <ThemedText type="subtitle" themeColor="textSecondary">
                {project.name}
              </ThemedText>
            )}
          </View>

          <ThemedText type="subtitle">{project.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {PROPERTY_TYPE_LABELS[project.property_type]} ·{' '}
            {[project.locality, project.city].filter(Boolean).join(', ')}
          </ThemedText>

          <View style={styles.specRow}>
            <SpecCard label="Starting price" value={formatPrice(project.starting_price)} />
            <SpecCard label="Possession" value={formatDate(project.possession_date)} />
            <SpecCard label="Status" value={project.status.replace('_', ' ')} />
          </View>

          {project.description ? (
            <ThemedText type="default" themeColor="textSecondary">
              {project.description}
            </ThemedText>
          ) : null}

          {project.amenities.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Amenities</ThemedText>
              <View style={styles.chipWrap}>
                {project.amenities.map((amenity) => (
                  <View
                    key={amenity}
                    style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="small">
                      {amenity.replaceAll('_', ' ')}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <PrimaryButton
              label="Unit availability"
              onPress={() => router.push(`/project/${projectId}/units`)}
            />
            <SecondaryButton
              label="▶  Start 3D walkthrough"
              onPress={() => router.push(`/project/${projectId}/tour`)}
            />
            <SecondaryButton
              label="📷  Room scan"
              onPress={() => router.push(`/project/${projectId}/room-scan?name=${encodeURIComponent(project.name)}`)}
            />
            <SecondaryButton
              label="🌐 360° view"
              onPress={() => router.push(`/project/${projectId}/panorama`)}
            />
            <SecondaryButton
              label="💬 Ask AI assistant"
              onPress={() =>
                router.push(
                  `/project/${projectId}/assistant?projectName=${encodeURIComponent(project.name)}`,
                )
              }
            />
            <View style={styles.actionRow}>
              <View style={styles.halfButton}>
                <PrimaryButton
                  label="Enquire"
                  onPress={() =>
                    router.push({
                      pathname: '/enquiry',
                      params: { projectId: String(projectId), projectName: project.name },
                    })
                  }
                />
              </View>
              <View style={styles.halfButton}>
                <PrimaryButton
                  label="Book visit"
                  onPress={() =>
                    router.push({
                      pathname: '/book-visit',
                      params: { projectId: String(projectId), projectName: project.name },
                    })
                  }
                />
              </View>
            </View>
            {!user && (
              <ThemedText type="small" themeColor="textSecondary">
                Sign in from the Account tab to save properties.
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.specCard, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.specValue}>
        {value}
      </ThemedText>
    </View>
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
    gap: Spacing.three,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  hero: {
    height: 200,
    borderRadius: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  specCard: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  specValue: {
    textTransform: 'capitalize',
  },
  section: {
    gap: Spacing.two,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  actions: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  halfButton: {
    flex: 1,
  },
});
