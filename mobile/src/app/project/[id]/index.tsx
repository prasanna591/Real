import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ImageGallery } from '@/components/image-gallery';
import { EMICalculator } from '@/components/emi-calculator';
import { LoginPrompt } from '@/components/login-prompt';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSaved } from '@/hooks/use-saved';
import { useSession } from '@/lib/session';
import { trackEvent } from '@/lib/analytics';
import { PROPERTY_TYPE_LABELS, formatCount, formatDate, formatPrice } from '@/lib/format';
import { getProject, listMedia } from '@/services/api';
import type { MediaAsset, Project } from '@/types/api';

type PendingAction = 'tour' | 'enquiry' | 'book-visit' | null;

export default function ProjectDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const theme = useTheme();
  const { user } = useSession();
  const { isSaved, toggle } = useSaved();

  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [saveCount, setSaveCount] = useState(0);
  const [heartScale] = useState(() => new Animated.Value(1));
  const trackedView = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getProject(projectId), listMedia(projectId)])
      .then(([projectData, mediaData]) => {
        if (cancelled) return;
        setProject(projectData);
        setSaveCount(projectData.save_count ?? 0);
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

  /* Gate an action behind login; resume it after successful sign-in */
  const gate = (action: Exclude<PendingAction, null>) => {
    if (user) {
      runPending(action);
      return;
    }
    setPendingAction(action);
    setLoginVisible(true);
  };

  const runPending = (action: Exclude<PendingAction, null>) => {
    switch (action) {
      case 'tour':
        router.push(`/project/${projectId}/tour`);
        break;
      case 'enquiry':
        router.push({
          pathname: '/enquiry',
          params: { projectId: String(projectId), projectName: project?.name ?? '' },
        });
        break;
      case 'book-visit':
        router.push({
          pathname: '/book-visit',
          params: { projectId: String(projectId), projectName: project?.name ?? '' },
        });
        break;
    }
  };

  const handleLoginSuccess = () => {
    const action = pendingAction;
    setLoginVisible(false);
    setPendingAction(null);
    if (action) runPending(action);
  };

  const pulseHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.5, useNativeDriver: true, speed: 45, bounciness: 16 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 45, bounciness: 8 }),
    ]).start();
  };

  const handleSave = async () => {
    if (!user) {
      setLoginVisible(true);
      return;
    }
    const wasSaved = isSaved({ projectId });
    const nowSaved = await toggle({ projectId });
    if (nowSaved && !wasSaved) {
      setSaveCount((c) => c + 1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pulseHeart();
    } else if (!nowSaved && wasSaved) {
      setSaveCount((c) => Math.max(0, c - 1));
    }
  };

  const handleShare = async () => {
    const name = project?.name ?? 'this project';
    const price = project ? `${formatPrice(project.starting_price)} · ` : '';
    const location = project
      ? [project.locality, project.city].filter(Boolean).join(', ')
      : '';
    const url = `https://proptech.app/p/${project?.id ?? ''}${user ? `?ref=${user.id}` : ''}`;
    const message = `🏠 ${name} — ${price}${location}.\nFind exclusive homes and take interactive walkthroughs on our property app.\n${url}`;
    if (project) {
      void trackEvent({ eventType: 'share', projectId: project.id, refUserId: user?.id });
    }
    try {
      await Share.share({ title: name, message });
    } catch {
      /* user dismissed share */
    }
  };

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
  const hasGallery = media.filter(
    (m) => m.media_type === 'photo' || m.media_type === 'model_3d',
  ).length > 1;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
              <ThemedText type="smallBold">← Back</ThemedText>
            </Pressable>
            <View style={styles.topActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share project"
                onPress={handleShare}
                hitSlop={12}>
                <Ionicons name="share-social-outline" size={22} color={theme.primary} />
              </Pressable>
              {hasGallery && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View photo gallery"
                  onPress={() => setGalleryVisible(true)}
                  hitSlop={12}>
                  <Ionicons name="images-outline" size={22} color={theme.primary} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={saved ? 'Remove from saved' : 'Save project'}
                onPress={handleSave}
                hitSlop={12}
                style={styles.saveChip}>
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Ionicons
                    name={saved ? 'heart' : 'heart-outline'}
                    size={20}
                    color={saved ? theme.danger : theme.primary}
                  />
                </Animated.View>
                <ThemedText
                  type="smallBold"
                  style={{ color: saved ? theme.danger : theme.primary }}>
                  {formatCount(saveCount)}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Hero / gallery preview */}
          <Pressable
            accessibilityRole="button"
            onPress={() => hasGallery && setGalleryVisible(true)}
            style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
            {heroMedia ? (
              <Image
                source={{ uri: heroMedia.url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <ThemedText type="subtitle" themeColor="textSecondary">
                {project.name}
              </ThemedText>
            )}
            {hasGallery && (
              <View style={[styles.galleryBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Ionicons name="images" size={14} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: '#FFFFFF' }}>
                  {media.filter((m) => m.media_type === 'photo' || m.media_type === 'model_3d').length} photos
                </ThemedText>
              </View>
            )}
          </Pressable>

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

          {/* Social proof strip */}
          <View style={[styles.socialStrip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.socialStat}>
              <Ionicons name="heart" size={16} color={theme.danger} />
              <ThemedText type="smallBold">{formatCount(saveCount)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">saved</ThemedText>
            </View>
            <View style={[styles.socialDivider, { backgroundColor: theme.border }]} />
            <View style={styles.socialStat}>
              <Ionicons name="eye-outline" size={16} color={theme.textSecondary} />
              <ThemedText type="smallBold">{formatCount(project.view_count)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">views</ThemedText>
            </View>
            <View style={[styles.socialDivider, { backgroundColor: theme.border }]} />
            <View style={styles.socialStat}>
              <Ionicons name="trending-up" size={16} color={theme.primary} />
              <ThemedText type="smallBold">{formatCount(project.view_count + project.save_count)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">interest</ThemedText>
            </View>
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
                    style={[styles.chip, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <ThemedText type="small">
                      {amenity.replaceAll('_', ' ')}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* EMI Calculator */}
          <EMICalculator basePrice={project.starting_price} />

          <View style={styles.actions}>
            <PrimaryButton
              label="Unit availability"
              onPress={() => router.push(`/project/${projectId}/units`)}
            />
            <SecondaryButton
              label="▶  Start 3D walkthrough"
              onPress={() => gate('tour')}
            />
            <SecondaryButton
              label="📷  Room scan"
              onPress={() =>
                router.push(
                  `/project/${projectId}/room-scan?name=${encodeURIComponent(project.name)}`,
                )
              }
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
                  onPress={() => gate('enquiry')}
                />
              </View>
              <View style={styles.halfButton}>
                <PrimaryButton
                  label="Book visit"
                  onPress={() => gate('book-visit')}
                />
              </View>
            </View>
            {!user && (
              <ThemedText type="small" themeColor="textSecondary">
                Log in to start walkthroughs, enquire, book visits and save.
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Full-screen image gallery */}
      <Modal
        visible={galleryVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setGalleryVisible(false)}>
        <ImageGallery
          media={media}
          initialIndex={0}
          onClose={() => setGalleryVisible(false)}
        />
      </Modal>

      {/* Inline login gate */}
      <LoginPrompt
        visible={loginVisible}
        title={
          pendingAction === 'tour'
            ? 'Log in to start the walkthrough'
            : pendingAction === 'enquiry'
              ? 'Log in to enquire'
              : 'Log in to book a visit'
        }
        subtitle="Sign in with your phone to continue. You can also keep browsing without an account."
        onClose={() => {
          setLoginVisible(false);
          setPendingAction(null);
        }}
        onSuccess={handleLoginSuccess}
      />
    </ThemedView>
  );
}

function SpecCard({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.specCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  saveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one,
    borderColor: 'transparent',
  },
  socialStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    justifyContent: 'space-between',
  },
  socialStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    flex: 1,
  },
  socialDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
  },
  hero: {
    height: 220,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBadge: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
  },
  specRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  specCard: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
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
    borderWidth: 1,
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
