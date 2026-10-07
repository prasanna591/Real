import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { Entrance } from '@/components/motion';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { MaxContentWidth, Radius, Spacing, StatusColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBuilderAuth } from '@/lib/builder-auth';
import { listFloors, listMedia, listTowers, listUnits, getProject } from '@/services/api';
import {
  addMediaAsset,
  createFloor,
  createTower,
  createUnit,
  getAnalyticsSummary,
  getBuilderPipeline,
  updateProjectStatus,
  updateUnitStatus,
} from '@/services/builder';
import type {
  AnalyticsSummary,
  BuilderPipeline,
  Floor,
  MediaAsset,
  Tower,
  Unit,
} from '@/types/api';

const STATUS_FLOW = ['available', 'booked', 'sold'] as const;
const PROJECT_STATUSES = ['draft', 'active', 'sold_out'] as const;
const MEDIA_TYPES = ['photo', 'floor_plan', 'model_3d', 'capture_360', 'ar_pack', 'interior_set'];

export default function BuilderProjectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const projectId = Number(params.id);
  const { session, isLoading: authLoading } = useBuilderAuth();

  const [summary, setSummary] = useState<{ status: string; unit_count: number; available_units: number } | null>(null);
  const [projectName, setProjectName] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [pipeline, setPipeline] = useState<BuilderPipeline | null>(null);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [floorsByTower, setFloorsByTower] = useState<Record<number, Floor[]>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) router.replace('/builder/login');
  }, [authLoading, session, router]);

  const loadAll = useCallback(async () => {
    if (!session || !projectId) return;
    try {
      const [projectData, analyticsData, pipelineData, towerList, unitList, mediaList] =
        await Promise.all([
          getProject(projectId),
          getAnalyticsSummary(projectId),
          getBuilderPipeline(projectId),
          listTowers(projectId),
          listUnits(projectId),
          listMedia(projectId),
        ]);
      setSummary({
        status: projectData.status,
        unit_count: unitList.length,
        available_units: unitList.filter((u) => u.status === 'available').length,
      });
      setProjectName(projectData.name);
      setAnalytics(analyticsData);
      setPipeline(pipelineData);
      setTowers(towerList);
      setUnits(unitList);
      setMedia(mediaList);
      const floorResults = await Promise.all(
        towerList.map((t) => listFloors(projectId, t.id))
      );
      const floorEntries = towerList.map((t, i) => [t.id, floorResults[i]] as const);
      setFloorsByTower(Object.fromEntries(floorEntries));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load project.');
    } finally {
      setIsLoading(false);
    }
  }, [session, projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard async data-fetch pattern
    loadAll();
  }, [loadAll]);

  if (authLoading || !session || isLoading) {
    return (
      <ThemedView type="background" style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView type="background" style={styles.root}>
      <Stack.Screen options={{ title: projectName || 'Manage project' }} />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.content, { maxWidth: MaxContentWidth }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {error && (
              <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>
            )}
            {statusError && (
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.danger }]}>
                <ThemedText style={{ color: theme.danger }}>{statusError}</ThemedText>
                <Pressable onPress={() => setStatusError(null)}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>Dismiss</ThemedText>
                </Pressable>
              </ThemedView>
            )}

            {analytics && (
              <Entrance>
                <SectionCard title="Lead analytics">
                  <View style={styles.metricGrid}>
                    <Metric label="Views" value={analytics.property_views} />
                    <Metric label="Saves" value={analytics.saves} />
                    <Metric label="Enquiries" value={analytics.enquiries} />
                    <Metric label="Visits" value={analytics.site_visits} />
                    <Metric label="Explorers" value={analytics.serious_explorers} />
                  </View>
                </SectionCard>
              </Entrance>
            )}

            {summary && (
              <Entrance index={1}>
                <SectionCard title={`Status · ${summary.available_units}/${summary.unit_count} units available`}>
                  <View style={styles.chipRow}>
                    {PROJECT_STATUSES.map((status) => {
                      const selected = summary.status === status;
                      return (
                        <Pressable
                          key={status}
                          onPress={() => {
                            setStatusError(null);
                            updateProjectStatus(projectId, status)
                              .then(loadAll)
                              .catch((err) => setStatusError(err instanceof Error ? err.message : 'Failed to update status'));
                          }}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selected ? theme.primary : theme.backgroundElement,
                              borderColor: selected ? theme.primary : theme.border,
                            },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{ color: selected ? '#FFFFFF' : theme.text }}>
                            {status.replace('_', ' ').toUpperCase()}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </SectionCard>
              </Entrance>
            )}

            <Entrance index={2}>
              <InventoryBuilder projectId={projectId} towers={towers} floorsByTower={floorsByTower} onDone={loadAll} />
            </Entrance>

            {units.length > 0 && (
              <Entrance index={3}>
                <SectionCard title={`Inventory · ${units.length} units`}>
                  <View style={styles.unitGrid}>
                    {units.slice(0, 24).map((unit) => {
                      const color = StatusColors[unit.status as keyof typeof StatusColors] ?? theme.textSecondary;
                      return (
                        <Pressable
                          key={unit.id}
                          onPress={() => {
                            const next =
                              STATUS_FLOW[(STATUS_FLOW.indexOf(unit.status as typeof STATUS_FLOW[number]) + 1) % STATUS_FLOW.length];
                            setStatusError(null);
                            updateUnitStatus(projectId, unit.id, next)
                              .then(loadAll)
                              .catch((err) => setStatusError(err instanceof Error ? err.message : 'Failed to update unit'));
                          }}
                          style={[styles.unitPill, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
                          <View style={[styles.statusDot, { backgroundColor: color }]} />
                          <ThemedText type="smallBold">{unit.unit_number}</ThemedText>
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>
                            {unit.bhk}BHK · {(Number(unit.price) / 100000).toFixed(0)}L
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Tap a unit to cycle availability → booked → sold.
                  </ThemedText>
                </SectionCard>
              </Entrance>
            )}

            {media.length > 0 && (
              <Entrance index={4}>
                <SectionCard title={`Media · ${media.length} assets`}>
                  {media.map((asset) => (
                    <View key={asset.id} style={styles.mediaRow}>
                      <ThemedText type="smallBold" style={{ flex: 1 }} numberOfLines={1}>
                        {asset.title || asset.url}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.primary }}>
                        {asset.media_type}
                      </ThemedText>
                    </View>
                  ))}
                </SectionCard>
              </Entrance>
            )}

            <Entrance index={5}>
              <MediaForm projectId={projectId} onDone={loadAll} />
            </Entrance>

            {pipeline && (
              <Entrance index={6}>
                <SectionCard title="Sales pipeline">
                  <ThemedText type="smallBold">
                    Enquiries ({pipeline.enquiries.length})
                  </ThemedText>
                  {pipeline.enquiries.length === 0 && (
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      No enquiries yet.
                    </ThemedText>
                  )}
                  {pipeline.enquiries.map((enquiry) => (
                    <View key={enquiry.id} style={styles.pipelineRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="smallBold">
                          {enquiry.name} · {enquiry.phone}
                        </ThemedText>
                        {!!enquiry.message && (
                          <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={2}>
                            {enquiry.message}
                          </ThemedText>
                        )}
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: `${theme.accent}18` }]}>
                        <ThemedText type="smallBold" style={{ color: theme.accent }}>
                          {enquiry.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                  <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>
                    Site visits ({pipeline.site_visits.length})
                  </ThemedText>
                  {pipeline.site_visits.length === 0 && (
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Nothing scheduled yet.
                    </ThemedText>
                  )}
                  {pipeline.site_visits.map((visit) => (
                    <View key={visit.id} style={styles.pipelineRow}>
                      <ThemedText type="smallBold" style={{ flex: 1 }}>
                        {visit.name} · {visit.phone}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.success }}>
                        {new Date(visit.scheduled_at).toLocaleString()}
                      </ThemedText>
                    </View>
                  ))}
                </SectionCard>
              </Entrance>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="subtitle" style={{ fontSize: 16 }}>
        {title}
      </ThemedText>
      {children}
    </ThemedView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.metric, { borderColor: theme.border }]}>
      <ThemedText type="title" themeColor="primary">
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
  );
}

function InventoryBuilder({
  projectId,
  towers,
  floorsByTower,
  onDone,
}: {
  projectId: number;
  towers: Tower[];
  floorsByTower: Record<number, Floor[]>;
  onDone: () => Promise<void> | void;
}) {
  const theme = useTheme();
  const [towerName, setTowerName] = useState('');
  const [selectedTowerId, setSelectedTowerId] = useState<number | null>(towers[0]?.id ?? null);
  const [floorNumber, setFloorNumber] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [bhk, setBhk] = useState('3');
  const [areaSqft, setAreaSqft] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const floors = selectedTowerId ? floorsByTower[selectedTowerId] ?? [] : [];
  const selectedFloorId = floors[0]?.id ?? null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Build inventory">
      {towers.length > 0 && (
        <View style={styles.chipRow}>
          {towers.map((tower) => {
            const selected = tower.id === selectedTowerId;
            return (
              <Pressable
                key={tower.id}
                onPress={() => setSelectedTowerId(tower.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: selected ? theme.primary : theme.text }}>
                  {tower.name} · {(floorsByTower[tower.id] ?? []).length}F
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <TextField label="New tower name" placeholder="Tower B" value={towerName} onChangeText={setTowerName} />
        </View>
        <SecondaryButton
          label="+ Tower"
          compact
          disabled={busy || !towerName.trim()}
          onPress={() => run(() => createTower(projectId, towerName.trim())).then(() => setTowerName(''))}
        />
      </View>

      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}>
          <TextField
            label="New floor number"
            placeholder={String(floors.length)}
            keyboardType="numeric"
            value={floorNumber}
            onChangeText={setFloorNumber}
          />
        </View>
        <SecondaryButton
          label="+ Floor"
          compact
          disabled={busy || !selectedTowerId}
          onPress={() =>
            run(() =>
              createFloor(projectId, selectedTowerId!, Number(floorNumber || floors.length))
            ).then(() => setFloorNumber(''))
          }
        />
      </View>

      <TextField label="Unit number" placeholder="B201" value={unitNumber} onChangeText={setUnitNumber} />
      <View style={styles.row3}>
        <View style={{ flex: 1 }}>
          <TextField label="BHK" keyboardType="number-pad" value={bhk} onChangeText={setBhk} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Area sqft" keyboardType="numeric" placeholder="1450" value={areaSqft} onChangeText={setAreaSqft} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Price ₹" keyboardType="numeric" placeholder="9800000" value={price} onChangeText={setPrice} />
        </View>
      </View>
      <PrimaryButton
        label={selectedFloorId ? `Add unit to floor ${floors[0].number}` : 'Select a tower with a floor first'}
        disabled={busy || !selectedFloorId}
        onPress={() => {
          const bhkVal = Number(bhk);
          const areaVal = Number(areaSqft || 0);
          const priceVal = Number(price || 0);
          if (!Number.isInteger(bhkVal) || bhkVal < 1 || bhkVal > 10) {
            setError('BHK must be a whole number between 1 and 10');
            return;
          }
          if (areaVal <= 0) {
            setError('Area must be a positive number');
            return;
          }
          if (priceVal <= 0) {
            setError('Price must be a positive number');
            return;
          }
          run(() =>
            createUnit(projectId, selectedTowerId!, selectedFloorId!, {
              unit_number: unitNumber.trim(),
              bhk: bhkVal,
              area_sqft: areaVal,
              price: priceVal,
            })
          ).then(() => {
            setUnitNumber('');
            setPrice('');
          });
        }}
      />
      {error && <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>}
    </SectionCard>
  );
}

function MediaForm({ projectId, onDone }: { projectId: number; onDone: () => void }) {
  const theme = useTheme();
  const [mediaType, setMediaType] = useState('photo');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SectionCard title="Register media asset">
      <View style={styles.chipRow}>
        {MEDIA_TYPES.map((type) => {
          const selected = mediaType === type;
          return (
            <Pressable
              key={type}
              onPress={() => setMediaType(type)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.primary : theme.backgroundElement,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                {type.replace('_', ' ')}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <TextField label="Title" placeholder="Facade render" value={title} onChangeText={setTitle} />
      <TextField
        label="URL"
        placeholder="https://…"
        autoCapitalize="none"
        value={url}
        onChangeText={setUrl}
      />
      {error && <ThemedText style={{ color: theme.danger }}>{error}</ThemedText>}
      <PrimaryButton
        label="Add media"
        loading={busy}
        onPress={() => {
          setBusy(true);
          setError(null);
          addMediaAsset(projectId, { media_type: mediaType, title: title.trim(), url: url.trim() })
            .then(() => {
              setTitle('');
              setUrl('');
              onDone();
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed.'))
            .finally(() => setBusy(false));
        }}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    paddingBottom: Spacing.six,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  metric: {
    flexGrow: 1,
    minWidth: 96,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    gap: Spacing.half,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 4,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  row3: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  unitPill: {
    borderWidth: 1,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    gap: 2,
    minWidth: 108,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pipelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.25)',
    paddingBottom: Spacing.two,
  },
  statusPill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half + 2,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
});
