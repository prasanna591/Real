import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';
import { listFloors, listTowers, listUnits } from '@/services/api';
import type { Floor, Tower, Unit, UnitStatus } from '@/types/api';

type StatusFilter = 'all' | 'available';

interface FloorUnits {
  tower: Tower;
  floors: { floor: Floor; units: Unit[] }[];
}

const STATUS_COLORS: Record<UnitStatus, string> = {
  available: '#2e9e5b',
  booked: '#e8a13c',
  sold: '#c94f4f',
};

export default function UnitsScreen() {
  const params = useLocalSearchParams<{ id: string; projectName?: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const theme = useTheme();

  const [groups, setGroups] = useState<FloorUnits[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [towers, units] = await Promise.all([listTowers(projectId), listUnits(projectId)]);
      const grouped: FloorUnits[] = [];
      for (const tower of towers.sort((a, b) => a.name.localeCompare(b.name))) {
        const floors = await listFloors(projectId, tower.id);
        const floorGroups = floors
          .sort((a, b) => a.number - b.number)
          .map((floor) => ({
            floor,
            units: units.filter((unit) => unit.floor_id === floor.id),
          }))
          .filter((group) => group.units.length > 0);
        if (floorGroups.length > 0) grouped.push({ tower, floors: floorGroups });
      }
      setGroups(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load units');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTowers(projectId), listUnits(projectId)])
      .then(async ([towers, units]) => {
        const grouped: FloorUnits[] = [];
        for (const tower of [...towers].sort((a, b) => a.name.localeCompare(b.name))) {
          const floors = await listFloors(projectId, tower.id);
          const floorGroups = floors
            .sort((a, b) => a.number - b.number)
            .map((floor) => ({
              floor,
              units: units.filter((unit) => unit.floor_id === floor.id),
            }))
            .filter((group) => group.units.length > 0);
          if (floorGroups.length > 0 && !cancelled) grouped.push({ tower, floors: floorGroups });
        }
        if (!cancelled) setGroups(grouped);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load units');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const visibleCount = useMemo(() => {
    if (filter === 'all') return null;
    return groups.reduce(
      (sum, group) =>
        sum +
        group.floors.reduce(
          (floorSum, floorGroup) =>
            floorSum + floorGroup.units.filter((unit) => unit.status === filter).length,
          0,
        ),
      0,
    );
  }, [groups, filter]);

  const openWith = (screen: '/enquiry' | '/book-visit') => {
    if (!selectedUnit) return;
    router.push({
      pathname: screen,
      params: {
        projectId: String(projectId),
        projectName: params.projectName ?? '',
        unitId: String(selectedUnit.id),
        unitNumber: selectedUnit.unit_number,
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}>
          <View style={styles.topRow}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
              <ThemedText type="smallBold">← Back</ThemedText>
            </Pressable>
          </View>

          <ThemedView type="background" style={styles.filterBar}>
            {(['all', 'available'] as StatusFilter[]).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => setFilter(option)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      filter === option ? theme.text : theme.backgroundElement,
                  },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: filter === option ? theme.background : theme.text }}>
                  {option === 'all' ? 'All units' : `Available${visibleCount != null ? ` (${visibleCount})` : ''}`}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>

          <ThemedText type="subtitle">{params.projectName ?? 'Units'}</ThemedText>

          {isLoading && (
            <ThemedView style={styles.center}>
              <ActivityIndicator />
            </ThemedView>
          )}
          {error && (
            <ThemedView type="backgroundElement" style={styles.errorBox}>
              <ThemedText type="small">{error}</ThemedText>
              <ThemedText type="linkPrimary" onPress={load}>
                Tap to retry
              </ThemedText>
            </ThemedView>
          )}

          {groups.map((group) => (
            <View key={group.tower.id} style={styles.towerSection}>
              <ThemedText type="smallBold">Tower {group.tower.name}</ThemedText>
              {group.floors.map(({ floor, units }) => (
                <View key={floor.id} style={styles.floorBlock}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {floor.number === 0 ? 'Ground floor' : `Floor ${floor.number}`}
                  </ThemedText>
                  <View style={styles.unitGrid}>
                    {units
                      .filter((unit) => filter === 'all' || unit.status === filter)
                      .map((unit) => {
                        const isSelected = selectedUnit?.id === unit.id;
                        return (
                          <Pressable
                            key={unit.id}
                            accessibilityRole="button"
                            disabled={unit.status !== 'available'}
                            onPress={() =>
                              setSelectedUnit((prev) => (prev?.id === unit.id ? null : unit))
                            }
                            style={[
                              styles.unitCard,
                              { backgroundColor: theme.backgroundElement },
                              isSelected && { borderWidth: 2, borderColor: theme.text },
                            ]}>
                            <View style={styles.unitHead}>
                              <ThemedText type="smallBold">{unit.unit_number}</ThemedText>
                              <View
                                style={[
                                  styles.statusDot,
                                  { backgroundColor: STATUS_COLORS[unit.status] },
                                ]}
                              />
                            </View>
                            <ThemedText type="small" themeColor="textSecondary">
                              {unit.bhk} BHK · {Math.round(unit.area_sqft)} sq.ft
                            </ThemedText>
                            <ThemedText type="smallBold">
                              {formatPrice(unit.price)}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        {selectedUnit && (
          <ThemedView type="backgroundElement" style={[styles.actionBar, styles.shadow]}>
            <View style={styles.actionInfo}>
              <ThemedText type="smallBold">
                Unit {selectedUnit.unit_number}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedUnit.bhk} BHK · {formatPrice(selectedUnit.price)}
              </ThemedText>
            </View>
            <View style={styles.actionButtons}>
              <SecondaryButton
                label="3D"
                compact
                onPress={() =>
                  router.push({
                    pathname: '/project/[id]/tour',
                    params: { id: String(projectId), unit: selectedUnit.unit_number },
                  })
                }
              />
              <View style={styles.halfButton}>
                <PrimaryButton label="Enquire" onPress={() => openWith('/enquiry')} />
              </View>
              <View style={styles.halfButton}>
                <PrimaryButton label="Book visit" onPress={() => openWith('/book-visit')} />
              </View>
            </View>
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  topRow: {
    paddingTop: Spacing.two,
  },
  filterBar: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 4,
  },
  center: {
    padding: Spacing.six,
    alignItems: 'center',
  },
  errorBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  towerSection: {
    gap: Spacing.three,
  },
  floorBlock: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  unitCard: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half + 1,
  },
  unitHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.three,
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  shadow: {
    boxShadow: '0 4px 16px rgba(17, 21, 39, 0.18)',
  },
  actionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  halfButton: {
    flex: 1,
  },
});
