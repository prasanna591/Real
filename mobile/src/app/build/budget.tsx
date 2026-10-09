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
  EydRow,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatDayMonth, formatINR, uid } from '@/lib/eyd/format';
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABEL } from '@/lib/eyd/seed';
import { budgetTotals } from '@/lib/eyd/selectors';
import { logActivity, removeExpense, saveExpense, useEyD } from '@/lib/eyd/store';
import type { BudgetCategoryId, Expense } from '@/lib/eyd/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function BudgetScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const totals = budgetTotals(state);
  const [filter, setFilter] = useState<BudgetCategoryId | null>(null);
  const [draft, setDraft] = useState<Expense | null>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isNew = draft ? !state.expenses.some((e) => e.id === draft.id) : false;
  const visible = filter ? state.expenses.filter((e) => e.categoryId === filter) : state.expenses;
  const sorted = [...visible].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const header = <EydHeaderBar title="Budget" onBack={() => router.back()} right={<EydSyncPill />} />;

  const openAdd = () => {
    setDraft({
      id: uid('e'),
      categoryId: filter ?? 'construction',
      title: '',
      amount: 0,
      note: '',
      date: todayISO(),
      createdAt: new Date().toISOString(),
    });
    setAmountText('');
    setError(null);
  };

  const openEdit = (expense: Expense) => {
    setDraft(expense);
    setAmountText(String(expense.amount));
    setError(null);
  };

  const closeEditor = () => setDraft(null);

  const save = () => {
    if (!draft) return;
    const title = draft.title.trim();
    const amount = Number(amountText.replace(/[^0-9]/g, ''));
    if (!title) {
      setError('Add a title for this expense.');
      return;
    }
    if (!(amount > 0)) {
      setError('Amount must be greater than 0.');
      return;
    }
    const record: Expense = {
      ...draft,
      title,
      amount,
      date: DATE_RE.test(draft.date) ? draft.date : todayISO(),
      note: draft.note.trim(),
    };
    const exists = state.expenses.some((e) => e.id === record.id);
    update((d) => {
      saveExpense(d, record);
      logActivity(
        d,
        `${exists ? 'Expense updated' : 'Expense added'} — ${record.title} (${formatINR(record.amount)})`,
        'expense',
      );
    });
    closeEditor();
  };

  const confirmDelete = () => {
    if (!draft) return;
    const { id, title } = draft;
    Alert.alert('Delete expense?', `${title} — ${formatINR(Number(amountText.replace(/[^0-9]/g, '')) || 0)} will be removed from your budget.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          update((d) => {
            removeExpense(d, id);
            logActivity(d, `Expense deleted — ${title}`, 'expense');
          });
          closeEditor();
        },
      },
    ]);
  };

  const usedTone = totals.usedPct >= 100 ? 'danger' : totals.usedPct >= 92 ? 'warning' : 'blue';

  return (
    <EydScreen
      header={header}
      footer={
        <EydButton label="Add expense" icon="add" onPress={openAdd} />
      }>
      <EydContainer style={styles.stack}>
        {/* ── Totals ── */}
        <EydCard style={styles.stack}>
          <EydText variant="eyebrow" tone="secondary">
            Total budget
          </EydText>
          <EydText variant="metric">{formatINR(totals.total)}</EydText>
          <EydProgress value={totals.usedPct} showLabel height={10} tone={usedTone} />
          <EydRow label="Spent" value={formatINR(totals.spent)} />
          <EydRow
            label="Remaining"
            value={formatINR(Math.max(0, totals.remaining))}
            tone={totals.remaining <= 0 ? 'danger' : 'success'}
          />
        </EydCard>

        {/* ── Category breakdown ── */}
        <EydSectionTitle
          title="By category"
          caption="Tap a category to filter expenses."
        />
        <EydCard padded={false}>
          {totals.categories.map((cat, i) => {
            const selected = filter === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setFilter(selected ? null : cat.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filter ${cat.label}`}
                style={({ pressed }) => [
                  styles.catRow,
                  { borderBottomColor: t.border, borderBottomWidth: i === totals.categories.length - 1 ? 0 : StyleSheet.hairlineWidth },
                  pressed && { backgroundColor: t.surfaceAlt },
                  selected && { backgroundColor: t.blueSoft },
                ]}>
                <EydText variant="small" tone={selected ? 'blue' : 'text'} style={styles.catLabel}>
                  {cat.label}
                </EydText>
                <EydText variant="small" tone={cat.spent > 0 ? 'text' : 'muted'} style={styles.catAmount}>
                  {cat.spent > 0 ? formatINR(cat.spent) : '—'}
                </EydText>
                <EydText variant="small" tone="muted" style={styles.catShare}>
                  {cat.spent > 0 ? `${cat.sharePct}%` : ''}
                </EydText>
              </Pressable>
            );
          })}
        </EydCard>

        {/* ── Expense list ── */}
        <View style={styles.listHead}>
          <View style={styles.listHeadText}>
            <EydSectionTitle
              title="Expenses"
              caption={`${sorted.length} of ${state.expenses.length} shown`}
            />
          </View>
          {filter ? (
            <EydChip label={`Filter: ${BUDGET_CATEGORY_LABEL[filter]}`} tone="blue" onPress={() => setFilter(null)} />
          ) : null}
        </View>

        {sorted.length === 0 ? (
          <EydEmpty
            icon="cash-outline"
            title={filter ? 'Nothing in this category' : 'No expenses yet'}
            body={
              filter
                ? 'Record an expense for this category to see it here.'
                : 'Start recording expenses to track where your budget goes.'
            }
            actionLabel="Add expense"
            onAction={openAdd}
          />
        ) : (
          sorted.map((expense) => (
            <Pressable
              key={expense.id}
              onPress={() => openEdit(expense)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${expense.title}`}
              style={({ pressed }) => [
                styles.expRow,
                { borderColor: t.border, backgroundColor: pressed ? t.surfaceAlt : t.surface },
              ]}>
              <View style={styles.expText}>
                <EydText variant="subheading" numberOfLines={1}>
                  {expense.title}
                </EydText>
                <EydText variant="small" tone="secondary">
                  {BUDGET_CATEGORY_LABEL[expense.categoryId]} · {formatDayMonth(expense.date)}
                </EydText>
                {expense.note ? (
                  <EydText variant="small" tone="muted" numberOfLines={2}>
                    {expense.note}
                  </EydText>
                ) : null}
              </View>
              <EydText variant="subheading">{formatINR(expense.amount)}</EydText>
            </Pressable>
          ))
        )}
      </EydContainer>

      {/* ── Expense editor ── */}
      <EydSheet
        visible={!!draft}
        eyebrow={isNew ? 'New expense' : 'Edit expense'}
        title={draft?.title || 'Add expense'}
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
              <EydFieldLabel label="Category" />
              <View style={styles.chipWrap}>
                {BUDGET_CATEGORIES.map((cat) => (
                  <EydChip
                    key={cat.id}
                    label={cat.label}
                    tone="blue"
                    selected={draft.categoryId === cat.id}
                    onPress={() => setDraft({ ...draft, categoryId: cat.id })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Title" />
              <TextInput
                value={draft.title}
                onChangeText={(text) => {
                  setDraft({ ...draft, title: text });
                  setError(null);
                }}
                placeholder="e.g. Cement — 200 bags"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Amount (₹)" />
              <TextInput
                value={amountText}
                onChangeText={(text) => {
                  setAmountText(text.replace(/[^0-9]/g, ''));
                  setError(null);
                }}
                keyboardType="number-pad"
                placeholder="e.g. 45000"
                placeholderTextColor={t.textMuted}
                style={[styles.input, styles.inputAmount, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
              {Number(amountText) > 0 ? (
                <EydText variant="small" tone="blue">
                  {formatINR(Number(amountText))}
                </EydText>
              ) : null}
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Date" />
              <TextInput
                value={draft.date}
                onChangeText={(text) => {
                  setDraft({ ...draft, date: text });
                  setError(null);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={t.textMuted}
                style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
              />
              <EydText variant="small" tone="muted">
                Format: YYYY-MM-DD · falls back to today if invalid.
              </EydText>
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Notes (optional)" />
              <TextInput
                value={draft.note}
                onChangeText={(text) => setDraft({ ...draft, note: text })}
                multiline
                placeholder="e.g. Paid in full to supplier"
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
  stack: { gap: EyDSpacing.lg },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  catLabel: { flex: 1 },
  catAmount: { fontWeight: '700', textAlign: 'right', minWidth: 70 },
  catShare: { width: 40, textAlign: 'right' },
  listHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  listHeadText: { flex: 1 },
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  expText: { flex: 1, gap: 2 },
  field: { gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  inputAmount: { height: 56, fontSize: 22, fontWeight: '700' },
  inputMultiline: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top', fontSize: 15 },
  saveButton: { flex: 2 },
  deleteButton: { flex: 1 },
});
