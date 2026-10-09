import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import {
  EydButton,
  EydCard,
  EydChip,
  EydEmpty,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatINR } from '@/lib/eyd/format';
import { MATERIAL_AVAILABILITY_META } from '@/lib/eyd/meta';
import { listFilteredCatalog, listProjectMaterials } from '@/lib/eyd/materials-repo';
import { MATERIAL_CATEGORIES, MATERIAL_CATEGORY_LABEL } from '@/lib/eyd/seed';
import { addProjectMaterial, logActivity, removeProjectMaterial, useEyD } from '@/lib/eyd/store';
import type { Material, MaterialCategory } from '@/lib/eyd/types';

export default function MaterialsScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const [category, setCategory] = useState<MaterialCategory | 'all'>('all');
  const [query, setQuery] = useState('');

  const projectMaterials = listProjectMaterials(state);
  const catalog = listFilteredCatalog(state, { category, query });
  const inProject = new Set(state.projectMaterials);

  const toggle = (m: Material) => {
    const added = inProject.has(m.id);
    update((d) => {
      if (added) removeProjectMaterial(d, m.id);
      else addProjectMaterial(d, m.id);
      logActivity(d, `${added ? 'Removed from project list' : 'Added to project list'} — ${m.product}`, 'material');
    });
  };

  const header = <EydHeaderBar title="Materials" onBack={() => router.back()} right={<EydSyncPill />} />;

  return (
    <EydScreen header={header}>
      <EydContainer style={styles.stack}>
        <EydCard tone="blueSoft">
          <EydText variant="small" tone="secondary">
            Sample catalogue — indicative prices for this demo; actual rates vary by city, brand and order size.
          </EydText>
        </EydCard>

        {projectMaterials.length > 0 ? (
          <>
            <EydSectionTitle title="Your project list" caption={`${projectMaterials.length} item${projectMaterials.length === 1 ? '' : 's'} added`} />
            <EydCard padded={false}>
              {projectMaterials.map((m, i) => (
                <View
                  key={m.id}
                  style={[
                    styles.projectRow,
                    { borderBottomColor: t.border, borderBottomWidth: i === projectMaterials.length - 1 ? 0 : StyleSheet.hairlineWidth },
                  ]}>
                  <View style={styles.projectText}>
                    <EydText variant="small" numberOfLines={1}>
                      {m.product}
                    </EydText>
                    <EydText variant="small" tone="muted">
                      {formatINR(m.price)} / {m.unit}
                    </EydText>
                  </View>
                  <Pressable onPress={() => toggle(m)} hitSlop={10} accessibilityLabel={`Remove ${m.product}`}>
                    <Ionicons name="remove-circle" size={22} color={t.danger} />
                  </Pressable>
                </View>
              ))}
            </EydCard>
          </>
        ) : null}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search product, supplier…"
          placeholderTextColor={t.textMuted}
          style={[styles.search, { backgroundColor: t.surfaceAlt, color: t.text }]}
        />

        <View style={styles.chipWrap}>
          <EydChip label="All" tone="blue" selected={category === 'all'} onPress={() => setCategory('all')} />
          {MATERIAL_CATEGORIES.map((c) => (
            <EydChip
              key={c}
              label={MATERIAL_CATEGORY_LABEL[c]}
              tone="blue"
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>

        <EydSectionTitle title="Catalogue" caption={`${catalog.length} of ${state.materials.length} shown`} />

        {catalog.length === 0 ? (
          <EydEmpty icon="cube-outline" title="No materials found" body="Try another category or search term." />
        ) : (
          catalog.map((m) => {
            const added = inProject.has(m.id);
            const avail = MATERIAL_AVAILABILITY_META[m.availability];
            return (
              <EydCard key={m.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTitle}>
                    <EydText variant="subheading" numberOfLines={2}>
                      {m.product}
                    </EydText>
                    <EydText variant="small" tone="muted">
                      {m.supplier}
                    </EydText>
                  </View>
                  <View style={styles.priceCol}>
                    <EydText variant="subheading" style={styles.price}>
                      {formatINR(m.price)}
                    </EydText>
                    <EydText variant="small" tone="muted">
                      / {m.unit}
                    </EydText>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <EydChip label={MATERIAL_CATEGORY_LABEL[m.category]} tone="blue" />
                  <EydChip label={avail.label} tone={avail.tone} />
                </View>

                <EydText variant="small" tone="secondary" numberOfLines={2}>
                  {m.description}
                </EydText>

                <EydButton
                  label={added ? 'In your list ✓' : 'Add to project'}
                  variant={added ? 'secondary' : 'primary'}
                  icon={added ? 'checkmark' : 'add'}
                  onPress={() => toggle(m)}
                />
              </EydCard>
            );
          })
        )}
      </EydContainer>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  projectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  projectText: { flex: 1, gap: 2 },
  search: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, gap: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: 20 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});