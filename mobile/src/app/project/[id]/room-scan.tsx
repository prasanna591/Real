import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { CameraView } from 'expo-camera';

import { CoverageHUD } from '@/components/CoverageHUD';
import { MotionIndicator } from '@/components/MotionIndicator';
import { ScanTimer } from '@/components/ScanTimer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createCoverageGrid,
  updateCoverage,
  type Segment,
} from '@/lib/coverage-grid';
import { useARSession } from '@/lib/ar-session';
import {
  evaluateMotionQuality,
  type MotionStatus,
} from '@/lib/motion-quality';
import { KeyframeSelector } from '@/lib/keyframe-selector';
import {
  saveScanSession,
  saveKeyframeImage,
  generateScanId,
  type ScanSession,
} from '@/lib/scan-storage';

const SCAN_DURATION_MS = 60_000;

export default function RoomScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const projectId = Number(params.id);

  const [segments, setSegments] = useState<Segment[]>(() => createCoverageGrid());
  const [coveragePercent, setCoveragePercent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [motionStatus, setMotionStatus] = useState<MotionStatus>('good');
  const [keyframeCount, setKeyframeCount] = useState(0);

  const arSession = useARSession();
  const selectorRef = useRef(new KeyframeSelector());
  const lastPoseRef = useRef<{ yaw: number; pitch: number; timestamp: number } | null>(null);
  const segmentsRef = useRef(segments);
  const cameraRef = useRef<CameraView | null>(null);
  const scanIdRef = useRef<string | null>(null);
  const captureQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const stopInFlightRef = useRef(false);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // serialized photo capture to avoid overlapping takePictureAsync calls
  const captureKeyframePhoto = useCallback(async (frameId: string): Promise<string | null> => {
    const camera = cameraRef.current;
    const scanId = scanIdRef.current;
    if (!camera || !scanId) return null;

    const task = captureQueueRef.current.then(async () => {
      try {
        const photo = await camera.takePictureAsync({ quality: 0.7 });
        if (!photo) return null;
        return await saveKeyframeImage(scanId, frameId, photo.uri);
      } catch {
        return null;
      }
    });
    captureQueueRef.current = task;
    return task;
  }, []);

  const handleStop = useCallback(async () => {
    if (stopInFlightRef.current) return;
    stopInFlightRef.current = true;
    setIsRunning(false);
    arSession.stopTracking();

    // give the in-flight photo captures a moment to flush before finalizing
    await captureQueueRef.current;

    const keyframes = selectorRef.current.getKeyframes();
    const scanId = scanIdRef.current;
    stopInFlightRef.current = false;

    if (keyframes.length === 0 || !scanId) {
      Alert.alert('No data', 'No keyframes were captured. Try again.');
      return;
    }

    const session: ScanSession = {
      id: scanId,
      projectId,
      name: params.name ?? `Scan ${new Date().toLocaleDateString()}`,
      thumbnailPath: keyframes[0]?.imagePath ?? null,
      keyframeCount: keyframes.length,
      coveragePercent: coveragePercent,
      durationMs: SCAN_DURATION_MS,
      createdAt: new Date().toISOString(),
      keyframes,
    };

    await saveScanSession(session);

    Alert.alert(
      'Scan saved',
      `Captured ${keyframes.length} keyframes (${Math.round(coveragePercent)}% coverage).`,
      [
        {
          text: 'View walkthrough',
          onPress: () =>
            router.push(`/project/${projectId}/room-walkthrough?scanId=${scanId}`),
        },
        { text: 'OK' },
      ],
    );
  }, [arSession, projectId, params.name, coveragePercent, router]);

  const handlePoseUpdate = useCallback(
    (pose: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number }; angularVelocity: { x: number; y: number; z: number }; timestamp: number }) => {
      if (!isRunning) return;

      const now = Date.now();
      const last = lastPoseRef.current;

      const yaw = Math.atan2(
        2 * (pose.rotation.w * pose.rotation.z + pose.rotation.x * pose.rotation.y),
        1 - 2 * (pose.rotation.y * pose.rotation.y + pose.rotation.z * pose.rotation.z),
      );
      const pitch = Math.asin(
        Math.max(-1, Math.min(1, 2 * (pose.rotation.w * pose.rotation.x - pose.rotation.z * pose.rotation.y))),
      );

      if (last) {
        const dt = now - last.timestamp;
        const updated = updateCoverage(segmentsRef.current, yaw, pitch, dt);
        setSegments([...updated.segments]);
        setCoveragePercent(updated.coveragePercent);

        // AUTO-STOP: end the scan early once coverage is complete (~85%).
        if (updated.isComplete && isRunning) {
          setIsComplete(true);
          void handleStop();
          return;
        }
      }

      lastPoseRef.current = { yaw, pitch, timestamp: now };

      const motion = evaluateMotionQuality(pose.angularVelocity);
      setMotionStatus(motion.status);

      const candidate = selectorRef.current.addFrame(
        `kf_${now}`,
        '',
        pose.position,
        pose.rotation,
        now,
        motion.status === 'good',
      );
      if (candidate) {
        // Real photo capture for this accepted keyframe (best-effort).
        const frameId = candidate.frameId;
        captureKeyframePhoto(frameId).then((imagePath) => {
          if (!imagePath) return;
          // stamp the image path onto the already-selected keyframe
          const list = selectorRef.current.getKeyframes();
          const idx = list.findIndex((kf) => kf.frameId === frameId);
          if (idx >= 0) {
            list[idx].imagePath = imagePath;
          }
        });
        setKeyframeCount(selectorRef.current.getKeyframeCount());
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRunning],
  );

  useEffect(() => {
    const unsub = arSession.registerPoseCallback(handlePoseUpdate);
    return unsub;
  }, [arSession, handlePoseUpdate]);

  const handleStart = useCallback(async () => {
    const ok = await arSession.startTracking();
    if (!ok) {
      Alert.alert('Permission needed', 'Camera access is required for room scanning.');
      return;
    }
    arSession.resetPose();
    selectorRef.current.reset();
    scanIdRef.current = generateScanId();
    setSegments(createCoverageGrid());
    setCoveragePercent(0);
    setIsComplete(false);
    setKeyframeCount(0);
    setIsRunning(true);
  }, [arSession]);

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen
        options={{
          title: 'Room Scan',
          headerTransparent: true,
          headerTintColor: '#fff',
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />

        <CoverageHUD
          segments={segments}
          coveragePercent={coveragePercent}
        />

        <MotionIndicator status={motionStatus} />

        {isRunning && (
          <ScanTimer
            durationMs={SCAN_DURATION_MS}
            isRunning={isRunning}
            onStop={handleStop}
          />
        )}

        {!isRunning && !isComplete && (
          <View style={styles.startOverlay}>
            <ThemedText type="subtitle" style={styles.startTitle}>
              Room Scan
            </ThemedText>
            <ThemedText type="small" style={styles.startSubtitle}>
              Point your camera around the room to capture all angles
            </ThemedText>
            <Pressable
              onPress={handleStart}
              style={[styles.startButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText type="default" style={styles.startButtonText}>
                Start Scanning
              </ThemedText>
            </Pressable>
          </View>
        )}

        {isComplete && !isRunning && (
          <View style={styles.completeOverlay}>
            <ThemedText type="subtitle" style={styles.completeTitle}>
              Coverage complete
            </ThemedText>
            <ThemedText type="small" style={styles.completeSubtitle}>
              {keyframeCount} keyframes captured
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.infoPanel}>
        <ThemedView type="backgroundElement" style={[styles.infoCard, { borderColor: theme.border }]}>
          <ThemedText type="subtitle">
            {params.name ?? `Project ${projectId}`}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
            Move slowly around the room. The grid shows which areas you&apos;ve captured.
            Aim for 85%+ coverage for a complete walkthrough.
          </ThemedText>
        </ThemedView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cameraWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  startOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: Spacing.two,
  },
  startTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  startSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  startButton: {
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  completeOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: Spacing.one,
  },
  completeTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  completeSubtitle: {
    color: 'rgba(255,255,255,0.7)',
  },
  infoPanel: {
    padding: Spacing.four,
  },
  infoCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
