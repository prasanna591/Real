import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import { EydSheet } from '@/components/eyd/sheet';
import {
  EydButton,
  EydCard,
  EydChip,
  EydProgress,
  EydRow,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatDayMonth } from '@/lib/eyd/format';
import { logActivity, setCurrentStage, updateStage, useEyD } from '@/lib/eyd/store';
import type { ProjectStage, StageId } from '@/lib/eyd/types';

const STATUS_TONE = { completed: 'success', current: 'blue', upcoming: 'neutral' } as const;
const STATUS_LABEL = { completed: 'Completed', current: 'Current', upcoming: 'Upcoming' } as const;
const PROGRESS_STEP = 5;

export default function RoadmapScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const [editingId, setEditingId] = useState<StageId | null>(null);
  const [draftProgress, setDraftProgress] = useState(0);
  const [draftNote, setDraftNote] = useState('');

  const editing = state.stages.find((s) => s.id === editingId) ?? null;
  const currentIdx = state.stages.findIndex((s) => s.status === 'current');
  const current = currentIdx >= 0 ? state.stages[currentIdx] : undefined;
  const next = state.stages[currentIdx + 1];
  const completedCount = state.stages.filter((s) => s.status === 'completed').length;

  const header = <EydHeaderBar title="Roadmap" onBack={() => router.back()} right={<EydSyncPill />} />;

  const openEditor = (stage: ProjectStage) => {
    setEditingId(stage.id);
    setDraftProgress(stage.progress);
    setDraftNote(stage.note);
  };

  const closeEditor = () => setEditingId(null);

  const save = () => {
    if (!editing) return;
    const label = editing.label;
    update((draft) => {
      updateStage(draft, editing.id, { progress: draftProgress, note: draftNote.trim() });
      logActivity(draft, `${label} updated to ${draftProgress}%`, 'progress');
    });
    closeEditor();
  };

  const makeCurrent = () => {
    if (!editing || editing.status === 'current') return;
    const label = editing.label;
    update((draft) => {
      setCurrentStage(draft, editing.id);
      logActivity(draft, `${label} set as the current stage`, 'stage');
    });
    closeEditor();
  };

  return (
    <EydScreen header={header}>
      <EydContainer style={styles.stack}>
        {/* ── Where / what was done / what's next ── */}
        <EydCard style={styles.stack}>
          <EydText variant="eyebrow" tone="blue">
            Project position
          </EydText>
          <View style={styles.positionRow}>
            <EydText variant="heading" style={styles.positionText}>
              {current ? current.label : 'Not started'}
            </EydText>
            {current ? <EydChip label={`${current.progress}% done`} tone="blue" /> : null}
          </View>
          <EydRow label="Completed" value={`${completedCount} of ${state.stages.length} stages`} tone="success" />
          <EydRow label="Now" value={current ? current.label : '—'} />
          <EydRow label="Next" value={next ? next.label : 'Handover — all stages done'} tone="muted" />
        </EydCard>

        <EydSectionTitle
          title="Construction stages"
          caption={`Stage ${currentIdx >= 0 ? currentIdx + 1 : state.stages.length} of ${state.stages.length} · updated ${formatDayMonth(state.project.updatedAt)}`}
        />

        {state.stages.map((stage) => (
          <Pressable
            key={stage.id}
            onPress={() => openEditor(stage)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${stage.label}`}
            style={({ pressed }) => [
              styles.stageRow,
              { borderBottomColor: t.border, backgroundColor: pressed ? t.surfaceAlt : 'transparent' },
              stage.status === 'upcoming' && styles.stageUpcoming,
            ]}>
            <EydText variant="eyebrow" tone={stage.status === 'upcoming' ? 'muted' : 'blue'} style={styles.stepNum}>
              {String(stage.step).padStart(2, '0')}
            </EydText>
            <View style={styles.stageText}>
              <EydText variant="subheading" tone={stage.status === 'upcoming' ? 'muted' : 'text'}>
                {stage.label}
              </EydText>
              {stage.progress > 0 && stage.progress < 100 ? (
                <EydProgress value={stage.progress} height={5} showLabel />
              ) : null}
              {stage.note ? (
                <EydText variant="small" tone="secondary" numberOfLines={2}>
                  {stage.note}
                </EydText>
              ) : null}
            </View>
            <View style={styles.stageEnd}>
              <EydChip label={STATUS_LABEL[stage.status]} tone={STATUS_TONE[stage.status]} />
              <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
            </View>
          </Pressable>
        ))}

        <EydText variant="small" tone="muted" align="center">
          Tap any stage to update progress, add a note, or make it the current stage.
        </EydText>
      </EydContainer>

      {/* ── Stage editor sheet ── */}
      <EydSheet
        visible={!!editing}
        eyebrow="Edit stage"
        title={editing?.label ?? ''}
        onClose={closeEditor}
        footer={
          <>
            <EydButton label="Save" onPress={save} style={styles.saveButton} />
            <EydButton
              label="Make current"
              variant="secondary"
              onPress={makeCurrent}
              disabled={editing?.status === 'current'}
              style={styles.currentButton}
            />
          </>
        }>
        {editing ? (
          <>
            <View style={styles.chipRow}>
              <EydChip label={STATUS_LABEL[editing.status]} tone={STATUS_TONE[editing.status]} />
            </View>

            <View style={styles.editorBlock}>
              <View style={styles.progressHead}>
                <EydText variant="small" tone="secondary" style={styles.progressLabel}>
                  Progress
                </EydText>
                <EydText variant="subheading">{draftProgress}%</EydText>
              </View>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => setDraftProgress((p) => Math.max(0, p - PROGRESS_STEP))}
                  accessibilityLabel="Decrease progress"
                  style={[styles.stepButton, { backgroundColor: t.surfaceAlt }]}>
                  <Ionicons name="remove" size={18} color={t.text} />
                </Pressable>
                <View style={styles.progressTrack}>
                  <EydProgress value={draftProgress} height={8} />
                </View>
                <Pressable
                  onPress={() => setDraftProgress((p) => Math.min(100, p + PROGRESS_STEP))}
                  accessibilityLabel="Increase progress"
                  style={[styles.stepButton, { backgroundColor: t.surfaceAlt }]}>
                  <Ionicons name="add" size={18} color={t.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.editorBlock}>
              <EydText variant="small" tone="secondary" style={styles.progressLabel}>
                Note
              </EydText>
              <TextInput
                value={draftNote}
                onChangeText={setDraftNote}
                multiline
                placeholder="e.g. Slab casting scheduled for Friday"
                placeholderTextColor={t.textMuted}
                style={[styles.noteInput, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>
          </>
        ) : null}
      </EydSheet>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  positionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  positionText: { flexShrink: 1 },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stageUpcoming: { opacity: 0.65 },
  stepNum: { width: 26 },
  stageText: { flex: 1, gap: 4 },
  stageEnd: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  editorBlock: { gap: 8 },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { fontWeight: '700' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { flex: 1 },
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
  saveButton: { flex: 2 },
  currentButton: { flex: 1 },
});