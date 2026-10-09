import { Ionicons } from '@expo/vector-icons';
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
  EydIconBadge,
  EydRow,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatBytes, formatDayMonthYear, uid } from '@/lib/eyd/format';
import { DOCUMENT_CATEGORY_META } from '@/lib/eyd/meta';
import { logActivity, removeEydDocument, saveEydDocument, useEyD } from '@/lib/eyd/store';
import type { DocumentCategory, EydDocument } from '@/lib/eyd/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => new Date().toISOString().slice(0, 10);
const DOC_CATEGORIES = Object.keys(DOCUMENT_CATEGORY_META) as DocumentCategory[];

export default function DocumentsScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const [filter, setFilter] = useState<DocumentCategory | 'all'>('all');
  const [doc, setDoc] = useState<EydDocument | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const isNew = doc ? !state.documents.some((d) => d.id === doc.id) : false;
  const header = <EydHeaderBar title="Documents" onBack={() => router.back()} right={<EydSyncPill />} />;

  const groups = DOC_CATEGORIES.map((cat) => ({
    cat,
    items: state.documents
      .filter((d) => d.category === cat && (filter === 'all' || filter === cat))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  })).filter((g) => g.items.length > 0);

  const counts = DOC_CATEGORIES.map((c) => state.documents.filter((d) => d.category === c).length);

  const openView = (d: EydDocument) => {
    setDoc(d);
    setMode('view');
    setError(null);
  };

  const openAdd = () => {
    setDoc({
      id: uid('d'),
      category: filter === 'all' ? 'other' : filter,
      name: '',
      size: null,
      date: todayISO(),
      source: 'local',
      uri: null,
    });
    setMode('edit');
    setError(null);
  };

  const closeSheet = () => {
    setDoc(null);
    setError(null);
  };

  const attach = async () => {
    if (!doc) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.7,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset?.uri) setDoc({ ...doc, uri: asset.uri, size: asset.fileSize ?? doc.size });
    } catch {
      /* picker cancelled or failed */
    } finally {
      setPicking(false);
    }
  };

  const save = () => {
    if (!doc) return;
    const name = doc.name.trim();
    if (!name) {
      setError('Add a document name.');
      return;
    }
    const record: EydDocument = {
      ...doc,
      name,
      date: DATE_RE.test(doc.date) ? doc.date : todayISO(),
    };
    const exists = state.documents.some((d) => d.id === record.id);
    update((d) => {
      saveEydDocument(d, record);
      logActivity(d, `${exists ? 'Document updated' : 'Document added'} — ${record.name}`, 'document');
    });
    closeSheet();
  };

  const confirmDelete = () => {
    if (!doc) return;
    Alert.alert('Delete document?', `${doc.name} will be removed from this project.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          update((d) => {
            removeEydDocument(d, doc.id);
            logActivity(d, `Document deleted — ${doc.name}`, 'document');
          });
          closeSheet();
        },
      },
    ]);
  };

  return (
    <EydScreen header={header} footer={<EydButton label="Add document" icon="add" onPress={openAdd} />}>
      <EydContainer style={styles.stack}>
        <EydCard tone="blueSoft">
          <EydText variant="small" tone="secondary">
            Seeded records are sample documents for this demo — the source field shows what is a demo record vs. one you added on this device.
          </EydText>
        </EydCard>

        <View style={styles.chipWrap}>
          <EydChip label={`All (${state.documents.length})`} tone="blue" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {DOC_CATEGORIES.map((c, i) => (
            <EydChip
              key={c}
              label={`${DOCUMENT_CATEGORY_META[c].label} (${counts[i]})`}
              tone="blue"
              selected={filter === c}
              onPress={() => setFilter(c)}
            />
          ))}
        </View>

        {groups.length === 0 ? (
          <EydEmpty
            icon="folder-open-outline"
            title="No documents here"
            body="Add contracts, bills, approvals and plans to keep everything in one place."
            actionLabel="Add document"
            onAction={openAdd}
          />
        ) : (
          groups.map((g) => (
            <View key={g.cat} style={styles.group}>
              <EydSectionTitle
                title={DOCUMENT_CATEGORY_META[g.cat].label}
                caption={`${g.items.length} document${g.items.length === 1 ? '' : 's'}`}
              />
              <EydCard padded={false}>
                {g.items.map((d, i) => (
                  <Pressable
                    key={d.id}
                    onPress={() => openView(d)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${d.name}`}
                    style={({ pressed }) => [
                      styles.docRow,
                      {
                        borderBottomColor: t.border,
                        borderBottomWidth: i === g.items.length - 1 ? 0 : StyleSheet.hairlineWidth,
                        backgroundColor: pressed ? t.surfaceAlt : t.surface,
                      },
                    ]}>
                    <EydIconBadge icon={DOCUMENT_CATEGORY_META[d.category].icon} tone={d.source === 'local' ? 'success' : 'blue'} />
                    <View style={styles.docText}>
                      <EydText variant="small" numberOfLines={2} style={styles.docName}>
                        {d.name}
                      </EydText>
                      <EydText variant="small" tone="muted">
                        {formatBytes(d.size)} · {formatDayMonthYear(d.date)}
                        {d.uri ? ' · attached' : ''}
                      </EydText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
                  </Pressable>
                ))}
              </EydCard>
            </View>
          ))
        )}
      </EydContainer>

      {/* ── Document sheet: view or edit ── */}
      <EydSheet
        visible={!!doc}
        eyebrow={mode === 'edit' ? (isNew ? 'New document' : 'Rename document') : 'Document'}
        title={doc?.name || 'Add document'}
        onClose={closeSheet}
        footer={
          mode === 'view' ? (
            <>
              <EydButton label="Rename" variant="secondary" onPress={() => setMode('edit')} style={styles.primaryBtn} />
              <EydButton label="Delete" variant="danger" onPress={confirmDelete} />
            </>
          ) : (
            <>
              <EydButton label="Save" onPress={save} style={styles.primaryBtn} />
              {!isNew ? <EydButton label="Cancel" variant="ghost" onPress={() => setMode('view')} /> : <EydButton label="Cancel" variant="ghost" onPress={closeSheet} />}
            </>
          )
        }>
        {doc ? (
          mode === 'view' ? (
            <>
              <View style={styles.viewHead}>
                <EydIconBadge icon={DOCUMENT_CATEGORY_META[doc.category].icon} size={44} tone={doc.source === 'local' ? 'success' : 'blue'} />
                <View style={styles.viewHeadText}>
                  <EydChip label={DOCUMENT_CATEGORY_META[doc.category].label} tone="blue" />
                  <EydChip label={doc.source === 'local' ? 'On this device' : 'Sample record'} tone={doc.source === 'local' ? 'success' : 'neutral'} />
                </View>
              </View>
              <EydRow label="Size" value={formatBytes(doc.size)} />
              <EydRow label="Date" value={formatDayMonthYear(doc.date)} />
              <EydRow label="Attachment" value={doc.uri ? 'Yes (local file)' : 'None'} />
              <EydText variant="small" tone="muted">
                Preview opens the attached file in the live app; metadata views work offline either way.
              </EydText>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <EydFieldLabel label="Name" />
                <TextInput
                  value={doc.name}
                  onChangeText={(text) => {
                    setDoc({ ...doc, name: text });
                    setError(null);
                  }}
                  placeholder="e.g. Contractor agreement (signed).pdf"
                  placeholderTextColor={t.textMuted}
                  style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
                />
              </View>

              <View style={styles.field}>
                <EydFieldLabel label="Category" />
                <View style={styles.chipWrap}>
                  {DOC_CATEGORIES.map((c) => (
                    <EydChip
                      key={c}
                      label={DOCUMENT_CATEGORY_META[c].label}
                      tone="blue"
                      selected={doc.category === c}
                      onPress={() => setDoc({ ...doc, category: c })}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <EydFieldLabel label="Date" />
                <TextInput
                  value={doc.date}
                  onChangeText={(text) => setDoc({ ...doc, date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={t.textMuted}
                  style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
                />
              </View>

              <View style={styles.field}>
                <EydFieldLabel label="Attach file (optional)" />
                {doc.uri ? (
                  <>
                    <EydText variant="small" tone="blue" numberOfLines={1}>
                      Attached — {formatBytes(doc.size)}
                    </EydText>
                    <View style={styles.attachRow}>
                      <EydButton label="Replace" variant="secondary" onPress={attach} disabled={picking} style={styles.attachBtn} />
                      <EydButton label="Remove" variant="ghost" onPress={() => setDoc({ ...doc, uri: null, size: null })} />
                    </View>
                  </>
                ) : (
                  <EydButton
                    label={picking ? 'Opening…' : 'Attach image'}
                    variant="secondary"
                    icon="attach-outline"
                    onPress={attach}
                    disabled={picking}
                  />
                )}
                <EydText variant="small" tone="muted">
                  You can also save just the record (name/category/date) without a file.
                </EydText>
              </View>

              {error ? (
                <EydCard tone="warmSoft">
                  <EydText variant="small" tone="warm">
                    {error}
                  </EydText>
                </EydCard>
              ) : null}
            </>
          )
        ) : null}
      </EydSheet>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  group: { gap: EyDSpacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  docText: { flex: 1, gap: 2 },
  docName: { fontWeight: '600' },
  viewHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  viewHeadText: { flex: 1, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  field: { gap: 8 },
  attachRow: { flexDirection: 'row', gap: EyDSpacing.md },
  attachBtn: { flex: 1 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  primaryBtn: { flex: 1 },
});