import { Animated, Share, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Entrance, PressableScale } from '@/components/motion';
import { ShimmerBlock } from '@/components/shimmer';
import { ThemedText } from '@/components/themed-text';
import { Gradients, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSaved } from '@/hooks/use-saved';
import { useFollow } from '@/lib/follow';
import { useSession } from '@/lib/session';
import { PROPERTY_TYPE_LABELS, formatCount, formatDate, formatPrice } from '@/lib/format';
import type { Project } from '@/types/api';

export function ProjectCard({
  project,
  index = 0,
  isPopular = false,
}: {
  project: Project;
  index?: number;
  isPopular?: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useSession();
  const { isSaved, toggle } = useSaved();
  const { isFollowing, toggle: toggleFollow } = useFollow();
  const [saveCount, setSaveCount] = useState(project.save_count ?? 0);
  const [heartScale] = useState(() => new Animated.Value(1));
  const [lastSyncedSaveCount, setLastSyncedSaveCount] = useState(project.save_count ?? 0);
  const cover = project.cover_url ?? null;

  // Reset the optimistic counter when the server value changes (React-recommended
  // "adjusting state when a prop changes" — no effect, no ref reads during render).
  if (lastSyncedSaveCount !== (project.save_count ?? 0)) {
    setLastSyncedSaveCount(project.save_count ?? 0);
    setSaveCount(project.save_count ?? 0);
  }

  const saved = isSaved({ projectId: project.id });
  const following = project.builder_id != null && isFollowing(project.builder_id);

  const handleFollow = async () => {
    if (!project.builder_id) return;
    if (!user) {
      // Saved tab hosts the one-tap phone sign-in.
      router.push('/(tabs)/saved');
      return;
    }
    await toggleFollow(project.builder_id);
  };

  const builderInitials = (project.builder_name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  const pulseHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.5, useNativeDriver: true, speed: 45, bounciness: 16 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 45, bounciness: 8 }),
    ]).start();
  };

  const handleSave = async () => {
    if (!user) {
      // Saved tab shows the one-tap phone sign-in, then lets them shortlist.
      router.push('/(tabs)/saved');
      return;
    }
    const wasSaved = isSaved({ projectId: project.id });
    const nowSaved = await toggle({ projectId: project.id });
    if (nowSaved && !wasSaved) {
      setSaveCount((c) => c + 1);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pulseHeart();
    } else if (!nowSaved && wasSaved) {
      setSaveCount((c) => Math.max(0, c - 1));
    }
  };

  const handleShare = async () => {
    const location = [project.locality, project.city].filter(Boolean).join(', ');
    const url = `https://proptech.app/p/${project.id}${user ? `?ref=${user.id}` : ''}`;
    try {
      await Share.share({
        title: project.name,
        message: `🏠 ${project.name} — ${formatPrice(project.starting_price)} · ${location}.\nBrowse exclusive homes and take interactive walkthroughs on our property app.\n${url}`,
      });
    } catch {
      /* user dismissed share */
    }
  };

  return (
    <Entrance index={index}>
      <PressableScale
        onPress={() => router.push(`/project/${project.id}`)}
        accessibilityLabel={`Open ${project.name}`}
        style={[styles.card, Shadows.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.imageWrap}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={styles.image}
              contentFit="cover"
              transition={400}
            />
          ) : (
            <ShimmerBlock width="100%" height={180} radius={0} />
          )}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.65)']} style={styles.gradient} />
          <View style={styles.imageOverlay}>
            <View style={styles.leftBadges}>
              {isPopular && (
                <View style={styles.popularBadge}>
                  <ThemedText type="smallBold" style={styles.popularText}>
                    🔥 Popular
                  </ThemedText>
                </View>
              )}
              {project.status === 'sold_out' && (
                <View style={[styles.chip, styles.soldBadge]}>
                  <ThemedText type="smallBold" style={styles.chipText}>
                    Sold out
                  </ThemedText>
                </View>
              )}
              <LinearGradient
                colors={[Gradients.ember[0], Gradients.ember[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chip}>
                <ThemedText type="smallBold" style={styles.chipText}>
                  {PROPERTY_TYPE_LABELS[project.property_type]}
                </ThemedText>
              </LinearGradient>
            </View>
            <View style={styles.priceBlock}>
              <PressableScale
                onPress={handleShare}
                accessibilityLabel="Share project"
                style={styles.shareBtn}>
                <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
              </PressableScale>
              <View style={styles.priceTextWrap}>
                <ThemedText type="smallBold" style={styles.priceText}>
                  {formatPrice(project.starting_price)}
                </ThemedText>
                <ThemedText type="small" style={styles.priceLabel}>
                  Starting
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <ThemedText type="subtitle" style={styles.name}>
            {project.name}
          </ThemedText>

          {/* Builder attribution + Follow */}
          <View style={styles.builderRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {builderInitials}
              </ThemedText>
            </View>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.builderName}>
              {project.builder_name || 'Trusted builder'}
            </ThemedText>
            {project.builder_id != null && (
              <PressableScale
                onPress={handleFollow}
                accessibilityLabel={following ? 'Unfollow builder' : 'Follow builder'}
                style={[
                  styles.followPill,
                  {
                    backgroundColor: following ? theme.background : theme.primary,
                    borderColor: following ? theme.border : theme.primary,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: following ? theme.textSecondary : '#FFFFFF' }}>
                  {following ? '✓ Following' : '+ Follow'}
                </ThemedText>
              </PressableScale>
            )}
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {[project.locality, project.city].filter(Boolean).join(', ')}
          </ThemedText>

          {/* Social row: animated save w/ counter + view count */}
          <View style={[styles.socialRow, { borderTopColor: theme.border }]}>
            <PressableScale
              onPress={handleSave}
              accessibilityLabel={saved ? 'Remove from saved' : 'Save project'}
              style={styles.socialAction}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={saved ? 'heart' : 'heart-outline'}
                  size={18}
                  color={saved ? theme.danger : theme.textSecondary}
                />
              </Animated.View>
              <ThemedText
                type="smallBold"
                style={{ color: saved ? theme.danger : theme.textSecondary }}>
                {formatCount(saveCount)}
              </ThemedText>
            </PressableScale>

            <View style={styles.socialAction}>
              <Ionicons name="eye-outline" size={18} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {formatCount(project.view_count)}
              </ThemedText>
            </View>

            <View style={styles.socialSpacer} />
          </View>

          <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Possession {formatDate(project.possession_date)}
            </ThemedText>
            <ThemedText type="linkPrimary">Explore →</ThemedText>
          </View>
        </View>
      </PressableScale>
    </Entrance>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  imageWrap: {
    height: 180,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    top: undefined,
    height: 80,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    bottom: undefined,
    top: Spacing.two,
    left: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
  },
  leftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  soldBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  popularBadge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 2,
    backgroundColor: 'rgba(234,88,12,0.95)',
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  chipText: {
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontSize: 11,
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTextWrap: {
    alignItems: 'flex-end',
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  builderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  builderName: {
    flex: 1,
  },
  followPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  socialAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  socialSpacer: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
});