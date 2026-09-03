import React, { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  GRID_SEGMENTS_YAW,
  GRID_SEGMENTS_PITCH,
  type Segment,
} from '@/lib/coverage-grid';

interface CoverageHUDProps {
  segments: Segment[];
  coveragePercent: number;
  style?: ViewStyle;
}

export function CoverageHUD({ segments, coveragePercent, style }: CoverageHUDProps) {
  const theme = useTheme();

  const rows = useMemo(() => {
    const result: Segment[][] = [];
    for (let p = 0; p < GRID_SEGMENTS_PITCH; p++) {
      const start = p * GRID_SEGMENTS_YAW;
      result.push(segments.slice(start, start + GRID_SEGMENTS_YAW));
    }
    return result;
  }, [segments]);

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(12,14,26,0.75)' }, style]}>
      <ThemedText type="small" style={styles.label}>
        Coverage
      </ThemedText>

      <View style={styles.grid}>
        {rows.map((row, pIndex) => (
          <View key={pIndex} style={styles.row}>
            {row.map((segment) => (
              <View
                key={segment.index}
                style={[
                  styles.cell,
                  {
                    backgroundColor: segment.covered
                      ? theme.success
                      : 'rgba(255,255,255,0.15)',
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, coveragePercent)}%`,
                backgroundColor:
                  coveragePercent >= 85
                    ? theme.success
                    : coveragePercent >= 50
                      ? theme.warning
                      : theme.danger,
              },
            ]}
          />
        </View>
        <ThemedText type="small" style={styles.percentText}>
          {Math.round(coveragePercent)}%
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    padding: Spacing.two,
    borderRadius: Radius.md,
    gap: Spacing.one,
    minWidth: 120,
  },
  label: {
    color: '#fff',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  grid: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  cell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: 2,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
});
