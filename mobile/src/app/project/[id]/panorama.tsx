import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listMedia } from '@/services/api';
import type { MediaAsset } from '@/types/api';

/**
 * Lightweight 360° preview: pans an equirectangular capture horizontally.
 * A full WebGL panorama viewer is planned alongside AR (roadmap Phase 4).
 */
export default function PanoramaScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string; unit?: string }>();
  const projectId = Number(params.id);

  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [offset, setOffset] = useState(0);

  const lastX = useRef<number | null>(null);
  const imageWidth = Dimensions.get('window').width * PAN_FACTOR;
  const maxPan = imageWidth - Dimensions.get('window').width;

  useEffect(() => {
    let cancelled = false;
    listMedia(projectId)
      .then(media => {
        if (cancelled) return;
        const pano =
          media.find(item => item.media_type === 'capture_360') ??
          null;
        if (pano) {
          setAsset(pano);
          setStatus('ready');
        } else {
          setStatus('missing');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleGrant = useCallback(() => {
    lastX.current = null;
  }, []);

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      const { pageX } = e.nativeEvent;
      if (lastX.current !== null) {
        setOffset(prev => Math.min(0, Math.max(-maxPan, prev - (pageX - lastX.current!) * 1.4)));
      }
      lastX.current = pageX;
    },
    [maxPan]
  );

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen options={{ title: asset?.title ?? '360° view' }} />

      {status === 'loading' && (
        <ThemedText type="small" style={styles.note}>
          Loading capture…
        </ThemedText>
      )}

      {status === 'missing' && (
        <View style={[styles.emptyCard, { borderColor: theme.border }]}>
          <ThemedText type="subtitle">No 360° capture yet</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
            The builder team has not registered a 360° capture for this project.
          </ThemedText>
        </View>
      )}

      {status === 'ready' && asset && (
        <>
          <View
            style={styles.panoWrap}
            onStartShouldSetResponder={() => true}
            onResponderGrant={handleGrant}
            onResponderMove={handleMove}>
            <Image
              source={{ uri: asset.url }}
              style={{ width: imageWidth, height: PANO_HEIGHT, transform: [{ translateX: offset }] }}
              resizeMode="cover"
            />
            <View style={[styles.hintPill, { backgroundColor: 'rgba(12,14,26,0.55)' }]} pointerEvents="none">
              <ThemedText type="small" style={{ color: '#fff' }}>
                Drag to look around · 360°
              </ThemedText>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.panel}>
            <ThemedView type="backgroundElement" style={[styles.infoCard, { borderColor: theme.border }]}>
              <ThemedText type="subtitle">{asset.title}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                Equirectangular capture preview. Immersive WebGL panoramas and
                AR walkthroughs are on the platform roadmap.
              </ThemedText>
              <SecondaryButton
                label="Reset view"
                onPress={() => setOffset(0)}
                style={{ marginTop: Spacing.two }}
              />
            </ThemedView>
          </ScrollView>
        </>
      )}
    </ThemedView>
  );
}

const PAN_FACTOR = 3;
const PANO_HEIGHT = 260;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  panoWrap: {
    width: '100%',
    height: PANO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#101321',
  },
  hintPill: {
    position: 'absolute',
    top: Spacing.three,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  panel: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  infoCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    margin: Spacing.four,
    gap: Spacing.two,
  },
  note: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
