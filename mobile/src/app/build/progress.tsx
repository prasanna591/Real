import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import { EydSheet } from '@/components/eyd/sheet';
import {
  EydButton,
  EydCard,
  EydChip,
  EydEmpty,
  EydFieldLabel,
  EydProgress,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatDayMonth, relativeTime, uid } from '@/lib/eyd/format';
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/eyd/seed';
import { currentStage, overallProgress, recentProgressUpdates } from '@/lib/eyd/selectors';
import { logActivity, removeProgressUpdate, upsertProgressUpdate, useEyD } from '@/lib/eyd/store';
import type { ProgressUpdate, StageId } from '@/lib/eyd/types';

const PROGRESS_STEP = 5;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ProgressScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const progress = overallProgress(state);
  const stage = currentStage(state);
  const updates = recentProgressUpdates(state, 25);

  const [draft, setDraft] = useState<ProgressUpdate | null>(null);
  const [draftProgress, setDraftProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const isNew = draft ? !state.progressUpdates.some((u) => u.id === draft.id) : false;

  const header = <EydHeaderBar title="Progress" onBack={() => router.back()} right={<EydSyncPill />} />;

  const openAdd = (stageId: StageId) => {
    const target = state.stages.find((s) => s.id === stageId);
    setDraft({
      id: uid('pu'),
      stageId,
      note: '',
      progress: null,
      photoUri: null,
      date: todayISO(),
      createdAt: new Date().toISOString(),
    });
    setDraftProgress(target && target.progress > 0 ? target.progress : null);
    setError(null);
  };

  const openEdit = (update: ProgressUpdate) => {
    setDraft(update);
    setDraftProgress(update.progress);
    setError(null);
  };

  const closeEditor = () => setDraft(null);

  const pickPhoto = async () => {
    if (!draft) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.7,
      });
      if (result.canceled) return;
      const uri = result.assets[0]?.uri ?? null;
      if (uri) setDraft({ ...draft, photoUri: uri });
    } catch {
      /* picker cancelled or failed */
    } finally {
      setPicking(false);
    }
  };

  const save = () => {
    if (!draft) return;
    const note = draft.note.trim();
    if (!note && draftProgress === null) {
      setError('Add a note or a percentage for this update.');
      return;
    }
    const record: ProgressUpdate = {
      ...draft,
      note,
      progress: draftProgress,
      date: DATE_RE.test(draft.date) ? draft.date : todayISO(),
    };
    const exists = state.progressUpdates.some((u) => u.id === record.id);
    update((d) => {
      upsertProgressUpdate(d, record);
      const clamp = record.progress != null ? ` — ${record.progress}%` : '';
      logActivity(
        d,
        `${exists ? 'Site update edited' : 'Site update added'} · ${STAGE_LABELS[record.stageId]}${clamp}`,
        'progress',
      );
    });
    closeEditor();
  };

  const confirmDelete = () => {
    if (!draft) return;
    Alert.alert('Delete this update?', 'The progress note will be removed. Stage progress is unchanged.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          update((d) => {
            removeProgressUpdate(d, draft.id);
            logActivity(d, `Site update removed · ${STAGE_LABELS[draft.stageId]}`, 'progress');
          });
          closeEditor();
        },
      },
    ]);
  };

  const editorLabel =
    draft && !isNew ? `Edit · ${STAGE_LABELS[draft.stageId]}` : 'New site update';

  return (
    <EydScreen
      header={header}
      footer={<EydButton label="Add update" icon="add" onPress={() => openAdd(stage?.id ?? 'plan')} />}>
      <EydContainer style={styles.stack}>
        <EydCard style={styles.stack}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryText}>
              <EydText variant="eyebrow" tone="secondary">
                Overall progress
              </EydText>
              <EydText variant="metric">{progress}%</EydText>
            </View>
            <EydChip label={stage?.label ?? '—'} tone="blue" />
          </View>
          <EydProgress value={progress} height={10} showLabel={false} />
        </EydCard>

        {/* ── Per-stage bars ── */}
        <EydSectionTitle title="By stage" caption="Tap a stage to add an update there." />
        <EydCard padded={false}>
          {STAGE_ORDER.map((id, i) => {
            const s = state.stages.find((st) => st.id === id);
            return (
              <Pressable
                key={id}
                onPress={() => openAdd(id)}
                accessibilityRole="button"
                accessibilityLabel={`Add update for ${STAGE_LABELS[id]}`}
                style={({ pressed }) => [
                  styles.stageRow,
                  {
                    borderBottomColor: t.border,
                    borderBottomWidth: i === STAGE_ORDER.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    backgroundColor: pressed ? t.surfaceAlt : t.surface,
                  },
                ]}>
                <View style={styles.stageText}>
                  <View style={styles.stageLabelRow}>
                    <EydText variant="small" style={styles.stageName}>
                      {STAGE_LABELS[id]}
                    </EydText>
                    <EydText variant="small" tone={s && s.progress > 0 ? 'blue' : 'muted'}>
                      {s?.progress ?? 0}%
                    </EydText>
                  </View>
                  <EydProgress value={s?.progress ?? 0} height={6} showLabel={false} />
                </View>
              </Pressable>
            );
          })}
        </EydCard>

        {/* ── Recent updates ── */}
        <EydSectionTitle title="Recent updates" caption="Notes from the site, newest first." />

        {updates.length === 0 ? (
          <EydEmpty
            icon="clipboard-outline"
            title="No updates yet"
            body="Add your first site update to start tracking construction progress."
            actionLabel="Add update"
            onAction={() => openAdd(stage?.id ?? 'plan')}
          />
        ) : (
          updates.map((update) => (
            <Pressable
              key={update.id}
              onPress={() => openEdit(update)}
              accessibilityRole="button"
              accessibilityLabel={`Edit update for ${STAGE_LABELS[update.stageId]}`}
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : undefined)}>
              <EydCard style={styles.updateCard}>
                <View style={styles.updateHead}>
                  <EydText variant="subheading" style={styles.updateStage}>
                    {STAGE_LABELS[update.stageId]}
                  </EydText>
                  <EydText variant="small" tone="muted">
                    {formatDayMonth(update.date)} · {relativeTime(update.createdAt)}
                  </EydText>
                </View>
                {update.photoUri ? (
                  <Image source={{ uri: update.photoUri }} style={styles.updatePhoto} contentFit="cover" transition={150} />
                ) : null}
                {update.note ? <EydText variant="body">{update.note}</EydText> : null}
                {update.progress !== null && update.progress !== undefined ? (
                  <View style={styles.updateProgress}>
                    <EydProgress value={update.progress} height={5} showLabel />
                  </View>
                ) : null}
              </EydCard>
            </Pressable>
          ))
        )}
      </EydContainer>

      {/* ── Update editor ── */}
      <EydSheet
        visible={!!draft}
        eyebrow={editorLabel}
        title={draft?.note || 'Site update'}
        onClose={closeEditor}
        footer={
          <>
            <EydButton label="Save" onPress={save} style={styles.saveButton} />
            {!isNew ? <EydButton label="Delete" variant="danger" onPress={confirmDelete} style={styles.deleteButton} /> : null}
          </>
        }>
        {draft ? (
          <>
            <View style={styles.field}>
              <EydFieldLabel label="Stage" />
              <View style={styles.chipWrap}>
                {STAGE_ORDER.map((id) => (
                  <EydChip
                    key={id}
                    label={STAGE_LABELS[id]}
                    tone="blue"
                    selected={draft.stageId === id}
                    onPress={() => {
                      const target = state.stages.find((s) => s.id === id);
                      setDraft({ ...draft, stageId: id });
                      setDraftProgress((p) => p ?? (target && target.progress > 0 ? target.progress : null));
                    }}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Note" />
              <TextInput
                value={draft.note}
                onChangeText={(text) => {
                  setDraft({ ...draft, note: text });
                  setError(null);
                }}
                multiline
                placeholder="e.g. Slab casting done, curing started"
                placeholderTextColor={t.textMuted}
                style={[styles.noteInput, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.progressHead}>
                <EydFieldLabel label="Progress (optional)" />
                {draftProgress !== null ? (
                  <View style={styles.stepperRow}>
                    <Pressable
                      onPress={() => setDraftProgress((p) => (p === null ? null : Math.max(0, p - PROGRESS_STEP)))}
                      accessibilityLabel="Decrease progress"
                      style={[styles.stepButton, { backgroundColor: t.surfaceAlt }]}>
                      <Ionicons name="remove" size={16} color={t.text} />
                    </Pressable>
                    <EydText variant="small" tone="blue" style={styles.stepperValue}>
                      {draftProgress}%
                    </EydText>
                    <Pressable
                      onPress={() => setDraftProgress((p) => (p === null ? p : Math.min(100, p + PROGRESS_STEP)))}
                      accessibilityLabel="Increase progress"
                      style={[styles.stepButton, { backgroundColor: t.surfaceAlt }]}>
                      <Ionicons name="add" size={16} color={t.text} />
                    </Pressable>
                    <Pressable onPress={() => setDraftProgress(null)} hitSlop={8}>
                      <EydText variant="small" tone="muted">
                        clear
                      </EydText>
                    </Pressable>
                  </View>
                ) : (
                  <EydChip label="+ Add percentage" tone="blue" onPress={() => setDraftProgress(0)} />
                )}
              </View>
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Date" />
              <TextInput
                value={draft.date}
                onChangeText={(text) => setDraft({ ...draft, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
              <EydText variant="small" tone="muted">
                Format: YYYY-MM-DD · falls back to today if invalid.
              </EydText>
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Photo (optional)" />
              {draft.photoUri ? (
                <>
                  <Image source={{ uri: draft.photoUri }} style={styles.editPhoto} contentFit="cover" transition={150} />
                  <View style={styles.photoActions}>
                    <EydButton label="Replace photo" variant="secondary" onPress={pickPhoto} disabled={picking} style={styles.photoAction} />
                    <EydButton label="Remove" variant="danger" onPress={() => setDraft({ ...draft, photoUri: null })} style={styles.photoAction} />
                  </View>
                </>
              ) : (
                <EydButton label={picking ? 'Opening…' : 'Attach photo'} variant="secondary" icon="camera-outline" onPress={pickPhoto} disabled={picking} />
              )}
            </View>

            {error ? (
              <EydCard tone="warmSoft">
                <EydText variant="small" tone="warm">
                  {error}
                </EydText>
              </EydCard>
            ) : null}
          </>
        ) : null}
      </EydSheet>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.lg },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  summaryText: { flex: 1, gap: 2 },
  stageRow: { paddingHorizontal: 14, paddingVertical: 12 },
  stageText: { gap: 6 },
  stageLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stageName: { fontWeight: '700' },
  updateCard: { gap: 6 },
  updateHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  updateStage: { flexShrink: 1 },
  updateProgress: { marginTop: 2 },
  updatePhoto: { height: 150, borderRadius: 12, marginTop: 2, backgroundColor: '#E9F0FE' },
  field: { gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteInput: {
    minHeight: 76,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Fonts.sans,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 42, fontWeight: '700', textAlign: 'center' },
  editPhoto: { height: 140, borderRadius: 12, backgroundColor: '#E9F0FE' },
  photoActions: { flexDirection: 'row', gap: EyDSpacing.md },
  photoAction: { flex: 1 },
  saveButton: { flex: 2 },
  deleteButton: { flex: 1 },
});