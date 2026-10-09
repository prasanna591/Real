import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  listScanSessions,
  deleteScanSession,
  loadScanSession,
  markScanSynced,
  type ScanSession,
} from '@/lib/scan-storage';
import { listProjects } from '@/services/api';
import { uploadRoomScan } from '@/services/room-scans';
import type { Project } from '@/types/api';

export default function ScansScreen() {
  const theme = useTheme();
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncFailedId, setSyncFailedId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const refresh = useCallback(() => {
    setIsLoading(true);
    listScanSessions()
      .then(setSessions)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard async data-fetch pattern
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    async (scanId: string) => {
      setSyncError(null);
      setSyncFailedId(null);
      await deleteScanSession(scanId);
      refresh();
    },
    [refresh],
  );

  const handleSync = useCallback(
    async (scanId: string) => {
      setSyncError(null);
      setSyncFailedId(null);
      setSyncingId(scanId);
      try {
        const full = await loadScanSession(scanId);
        if (!full) throw new Error('Scan not found');
        await uploadRoomScan(full);
        await markScanSynced(scanId, true);
        refresh();
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sync failed');
        setSyncFailedId(scanId);
      } finally {
        setSyncingId(null);
      }
    },
    [refresh],
  );

  const openProjectPicker = useCallback(async () => {
    setPickerVisible(true);
    setPickerLoading(true);
    setProjects([]);
    try {
      const fresh = await listProjects();
      setProjects(fresh);
    } catch {
      setProjects([]);
    } finally {
      setPickerLoading(false);
    }
  }, []);

  const startScanFor = useCallback(
    (project: Project) => {
      setPickerVisible(false);
      router.push(
        `/project/${project.id}/room-scan?name=${encodeURIComponent(project.name)}`,
      );
    },
    [router],
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
            ) : syncFailedId === item.id ? (
              <Pressable
                disabled={isSyncing}
                onPress={() => handleSync(item.id)}
                hitSlop={8}
                style={({ pressed }) => [styles.retry, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="refresh" size={14} color={theme.danger} />
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  Sync failed · Retry
                </ThemedText>
              </Pressable>
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
    [theme, router, handleDelete, handleSync, syncingId, syncFailedId],
  );

  return (
    <ThemedView type="background" style={styles.root}>
      {/* Header + new scan CTA */}
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {canGoBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={10}
                onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </Pressable>
            ) : null}
            <ThemedText type="title" style={styles.headerTitle}>
              Scans
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={openProjectPicker}
            style={[styles.scanButton, { backgroundColor: theme.primary }]}>
            <Ionicons name="camera-outline" size={18} color="#FFF" />
            <ThemedText type="smallBold" style={styles.scanButtonText}>
              New scan
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>

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
              <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="scan-outline" size={40} color={theme.primary} />
              </View>
              <ThemedText type="subtitle">No scans yet</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center' }}>
                Capture a room with your camera and motion sensors to create an immersive walkthrough payload.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={openProjectPicker}
                style={[styles.emptyScanButton, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera-outline" size={18} color="#FFF" />
                <ThemedText type="smallBold" style={styles.scanButtonText}>
                  Start new scan
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={sessions}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              ListHeaderComponent={
                <Pressable
                  accessibilityRole="button"
                  onPress={openProjectPicker}
                  style={[
                    styles.listScanButton,
                    { borderColor: theme.primary, backgroundColor: theme.primarySoft },
                  ]}>
                  <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    New scan
                  </ThemedText>
                </Pressable>
              }
              ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
            />
          )}
        </>
      )}

      {/* Project picker for starting a scan */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)} />
          <SafeAreaView style={[styles.modalSheet, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Scan a property</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPickerVisible(false)}
                hitSlop={10}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, paddingHorizontal: Spacing.four }}>
              Choose which property you&apos;d like to capture. You&apos;ll point your camera around the room.
            </ThemedText>

            {pickerLoading ? (
              <ActivityIndicator style={styles.modalLoading} color={theme.primary} />
            ) : projects.length === 0 ? (
              <ThemedText type="small" style={styles.modalEmpty} themeColor="textSecondary">
                No properties available to scan yet.
              </ThemedText>
            ) : (
              <FlatList
                data={projects}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.projectList}
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => startScanFor(item)}
                    style={({ pressed }) => [
                      styles.projectRow,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.backgroundElement,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}>
                    <View>
                      <ThemedText type="smallBold">{item.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {[item.locality, item.city].filter(Boolean).join(', ')}
                      </ThemedText>
                    </View>
                    <Ionicons name="scan-outline" size={20} color={theme.primary} />
                  </Pressable>
                )}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
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
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
  },
  scanButtonText: {
    color: '#FFF',
  },
  listScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.three,
  },
  emptyScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    marginTop: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  modalLoading: {
    marginVertical: Spacing.five,
  },
  modalEmpty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
  projectList: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
});
