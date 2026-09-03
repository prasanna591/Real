import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScanTimerProps {
  durationMs: number;
  isRunning: boolean;
  onStop: () => void;
  style?: ViewStyle;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function ScanTimer({ durationMs, isRunning, onStop, style }: ScanTimerProps) {
  const theme = useTheme();
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (!isRunning) {
      startTimeRef.current = null;
      return;
    }

    startTimeRef.current = Date.now();
    const baseElapsed = elapsedRef.current;

    const tick = () => {
      if (startTimeRef.current) {
        const next = baseElapsed + (Date.now() - startTimeRef.current);
        elapsedRef.current = next;
        setElapsed(next);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (elapsed >= durationMs && isRunning) {
      onStop();
    }
  }, [elapsed, durationMs, isRunning, onStop]);
  const remaining = Math.max(0, durationMs - elapsed);
  const progress = Math.min(1, elapsed / durationMs);
  const isLow = remaining < 10000;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.timerRow}>
        <View
          style={[
            styles.timeBadge,
            {
              backgroundColor: isLow ? theme.danger : 'rgba(12,14,26,0.75)',
            },
          ]}
        >
          <ThemedText type="small" style={styles.timeText}>
            {formatTime(remaining)}
          </ThemedText>
        </View>

        <Pressable
          onPress={onStop}
          style={[styles.stopButton, { backgroundColor: theme.danger }]}
        >
          <ThemedText type="small" style={styles.stopText}>
            Stop
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: isLow ? theme.danger : theme.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  timeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
  timeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  stopButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.sm,
  },
  stopText: {
    color: '#fff',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
