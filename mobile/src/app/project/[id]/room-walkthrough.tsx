import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { loadScanSession, type ScanSession } from '@/lib/scan-storage';
import type { Keyframe } from '@/lib/keyframe-selector';

export default function RoomWalkthroughScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; scanId: string }>();

  const [session, setSession] = useState<ScanSession | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const scanId = params.scanId;
    let cancelled = false;
    loadScanSession(scanId)
      .then((s) => {
        if (cancelled) return;
        if (s) {
          setSession(s);
          setStatus('ready');
        } else {
          setStatus('error');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [params.scanId]);

  const keyframes = useMemo<Keyframe[]>(
    () => session?.keyframes ?? [],
    [session?.keyframes],
  );
  const active = keyframes[activeIndex] ?? null;

  // PAN (look around within the current keyframe photo). Photos are captured
  // at a larger asset size than the viewport, so a translate gives a smooth
  // free-look pan left/right/up/down.
  const IMAGE_OVERSCAN = 2.2;
  const imageW = Dimensions.get('window').width * IMAGE_OVERSCAN;
  const imageH = PANO_HEIGHT * IMAGE_OVERSCAN;
  const maxPanX = (imageW - Dimensions.get('window').width) / 2;
  const maxPanY = (imageH - PANO_HEIGHT) / 2;

  const handleGrant = useCallback(() => {
    lastPos.current = null;
  }, []);

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      const { pageX, pageY } = e.nativeEvent;
      const last = lastPos.current;
      if (last) {
        setPanOffset((prev) => ({
          x: Math.max(-maxPanX, Math.min(maxPanX, prev.x - (pageX - last.x) * 1.4)),
          y: Math.max(-maxPanY, Math.min(maxPanY, prev.y - (pageY - last.y) * 1.2)),
        }));
      }
      lastPos.current = { x: pageX, y: pageY };
    },
    [maxPanX, maxPanY],
  );

  const navigateTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= keyframes.length) return;
      setActiveIndex(index);
      setPanOffset({ x: 0, y: 0 });
    },
    [keyframes.length],
  );

  if (status === 'loading') {
    return (
      <ThemedView type="background" style={styles.centered}>
        <Stack.Screen options={{ title: 'Walkthrough' }} />
        <ThemedText type="small">Loading scan…</ThemedText>
      </ThemedView>
    );
  }

  if (status === 'error' || !session) {
    return (
      <ThemedView type="background" style={styles.centered}>
        <Stack.Screen options={{ title: 'Walkthrough' }} />
        <ThemedText type="subtitle">Scan not found</ThemedText>
        <SecondaryButton
          label="Go back"
          onPress={() => router.back()}
          style={{ marginTop: Spacing.three }}
        />
      </ThemedView>
    );
  }

  const hasImages = keyframes.some((kf) => !!kf.imagePath);
  const activeImage = active?.imagePath;

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen options={{ title: `Walkthrough · ${session.name}` }} />

      <View
        style={styles.canvasWrap}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleGrant}
        onResponderMove={handleMove}
      >
        {activeImage ? (
          <Image
            source={{ uri: activeImage }}
            style={{
              width: imageW,
              height: imageH,
              transform: [{ translateX: panOffset.x }, { translateY: panOffset.y }],
            }}
            resizeMode="cover"
          />
        ) : (
          <NoImagePreview />
        )}
        <View style={[styles.hintPill, { backgroundColor: 'rgba(12,14,26,0.55)' }]} pointerEvents="none">
          <ThemedText type="small" style={{ color: '#fff' }}>
            {hasImages ? 'Drag to look around' : 'No photos captured'}
          </ThemedText>
        </View>
        <View style={[styles.counterPill, { backgroundColor: 'rgba(12,14,26,0.55)' }]} pointerEvents="none">
          <ThemedText type="small" style={{ color: '#fff' }}>
            {activeIndex + 1} / {keyframes.length}
          </ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.panel}>
        <View style={styles.dotsRow}>
          {keyframes.map((kf, i) => (
            <View
              key={kf.frameId}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? theme.primary : theme.border,
                },
              ]}
            />
          ))}
        </View>

        {active && (
          <ThemedView type="backgroundElement" style={[styles.infoCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Stop {activeIndex + 1}</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
              Look around this frame, then move to the next stop in the sequence.
            </ThemedText>
            <View style={styles.actionsRow}>
              <View style={styles.halfButton}>
                <SecondaryButton
                  label="← Previous"
                  onPress={() => navigateTo(activeIndex - 1)}
                  disabled={activeIndex === 0}
                />
              </View>
              <View style={styles.halfButton}>
                <PrimaryButton
                  label="Next →"
                  onPress={() => navigateTo(activeIndex + 1)}
                  disabled={activeIndex === keyframes.length - 1}
                />
              </View>
            </View>
          </ThemedView>
        )}

        <ThemedView type="backgroundElement" style={[styles.statsCard, { borderColor: theme.border }]}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <ThemedText type="subtitle" style={{ color: theme.primary }}>
                {keyframes.length}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Stops
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText type="subtitle" style={{ color: theme.primary }}>
                {Math.round(session.coveragePercent)}%
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Coverage
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

function NoImagePreview() {
  const theme = useTheme();
  return (
    <ThemedView type="background" style={styles.noImage}>
      <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
        This stop has no stored photo.
      </ThemedText>
    </ThemedView>
  );
}

const PANO_HEIGHT = 260;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
  },
  canvasWrap: {
    width: '100%',
    height: PANO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#101321',
    position: 'relative',
  },
  noImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
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
  counterPill: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  panel: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  statsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    gap: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  halfButton: {
    flex: 1,
  },
});
