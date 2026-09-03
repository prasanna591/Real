import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  listScanSessions,
  deleteScanSession,
  loadScanSession,
  markScanSynced,
  type ScanSession,
} from '@/lib/scan-storage';
import { uploadRoomScan } from '@/services/room-scans';

export default function ScansScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    listScanSessions()
      .then(setSessions)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    listScanSessions()
      .then((s) => {
        if (!cancelled) setSessions(s);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = useCallback(
    async (scanId: string) => {
      await deleteScanSession(scanId);
      refresh();
    },
    [refresh],
  );

  const handleSync = useCallback(
    async (scanId: string) => {
      setSyncError(null);
      setSyncingId(scanId);
      try {
        const full = await loadScanSession(scanId);
        if (!full) throw new Error('Scan not found');
        await uploadRoomScan(full);
        await markScanSynced(scanId, true);
        refresh();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sync failed');
      } finally {
        setSyncingId(null);
      }
    },
    [refresh],
  );

  const renderItem = useCallback(
    ({ item }: { item: ScanSession }) => {
      const isSyncing = syncingId === item.id;
      return (
        <Pressable
          onPress={() =>
            router.push(`/project/${item.projectId}/room-walkthrough?scanId=${item.id}`)
          }
          onLongPress={() => handleDelete(item.id)}
          style={({ pressed }) => [
            styles.card,
            {
              borderColor: theme.border,
              backgroundColor: theme.backgroundElement,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>

          <View style={styles.cardStats}>
            <View style={styles.stat}>
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                {item.keyframeCount}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                keyframes
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                {Math.round(item.coveragePercent)}%
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                coverage
              </ThemedText>
            </View>
          </View>

          <View style={styles.cardFooter}>
            {item.synced ? (
              <ThemedText type="small" style={{ color: theme.success }}>
                ✓ Synced to builder
              </ThemedText>
            ) : (
              <Pressable
                disabled={isSyncing}
                onPress={() => handleSync(item.id)}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {isSyncing ? 'Syncing…' : 'Sync to builder'}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </Pressable>
      );
    },
    [theme, router, handleDelete, handleSync, syncingId],
  );

  return (
    <ThemedView type="background" style={styles.root}>
      {isLoading ? (
        <ThemedText type="small" style={styles.emptyText}>
          Loading scans…
        </ThemedText>
      ) : (
        <>
          {syncError ? (
            <ThemedText type="small" style={[styles.errorText, { color: theme.danger }]}>
              {syncError}
            </ThemedText>
          ) : null}
          {sessions.length === 0 ? (
            <View style={styles.empty}>
              <ThemedText type="subtitle">No scans yet</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.one }}>
                Complete a room scan to see it here.
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={sessions}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
            />
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    padding: Spacing.three,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  cardStats: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cardFooter: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  errorText: {
    textAlign: 'center',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
});
