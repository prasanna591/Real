import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

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
import { PROFESSIONAL_CATEGORIES, PROFESSIONAL_CATEGORY_LABEL } from '@/lib/eyd/seed';
import { addToProjectTeam, logActivity, removeFromProjectTeam, useEyD } from '@/lib/eyd/store';
import type { Professional, ProfessionalCategory } from '@/lib/eyd/types';

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="star" size={12} color="#F5A623" />
      <EydText variant="small" tone="text">
        {rating.toFixed(1)}
      </EydText>
    </View>
  );
}

export default function NetworkScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ProfessionalCategory | 'all'>('all');

  const team = new Set(state.projectTeam);

  const filtered = state.professionals.filter((p) => {
    if (category !== 'all' && p.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.profession.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.skills.some((s) => s.toLowerCase().includes(q)) ||
      p.description.toLowerCase().includes(q)
    );
  });

  const header = (
    <EydHeaderBar
      title="Professionals"
      onBack={pathname === '/build/network' ? () => router.back() : undefined}
      right={<EydSyncPill />}
    />
  );

  const toggleTeam = (p: Professional) => {
    const added = team.has(p.id);
    update((d) => {
      if (added) removeFromProjectTeam(d, p.id);
      else addToProjectTeam(d, p.id);
      logActivity(d, `${added ? 'Removed from team' : 'Added to project team'} — ${p.name} (${PROFESSIONAL_CATEGORY_LABEL[p.category]})`, 'team');
    });
  };

  const contact = (p: Professional) => {
    Alert.alert(
      `Contact ${p.name}`,
      `${p.profession} · ${p.location}\n\nSample profile — the live marketplace will let you request contact details over chat. For now, you can save this professional to your project team.`,
      [{ text: 'Done', style: 'cancel' }],
    );
  };

  return (
    <EydScreen header={header}>
      <EydContainer style={styles.stack}>
        <EydCard tone="blueSoft">
          <EydText variant="small" tone="secondary">
            Sample profiles only — showcase data generated for this demo. None are real, verified or shortlisted professionals.
          </EydText>
        </EydCard>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, skill, location…"
          placeholderTextColor={t.textMuted}
          style={[styles.search, { backgroundColor: t.surfaceAlt, color: t.text }]}
        />

        <View style={styles.chipWrap}>
          <EydChip label="All" tone="blue" selected={category === 'all'} onPress={() => setCategory('all')} />
          {PROFESSIONAL_CATEGORIES.map((c) => (
            <EydChip
              key={c}
              label={PROFESSIONAL_CATEGORY_LABEL[c]}
              tone="blue"
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>

        <EydSectionTitle title={`${filtered.length} professional${filtered.length === 1 ? '' : 's'}`} caption="Sorted by relevance." />

        {filtered.length === 0 ? (
          <EydEmpty icon="business-outline" title="No professional found" body="Try another category or search term." />
        ) : (
          filtered.map((p) => {
            const added = team.has(p.id);
            return (
              <EydCard key={p.id} style={styles.card}>
                <Pressable onPress={() => router.push(`/build/network/${p.id}`)} accessibilityRole="button">
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitle}>
                      <EydText variant="subheading" numberOfLines={1}>
                        {p.name}
                      </EydText>
                      <EydText variant="small" tone="secondary">
                        {p.profession} · {p.location}
                      </EydText>
                    </View>
                    <View style={styles.badgeCol}>
                      {p.verified ? (
                        <EydChip label="Verified" tone="success" />
                      ) : (
                        <EydChip label="Sample" tone="neutral" />
                      )}
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <EydChip label={PROFESSIONAL_CATEGORY_LABEL[p.category]} tone="blue" />
                    <Stars rating={p.rating} />
                    <EydText variant="small" tone="muted">
                      {p.projectsCompleted} projects
                    </EydText>
                  </View>

                  <EydText variant="small" tone="secondary" numberOfLines={2} style={styles.desc}>
                    {p.description}
                  </EydText>
                </Pressable>

                <View style={styles.actions}>
                  <EydButton label="View profile" variant="secondary" onPress={() => router.push(`/build/network/${p.id}`)} style={styles.actionBtn} />
                  <EydButton label="Contact" variant="secondary" icon="chatbubble-ellipses-outline" onPress={() => contact(p)} />
                  <EydButton
                    label={added ? 'Added' : 'Add to project'}
                    variant={added ? 'secondary' : 'primary'}
                    icon={added ? 'checkmark' : 'add'}
                    onPress={() => toggleTeam(p)}
                    style={styles.actionBtn}
                  />
                </View>
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
  card: { gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, gap: 2 },
  badgeCol: { alignItems: 'flex-end' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  desc: { lineHeight: 19 },
  actions: { flexDirection: 'row', gap: EyDSpacing.md, flexWrap: 'wrap' },
  actionBtn: { flex: 1 },
});