import { Ionicons } from '@expo/vector-icons';
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
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatDayMonth, formatINR, uid } from '@/lib/eyd/format';
import { QUOTATION_STATUS_META } from '@/lib/eyd/meta';
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABEL } from '@/lib/eyd/seed';
import {
  logActivity,
  removeQuotation,
  saveQuotation,
  setQuotationStatus,
  useEyD,
} from '@/lib/eyd/store';
import type { BudgetCategoryId, Quotation, QuotationStatus } from '@/lib/eyd/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => new Date().toISOString().slice(0, 10);
const NUM_RE = /[^0-9.]/g;

interface ItemRow {
  key: string;
  item: string;
  qty: string;
  unit: string;
  price: string;
}

const rowFrom = (item: string, qty: number, unit: string, price: number): ItemRow => ({
  key: uid('r'),
  item,
  qty: qty ? String(qty) : '',
  unit,
  price: price ? String(price) : '',
});

export default function QuotationsScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<Quotation | null>(null);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const header = <EydHeaderBar title="Quotations" onBack={() => router.back()} right={<EydSyncPill />} />;

  const list = statusFilter === 'all' ? state.quotations : state.quotations.filter((q) => q.status === statusFilter);
  const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const compared = selected
    .map((id) => state.quotations.find((q) => q.id === id))
    .filter((q): q is Quotation => Boolean(q));
  const cheapest = compared.length > 0 ? Math.min(...compared.map((q) => q.total)) : 0;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        Alert.alert('Pick up to 3', 'Comparison supports 2–3 quotations at a time.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const openAdd = () => {
    setDraft({
      id: uid('q'),
      vendorName: '',
      vendorId: null,
      categoryId: null,
      scope: '',
      items: [],
      total: 0,
      status: 'pending',
      date: todayISO(),
      notes: '',
      createdAt: new Date().toISOString(),
    });
    setRows([rowFrom('', 0, '', 0)]);
    setError(null);
  };

  const openEdit = (quote: Quotation) => {
    setDraft(quote);
    setRows(quote.items.map((it) => rowFrom(it.item, it.qty, it.unit, it.unitPrice)));
    setError(null);
  };

  const closeEditor = () => setDraft(null);

  const setRow = (key: string, patch: Partial<ItemRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const liveTotal = rows.reduce((sum, r) => {
    const qty = Number(r.qty) || 0;
    const price = Number(r.price.replace(NUM_RE, '')) || 0;
    return sum + qty * price;
  }, 0);

  const save = () => {
    if (!draft) return;
    const vendorName = draft.vendorName.trim();
    const scope = draft.scope.trim();
    const items = rows
      .map((r) => ({
        item: r.item.trim(),
        qty: Number(r.qty) || 0,
        unit: r.unit.trim() || 'nos',
        unitPrice: Number(r.price.replace(NUM_RE, '')) || 0,
        total: (Number(r.qty) || 0) * (Number(r.price.replace(NUM_RE, '')) || 0),
      }))
      .filter((it) => it.item && it.qty > 0 && it.unitPrice > 0);
    if (!vendorName) {
      setError('Add the vendor name.');
      return;
    }
    if (!scope) {
      setError('Add a short scope, e.g. "Interior fit-out".');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one line item with qty and unit price.');
      return;
    }
    const record: Quotation = {
      ...draft,
      vendorName,
      scope,
      items,
      total: items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0),
      date: DATE_RE.test(draft.date) ? draft.date : todayISO(),
      notes: draft.notes.trim(),
    };
    const exists = state.quotations.some((q) => q.id === record.id);
    update((d) => {
      saveQuotation(d, record);
      logActivity(d, `${exists ? 'Quotation updated' : 'Quotation received'} — ${record.vendorName} (${formatINR(record.total)})`, 'quotation');
    });
    closeEditor();
  };

  const confirmDelete = () => {
    if (!draft) return;
    Alert.alert('Delete quotation?', `${draft.vendorName} — ${formatINR(draft.total)} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          update((d) => {
            removeQuotation(d, draft.id);
            logActivity(d, `Quotation deleted — ${draft.vendorName}`, 'quotation');
          });
          setSelected((prev) => prev.filter((x) => x !== draft.id));
          closeEditor();
        },
      },
    ]);
  };

  const isNew = draft ? !state.quotations.some((q) => q.id === draft.id) : false;

  const markCompared = () => {
    const ids = selected;
    if (ids.length < 2) return;
    update((d) => {
      for (const id of ids) setQuotationStatus(d, id, 'compared');
      logActivity(d, `Compared ${ids.length} quotations`, 'quotation');
    });
    setSelected([]);
  };

  const accept = (quote: Quotation) => {
    Alert.alert('Accept quotation?', `${quote.vendorName} — ${formatINR(quote.total)} will be marked accepted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: () =>
          update((d) => {
            setQuotationStatus(d, quote.id, 'accepted');
            logActivity(d, `Quotation accepted — ${quote.vendorName} (${formatINR(quote.total)})`, 'quotation');
          }),
      },
    ]);
  };

  const reject = (quote: Quotation) => {
    Alert.alert('Reject quotation?', `${quote.vendorName} — ${formatINR(quote.total)} will be marked rejected.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          update((d) => {
            setQuotationStatus(d, quote.id, 'rejected');
            logActivity(d, `Quotation rejected — ${quote.vendorName}`, 'quotation');
          }),
      },
    ]);
  };

  return (
    <EydScreen
      header={header}
      footer={<EydButton label="New quotation" icon="add" onPress={openAdd} />}>
      <EydContainer style={styles.stack}>
        <EydCard tone="blueSoft">
          <EydText variant="small" tone="secondary">
            Sample quotations generated for this demo — mock vendors and prices, not real offers. Select 2–3 to compare side by side.
          </EydText>
        </EydCard>

        {/* ── Comparison ── */}
        {compared.length >= 2 ? (
          <>
            <View style={styles.listHead}>
              <View style={styles.listHeadText}>
                <EydSectionTitle title="Comparison" caption={`${compared.length} quotations · cheapest highlighted`} />
              </View>
              <EydChip label="Mark compared" tone="blue" onPress={markCompared} />
            </View>
            <EydCard padded={false}>
              {compared.map((q, i) => {
                const isBest = q.total === cheapest;
                return (
                  <View
                    key={q.id}
                    style={[
                      styles.compareRow,
                      { borderBottomWidth: i === compared.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.border },
                      isBest && { backgroundColor: t.success + '14' },
                    ]}>
                    <View style={styles.compareText}>
                      <EydText variant="subheading" numberOfLines={1}>
                        {q.vendorName}
                      </EydText>
                      <View style={styles.compareMeta}>
                        <EydChip label={QUOTATION_STATUS_META[q.status].label} tone={QUOTATION_STATUS_META[q.status].tone} />
                        {isBest ? <EydChip label="Best price" tone="success" /> : null}
                        {!isBest ? (
                          <EydText variant="small" tone="muted">
                            +{formatINR(q.total - cheapest)} vs best
                          </EydText>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.compareEnd}>
                      <EydText variant="subheading" style={isBest ? styles.bestPrice : undefined}>
                        {formatINR(q.total)}
                      </EydText>
                      <View style={styles.compareActions}>
                        <EydButton label="Accept" size="sm" onPress={() => accept(q)} />
                        <EydButton label="Reject" variant="danger" size="sm" onPress={() => reject(q)} />
                      </View>
                    </View>
                  </View>
                );
              })}
            </EydCard>
          </>
        ) : (
          <EydText variant="small" tone="muted" align="center">
            {selected.length === 1 ? 'Pick one more quotation to compare.' : 'Tap "Compare" on 2–3 quotations for a side-by-side view.'}
          </EydText>
        )}

        {/* ── Status filter ── */}
        <View style={styles.chipWrap}>
          {(['all', 'pending', 'received', 'compared', 'accepted', 'rejected'] as const).map((s) => {
            const label = s === 'all' ? 'All' : QUOTATION_STATUS_META[s].label;
            return (
              <EydChip
                key={s}
                label={label}
                tone={s === 'all' ? 'blue' : QUOTATION_STATUS_META[s as QuotationStatus].tone}
                selected={statusFilter === s}
                onPress={() => setStatusFilter(s)}
              />
            );
          })}
        </View>

        <EydSectionTitle title="Quotations" caption={`${sorted.length} of ${state.quotations.length} shown`} />

        {sorted.length === 0 ? (
          <EydEmpty
            icon="documents-outline"
            title="No quotations yet"
            body="Record vendor quotations here to compare them side by side before accepting."
            actionLabel="New quotation"
            onAction={openAdd}
          />
        ) : (
          sorted.map((q) => {
            const isSelected = selected.includes(q.id);
            return (
              <EydCard key={q.id} style={styles.card}>
                <Pressable onPress={() => router.push(`/build/quotations/${q.id}`)} accessibilityRole="button">
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitle}>
                      <EydText variant="subheading" numberOfLines={1}>
                        {q.vendorName}
                      </EydText>
                      <EydText variant="small" tone="secondary" numberOfLines={1}>
                        {q.scope} · {formatDayMonth(q.date)}
                      </EydText>
                    </View>
                    <EydChip label={QUOTATION_STATUS_META[q.status].label} tone={QUOTATION_STATUS_META[q.status].tone} />
                  </View>
                  <View style={styles.cardMeta}>
                    <EydText variant="metric" style={styles.cardTotal}>
                      {formatINR(q.total)}
                    </EydText>
                    <EydText variant="small" tone="muted">
                      {q.items.length} item{q.items.length === 1 ? '' : 's'}
                      {q.categoryId ? ` · ${BUDGET_CATEGORY_LABEL[q.categoryId]}` : ''}
                    </EydText>
                  </View>
                </Pressable>
                <View style={styles.cardActions}>
                  <EydChip label={isSelected ? 'Selected ✓' : 'Compare'} tone="blue" selected={isSelected} onPress={() => toggleSelect(q.id)} />
                  <EydButton label="Open" variant="secondary" size="sm" onPress={() => router.push(`/build/quotations/${q.id}`)} style={styles.openBtn} />
                  <EydButton label="Edit" variant="ghost" size="sm" onPress={() => openEdit(q)} />
                </View>
              </EydCard>
            );
          })
        )}
      </EydContainer>

      {/* ── Quotation editor ── */}
      <EydSheet
        visible={!!draft}
        eyebrow={isNew ? 'New quotation' : 'Edit quotation'}
        title={draft?.vendorName || 'Quotation'}
        onClose={closeEditor}
        footer={
          <>
            <EydButton label="Save" onPress={save} style={styles.saveBtn} />
            {!isNew ? <EydButton label="Delete" variant="danger" onPress={confirmDelete} style={styles.deleteBtn} /> : null}
          </>
        }>
        {draft ? (
          <>
            <View style={styles.field}>
              <EydFieldLabel label="Vendor name" />
              <TextInput
                value={draft.vendorName}
                onChangeText={(text) => {
                  setDraft({ ...draft, vendorName: text });
                  setError(null);
                }}
                placeholder="e.g. Casa Interior Studio"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Scope" />
              <TextInput
                value={draft.scope}
                onChangeText={(text) => {
                  setDraft({ ...draft, scope: text });
                  setError(null);
                }}
                placeholder="e.g. Interior fit-out · 2,400 sq ft"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Status" />
              <View style={styles.chipWrap}>
                {(['pending', 'received', 'compared', 'accepted', 'rejected'] as QuotationStatus[]).map((s) => (
                  <EydChip
                    key={s}
                    label={QUOTATION_STATUS_META[s].label}
                    tone={QUOTATION_STATUS_META[s].tone}
                    selected={draft.status === s}
                    onPress={() => setDraft({ ...draft, status: s })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Category (optional)" />
              <View style={styles.chipWrap}>
                <EydChip label="None" tone="blue" selected={draft.categoryId === null} onPress={() => setDraft({ ...draft, categoryId: null })} />
                {BUDGET_CATEGORIES.map((c) => (
                  <EydChip
                    key={c.id}
                    label={c.label}
                    tone="blue"
                    selected={draft.categoryId === c.id}
                    onPress={() => setDraft({ ...draft, categoryId: c.id as BudgetCategoryId })}
                  />
                ))}
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
            </View>

            <View style={styles.field}>
              <View style={styles.itemsHead}>
                <EydFieldLabel label="Line items (BOQ)" />
                <EydText variant="small" tone="blue" style={styles.totalText}>
                  Total {formatINR(liveTotal)}
                </EydText>
              </View>
              {rows.map((r, i) => (
                <View key={r.key} style={[styles.itemRow, { backgroundColor: t.surfaceAlt }]}>
                  <TextInput
                    value={r.item}
                    onChangeText={(text) => setRow(r.key, { item: text })}
                    placeholder={`Item ${i + 1}`}
                    placeholderTextColor={t.textMuted}
                    style={[styles.itemName, { color: t.text }]}
                  />
                  <View style={styles.itemFields}>
                    <TextInput
                      value={r.qty}
                      onChangeText={(text) => setRow(r.key, { qty: text.replace(/[^0-9.]/g, '') })}
                      keyboardType="decimal-pad"
                      placeholder="Qty"
                      placeholderTextColor={t.textMuted}
                      style={[styles.itemNum, { color: t.text }]}
                    />
                    <TextInput
                      value={r.unit}
                      onChangeText={(text) => setRow(r.key, { unit: text })}
                      placeholder="Unit"
                      placeholderTextColor={t.textMuted}
                      style={[styles.itemUnit, { color: t.text }]}
                    />
                    <TextInput
                      value={r.price}
                      onChangeText={(text) => setRow(r.key, { price: text.replace(NUM_RE, '') })}
                      keyboardType="decimal-pad"
                      placeholder="Rate"
                      placeholderTextColor={t.textMuted}
                      style={[styles.itemPrice, { color: t.text }]}
                    />
                    <Pressable onPress={() => setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== r.key) : prev))} hitSlop={8} accessibilityLabel="Remove item">
                      <Ionicons name="close-circle" size={20} color={t.textMuted} />
                    </Pressable>
                  </View>
                </View>
              ))}
              <EydButton
                label="Add item"
                variant="secondary"
                size="sm"
                icon="add"
                onPress={() => setRows((prev) => [...prev, rowFrom('', 0, '', 0)])}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Notes (optional)" />
              <TextInput
                value={draft.notes}
                onChangeText={(text) => setDraft({ ...draft, notes: text })}
                multiline
                placeholder="e.g. Includes design supervision"
                placeholderTextColor={t.textMuted}
                style={[styles.input, styles.inputMultiline, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
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
  stack: { gap: EyDSpacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  listHeadText: { flex: 1 },
  compareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  compareText: { flex: 1, gap: 6 },
  compareMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  compareEnd: { alignItems: 'flex-end', gap: 8 },
  compareActions: { flexDirection: 'row', gap: 8 },
  bestPrice: { color: '#12B76A', fontWeight: '700' },
  card: { gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, gap: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 },
  cardTotal: { fontSize: 22 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  openBtn: { flex: 1 },
  field: { gap: 8 },
  itemsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totalText: { fontWeight: '700' },
  itemRow: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  itemName: { fontSize: 15, fontFamily: Fonts.sans, minHeight: 34, paddingVertical: 4 },
  itemFields: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemNum: { width: 52, fontSize: 14, fontFamily: Fonts.sans, height: 34, paddingVertical: 4 },
  itemUnit: { width: 54, fontSize: 14, fontFamily: Fonts.sans, height: 34, paddingVertical: 4 },
  itemPrice: { flex: 1, fontSize: 14, fontFamily: Fonts.sans, height: 34, paddingVertical: 4, textAlign: 'right' },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  inputMultiline: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top', fontSize: 15 },
  saveBtn: { flex: 2 },
  deleteBtn: { flex: 1 },
});