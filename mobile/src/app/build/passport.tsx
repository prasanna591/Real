import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import { EydSheet } from '@/components/eyd/sheet';
import {
  EydButton,
  EydCard,
  EydChip,
  EydFieldLabel,
  EydRow,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatDayMonthYear, formatINR, formatINRShort, uid } from '@/lib/eyd/format';
import {
  DESIGN_STYLE_LABELS,
  HOME_TYPE_LABELS,
  SCOPE_LABELS,
  STAGE_ORDER,
} from '@/lib/eyd/seed';
import {
  budgetTotals,
  currentStage,
  overallProgress,
  paymentTotals,
  recentProgressUpdates,
  teamMembers,
  timeline,
} from '@/lib/eyd/selectors';
import {
  logActivity,
  removeMaintenance,
  removeWarranty,
  saveMaintenance,
  saveWarranty,
  useEyD,
} from '@/lib/eyd/store';
import { listProjectMaterials } from '@/lib/eyd/materials-repo';
import type { MaintenanceEntry, WarrantyEntry } from '@/lib/eyd/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => new Date().toISOString().slice(0, 10);

type SheetMode = 'maintenance' | 'warranty';

export default function PassportScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const [mode, setMode] = useState<SheetMode | null>(null);
  const [maint, setMaint] = useState<MaintenanceEntry | null>(null);
  const [warranty, setWarranty] = useState<WarrantyEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const header = <EydHeaderBar title="Home Passport" onBack={() => router.back()} right={<EydSyncPill />} />;

  const profile = state.profile;
  const stage = currentStage(state);
  const progress = overallProgress(state);
  const tl = timeline(state);
  const budget = budgetTotals(state);
  const payments = paymentTotals(state);
  const team = teamMembers(state);
  const materials = listProjectMaterials(state);
  const completedStages = state.stages.filter((s) => s.status === 'completed').length;
  const latestUpdate = recentProgressUpdates(state, 1)[0];

  const maintMaintNew = () => {
    setMaint({ id: uid('mt'), title: '', note: '', cost: null, date: todayISO(), createdAt: new Date().toISOString() });
    setWarranty(null);
    setMode('maintenance');
    setError(null);
  };

  const openMaint = (entry: MaintenanceEntry) => {
    setMaint(entry);
    setWarranty(null);
    setMode('maintenance');
    setError(null);
  };

  const openWarrantyNew = () => {
    setWarranty({ id: uid('w'), item: '', provider: '', coverage: '', expiresOn: null, createdAt: new Date().toISOString() });
    setMaint(null);
    setMode('warranty');
    setError(null);
  };

  const openWarranty = (entry: WarrantyEntry) => {
    setWarranty(entry);
    setMaint(null);
    setMode('warranty');
    setError(null);
  };

  const closeSheet = () => {
    setMode(null);
    setMaint(null);
    setWarranty(null);
    setError(null);
  };

  const saveSheet = () => {
    if (mode === 'maintenance' && maint) {
      const title = maint.title.trim();
      if (!title) {
        setError('Add a title for this entry.');
        return;
      }
      const costText = maint.cost !== null ? String(maint.cost) : '';
      const record: MaintenanceEntry = {
        ...maint,
        title,
        note: maint.note.trim(),
        cost: Number(costText.replace(/[^0-9]/g, '')) || null,
        date: DATE_RE.test(maint.date) ? maint.date : todayISO(),
      };
      const exists = state.maintenance.some((m) => m.id === record.id);
      update((d) => {
        saveMaintenance(d, record);
        logActivity(d, `${exists ? 'Maintenance updated' : 'Maintenance logged'} — ${record.title}`, 'maintenance');
      });
      closeSheet();
      return;
    }
    if (mode === 'warranty' && warranty) {
      const item = warranty.item.trim();
      if (!item) {
        setError('Add the item under warranty.');
        return;
      }
      const record: WarrantyEntry = {
        ...warranty,
        item,
        provider: warranty.provider.trim(),
        coverage: warranty.coverage.trim(),
        expiresOn: warranty.expiresOn && DATE_RE.test(warranty.expiresOn) ? warranty.expiresOn : null,
      };
      const exists = state.warranties.some((w) => w.id === record.id);
      update((d) => {
        saveWarranty(d, record);
        logActivity(d, `${exists ? 'Warranty updated' : 'Warranty added'} — ${record.item}`, 'maintenance');
      });
      closeSheet();
    }
  };

  const confirmDelete = () => {
    if (mode === 'maintenance' && maint) {
      Alert.alert('Delete entry?', `${maint.title} will be removed from the passport.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            update((d) => removeMaintenance(d, maint.id));
            closeSheet();
          },
        },
      ]);
    } else if (mode === 'warranty' && warranty) {
      Alert.alert('Delete warranty?', `${warranty.item} will be removed from the passport.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            update((d) => removeWarranty(d, warranty.id));
            closeSheet();
          },
        },
      ]);
    }
  };

  const isNew = mode === 'maintenance' && maint ? !state.maintenance.some((m) => m.id === maint.id)
    : mode === 'warranty' && warranty ? !state.warranties.some((w) => w.id === warranty.id)
    : true;

  const materialNames = materials.map((m) => m.product);
  const shownMaterials = materialNames.slice(0, 6);
  const docLocal = state.documents.filter((d) => d.source === 'local').length;

  return (
    <EydScreen header={header}>
      <EydContainer style={styles.stack}>
        {/* ── Passport head ── */}
        <EydCard style={styles.stack}>
          <EydText variant="eyebrow" tone="blue">
            Home passport
          </EydText>
          <EydText variant="title">{state.project.name}</EydText>
          <View style={styles.headChips}>
            {profile?.homeType ? <EydChip label={HOME_TYPE_LABELS[profile.homeType]} tone="blue" /> : null}
            {profile?.scope ? <EydChip label={SCOPE_LABELS[profile.scope]} tone="neutral" /> : null}
            <EydChip label={`Updated ${formatDayMonthYear(state.updatedAt)}`} tone="neutral" />
          </View>
          <EydText variant="small" tone="muted">
            A long-term record of this home — details, documents, payments, care and warranties.
          </EydText>
        </EydCard>

        {/* ── Home details ── */}
        <EydSectionTitle title="Home details" caption="From your planner profile." />
        <EydCard>
          <EydRow label="Scope" value={profile?.scope ? SCOPE_LABELS[profile.scope] : '—'} />
          <EydRow label="Home type" value={profile?.homeType ? HOME_TYPE_LABELS[profile.homeType] : '—'} />
          <EydRow label="Plot size" value={profile?.plotSizeSqft ? `${profile.plotSizeSqft} sq ft` : '—'} />
          <EydRow label="Floors" value={profile ? String(profile.floors) : '—'} />
          <EydRow label="Bedrooms" value={profile ? String(profile.bedrooms) : '—'} />
          <EydRow label="Bathrooms" value={profile ? String(profile.bathrooms) : '—'} />
          <EydRow label="Parking" value={profile ? String(profile.parking) : '—'} />
          <EydRow label="Style" value={profile?.style ? DESIGN_STYLE_LABELS[profile.style] : '—'} />
          <EydRow label="Planned budget" value={formatINR(state.project.budgetTotal)} tone="blue" />
          <EydRow label="Target handover" value={formatDayMonthYear(state.project.targetEndDate)} />
        </EydCard>

        {/* ── Plans & progress ── */}
        <EydSectionTitle title="Plans & progress" caption="Live from your roadmap and site updates." />
        <EydCard>
          <EydRow label="Current stage" value={stage?.label ?? '—'} tone="blue" />
          <EydRow label="Overall progress" value={`${progress}%`} />
          <EydRow label="Stages complete" value={`${completedStages} of ${STAGE_ORDER.length}`} />
          <EydRow label="Schedule" value={tl.label} tone={tl.tone} />
          <EydRow label="Site updates" value={String(state.progressUpdates.length)} />
          <EydRow label="Latest update" value={latestUpdate ? formatDayMonthYear(latestUpdate.date) : 'None yet'} />
        </EydCard>

        {/* ── Materials ── */}
        <EydSectionTitle title="Materials" caption={`${materials.length} in your project list`} />
        {materials.length === 0 ? (
          <EydCard>
            <EydText variant="small" tone="muted">
              Nothing added yet — pick items in the Materials screen.
            </EydText>
          </EydCard>
        ) : (
          <EydCard style={styles.stack}>
            {shownMaterials.map((name) => (
              <View key={name} style={styles.listRow}>
                <EydText variant="small" tone="blue">
                  ✓
                </EydText>
                <EydText variant="small" numberOfLines={1} style={styles.listText}>
                  {name}
                </EydText>
              </View>
            ))}
            {materialNames.length > shownMaterials.length ? (
              <EydText variant="small" tone="muted">
                +{materialNames.length - shownMaterials.length} more
              </EydText>
            ) : null}
          </EydCard>
        )}

        {/* ── Professionals ── */}
        <EydSectionTitle title="Your team" caption={`${team.length} professional${team.length === 1 ? '' : 's'} added`} />
        <EydCard>
          {team.length === 0 ? (
            <EydText variant="small" tone="muted">
              No professionals added yet — browse the Network screen.
            </EydText>
          ) : (
            team.map((p) => (
              <EydRow key={p.id} label={p.name} value={`${p.profession} · ${p.location}`} tone="blue" />
            ))
          )}
        </EydCard>

        {/* ── Payments ── */}
        <EydSectionTitle title="Payments summary" caption="Recorded cash flow for this project." />
        <EydCard>
          <EydRow label="Recorded payments" value={formatINR(payments.total)} />
          <EydRow label="Paid" value={formatINR(payments.paid)} tone="success" />
          <EydRow label="Pending" value={formatINR(payments.pending)} tone={payments.pending > 0 ? 'warning' : 'text'} />
          <EydRow label="Spent from budget" value={`${Math.round(budget.usedPct)}% of ${formatINRShort(budget.total)}`} />
        </EydCard>

        {/* ── Documents ── */}
        <EydSectionTitle title="Documents" caption={`${state.documents.length} records · ${docLocal} added by you`} />
        <EydCard>
          {state.documents.length === 0 ? (
            <EydText variant="small" tone="muted">
              No documents recorded yet.
            </EydText>
          ) : (
            state.documents.slice(0, 6).map((d) => (
              <View key={d.id} style={styles.listRow}>
                <EydText variant="small" tone="blue">
                  {d.source === 'local' ? '●' : '○'}
                </EydText>
                <EydText variant="small" numberOfLines={1} style={styles.listText}>
                  {d.name}
                </EydText>
              </View>
            ))
          )}
          {state.documents.length > 6 ? (
            <EydText variant="small" tone="muted">
              +{state.documents.length - 6} more in Documents
            </EydText>
          ) : null}
        </EydCard>

        {/* ── Maintenance ── */}
        <EydSectionTitle
          title="Maintenance log"
          caption={`${state.maintenance.length} entries`}
          actionLabel="Add"
          onAction={maintMaintNew}
        />
        {state.maintenance.length === 0 ? (
          <EydCard>
            <EydText variant="small" tone="muted">
              Log cleaning, servicing and repair visits as they happen.
            </EydText>
          </EydCard>
        ) : (
          state.maintenance.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => openMaint(entry)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.entryCard, { backgroundColor: pressed ? t.surfaceAlt : t.surface, borderColor: t.border }]}>
              <View style={styles.entryHead}>
                <EydText variant="subheading" numberOfLines={1} style={styles.entryTitle}>
                  {entry.title}
                </EydText>
                <EydText variant="small" tone="muted">
                  {formatDayMonthYear(entry.date)}
                </EydText>
              </View>
              {entry.note ? (
                <EydText variant="small" tone="secondary" numberOfLines={2}>
                  {entry.note}
                </EydText>
              ) : null}
              {entry.cost !== null ? (
                <EydText variant="small" tone="blue">
                  Cost {formatINR(entry.cost)}
                </EydText>
              ) : null}
            </Pressable>
          ))
        )}

        {/* ── Warranties ── */}
        <EydSectionTitle
          title="Warranties & AMC"
          caption={`${state.warranties.length} active records`}
          actionLabel="Add"
          onAction={openWarrantyNew}
        />
        {state.warranties.length === 0 ? (
          <EydCard>
            <EydText variant="small" tone="muted">
              Add warranty cards so renewals never slip through.
            </EydText>
          </EydCard>
        ) : (
          state.warranties.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => openWarranty(entry)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.entryCard, { backgroundColor: pressed ? t.surfaceAlt : t.surface, borderColor: t.border }]}>
              <View style={styles.entryHead}>
                <EydText variant="subheading" numberOfLines={1} style={styles.entryTitle}>
                  {entry.item}
                </EydText>
                <EydChip
                  label={entry.expiresOn ? `Till ${formatDayMonthYear(entry.expiresOn)}` : 'No expiry'}
                  tone={entry.expiresOn ? 'success' : 'neutral'}
                />
              </View>
              {entry.provider ? (
                <EydText variant="small" tone="secondary">
                  {entry.provider}
                </EydText>
              ) : null}
              {entry.coverage ? (
                <EydText variant="small" tone="muted" numberOfLines={2}>
                  {entry.coverage}
                </EydText>
              ) : null}
            </Pressable>
          ))
        )}

        <EydText variant="small" tone="muted" align="center">
          Passport data stays on this device.
        </EydText>
      </EydContainer>

      {/* ── Maintenance / warranty editor ── */}
      <EydSheet
        visible={mode !== null}
        eyebrow={mode === 'maintenance' ? (isNew ? 'New maintenance entry' : 'Edit entry') : isNew ? 'New warranty' : 'Edit warranty'}
        title={mode === 'maintenance' ? maint?.title || 'Maintenance' : warranty?.item || 'Warranty'}
        onClose={closeSheet}
        footer={
          <>
            <EydButton label="Save" onPress={saveSheet} style={styles.saveBtn} />
            {!isNew ? <EydButton label="Delete" variant="danger" onPress={confirmDelete} style={styles.deleteBtn} /> : null}
          </>
        }>
        {mode === 'maintenance' && maint ? (
          <>
            <View style={styles.field}>
              <EydFieldLabel label="Title" />
              <TextInput
                value={maint.title}
                onChangeText={(text) => {
                  setMaint({ ...maint, title: text });
                  setError(null);
                }}
                placeholder="e.g. Terrace waterproofing check"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Date" />
              <TextInput
                value={maint.date}
                onChangeText={(text) => setMaint({ ...maint, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Cost (₹, optional)" />
              <TextInput
                value={maint.cost === null ? '' : String(maint.cost)}
                onChangeText={(text) => setMaint({ ...maint, cost: text.replace(/[^0-9]/g, '') ? Number(text.replace(/[^0-9]/g, '')) : null })}
                keyboardType="number-pad"
                placeholder="e.g. 4500"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Notes (optional)" />
              <TextInput
                value={maint.note}
                onChangeText={(text) => setMaint({ ...maint, note: text })}
                multiline
                placeholder="Who did it, what was done…"
                placeholderTextColor={t.textMuted}
                style={[styles.input, styles.multiline, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>
          </>
        ) : null}

        {mode === 'warranty' && warranty ? (
          <>
            <View style={styles.field}>
              <EydFieldLabel label="Item" />
              <TextInput
                value={warranty.item}
                onChangeText={(text) => {
                  setWarranty({ ...warranty, item: text });
                  setError(null);
                }}
                placeholder="e.g. Modular kitchen hardware"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Provider" />
              <TextInput
                value={warranty.provider}
                onChangeText={(text) => setWarranty({ ...warranty, provider: text })}
                placeholder="e.g. Casa Interior Studio"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Coverage (optional)" />
              <TextInput
                value={warranty.coverage}
                onChangeText={(text) => setWarranty({ ...warranty, coverage: text })}
                placeholder="e.g. 3-year hardware warranty"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Expires on (optional)" />
              <TextInput
                value={warranty.expiresOn ?? ''}
                onChangeText={(text) => setWarranty({ ...warranty, expiresOn: text || null })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>
          </>
        ) : null}

        {error ? (
          <EydCard tone="warmSoft">
            <EydText variant="small" tone="warm">
              {error}
            </EydText>
          </EydCard>
        ) : null}
      </EydSheet>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  headChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listText: { flex: 1 },
  entryCard: { gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 14 },
  entryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  entryTitle: { flex: 1 },
  field: { gap: 8 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  multiline: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top', fontSize: 15 },
  saveBtn: { flex: 2 },
  deleteBtn: { flex: 1 },
});