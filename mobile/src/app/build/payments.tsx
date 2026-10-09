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
import { PAYMENT_STATUS_META } from '@/lib/eyd/meta';
import { BUDGET_CATEGORIES, BUDGET_CATEGORY_LABEL } from '@/lib/eyd/seed';
import { paymentTotals } from '@/lib/eyd/selectors';
import { logActivity, removePayment, savePayment, useEyD } from '@/lib/eyd/store';
import type { BudgetCategoryId, Payment, PaymentStatus } from '@/lib/eyd/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const todayISO = () => new Date().toISOString().slice(0, 10);
const STATUS_FILTERS: { id: PaymentStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'pending', label: 'Pending' },
  { id: 'failed', label: 'Failed' },
];

export default function PaymentsScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state, update } = useEyD();

  const totals = paymentTotals(state);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [draft, setDraft] = useState<Payment | null>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isNew = draft ? !state.payments.some((p) => p.id === draft.id) : false;
  const visible = statusFilter === 'all' ? state.payments : state.payments.filter((p) => p.status === statusFilter);
  const sorted = [...visible].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const header = <EydHeaderBar title="Payments" onBack={() => router.back()} right={<EydSyncPill />} />;

  const openAdd = () => {
    setDraft({
      id: uid('p'),
      amount: 0,
      date: todayISO(),
      description: '',
      status: 'pending',
      categoryId: null,
      createdAt: new Date().toISOString(),
    });
    setAmountText('');
    setError(null);
  };

  const openEdit = (payment: Payment) => {
    setDraft(payment);
    setAmountText(String(payment.amount));
    setError(null);
  };

  const closeEditor = () => setDraft(null);

  const save = () => {
    if (!draft) return;
    const description = draft.description.trim();
    const amount = Number(amountText.replace(/[^0-9]/g, ''));
    if (!description) {
      setError('Add a description for this payment.');
      return;
    }
    if (!(amount > 0)) {
      setError('Amount must be greater than 0.');
      return;
    }
    const record: Payment = {
      ...draft,
      description,
      amount,
      date: DATE_RE.test(draft.date) ? draft.date : todayISO(),
    };
    const exists = state.payments.some((p) => p.id === record.id);
    update((d) => {
      savePayment(d, record);
      logActivity(
        d,
        `${exists ? 'Payment updated' : 'Payment added'} — ${record.description} (${formatINR(record.amount)})`,
        'payment',
      );
    });
    closeEditor();
  };

  const confirmDelete = () => {
    if (!draft) return;
    const { id, description } = draft;
    Alert.alert('Delete payment?', `${description} — ${formatINR(Number(amountText.replace(/[^0-9]/g, '')) || 0)} will be removed from your payment history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          update((d) => {
            removePayment(d, id);
            logActivity(d, `Payment deleted — ${description}`, 'payment');
          });
          closeEditor();
        },
      },
    ]);
  };

  const budget = state.project.budgetTotal;
  const costTone = totals.total >= budget ? 'danger' : totals.total / budget >= 0.92 ? 'warning' : 'blue';

  return (
    <EydScreen
      header={header}
      footer={<EydButton label="Add payment" icon="add" onPress={openAdd} />}>
      <EydContainer style={styles.stack}>
        {/* ── Totals ── */}
        <EydCard style={styles.stack}>
          <EydText variant="eyebrow" tone="secondary">
            Total project cost
          </EydText>
          <EydText variant="metric">{formatINR(totals.total)}</EydText>
          <EydProgress value={totals.usedPct} showLabel height={10} tone={costTone} />
          <EydRow label="Paid" value={formatINR(totals.paid)} tone={totals.paid > 0 ? 'success' : 'text'} />
          <EydRow label="Pending" value={formatINR(totals.pending)} tone={totals.pending > 0 ? 'warning' : 'text'} />
          {totals.failed > 0 ? <EydRow label="Failed" value={formatINR(totals.failed)} tone="danger" /> : null}
        </EydCard>

        <EydCard tone="blueSoft">
          <EydText variant="small" tone="secondary">
            Payments are recorded here for tracking only — this is not a payment gateway. Actual settlement is handled by you, your contractor or the bank.
          </EydText>
        </EydCard>

        {/* ── Status filter ── */}
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => {
            const count =
              f.id === 'all' ? state.payments.length : state.payments.filter((p) => p.status === f.id).length;
            const selected = statusFilter === f.id;
            return (
              <EydChip
                key={f.id}
                label={`${f.label}${selected ? ` (${count})` : ''}`}
                tone={f.id === 'paid' ? 'success' : f.id === 'pending' ? 'warning' : f.id === 'failed' ? 'danger' : 'blue'}
                selected={selected}
                onPress={() => setStatusFilter(f.id)}
              />
            );
          })}
        </View>

        <EydSectionTitle title="Payment history" caption={`${sorted.length} of ${state.payments.length} payments`} />

        {sorted.length === 0 ? (
          <EydEmpty
            icon="card-outline"
            title={statusFilter === 'all' ? 'No payments yet' : `No ${statusFilter} payments`}
            body="Record payments to track what you have paid and what is still pending."
            actionLabel="Add payment"
            onAction={openAdd}
          />
        ) : (
          sorted.map((payment) => (
            <Pressable
              key={payment.id}
              onPress={() => openEdit(payment)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${payment.description}`}
              style={({ pressed }) => [
                styles.paymentRow,
                { borderColor: t.border, backgroundColor: pressed ? t.surfaceAlt : t.surface },
              ]}>
              <View style={styles.paymentText}>
                <EydText variant="subheading" numberOfLines={1}>
                  {payment.description}
                </EydText>
                <View style={styles.paymentMeta}>
                  <EydChip label={PAYMENT_STATUS_META[payment.status].label} tone={PAYMENT_STATUS_META[payment.status].tone} />
                  <EydText variant="small" tone="secondary" numberOfLines={1} style={styles.paymentSub}>
                    {payment.categoryId ? `${BUDGET_CATEGORY_LABEL[payment.categoryId]} · ` : ''}
                    {formatDayMonth(payment.date)}
                  </EydText>
                </View>
              </View>
              <EydText variant="subheading" tone={payment.status === 'paid' ? 'text' : payment.status === 'failed' ? 'danger' : 'warm'}>
                {formatINR(payment.amount)}
              </EydText>
            </Pressable>
          ))
        )}
      </EydContainer>

      {/* ── Payment editor ── */}
      <EydSheet
        visible={!!draft}
        eyebrow={isNew ? 'New payment' : 'Edit payment'}
        title={draft?.description || 'Add payment'}
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
              <EydFieldLabel label="Description" />
              <TextInput
                value={draft.description}
                onChangeText={(text) => {
                  setDraft({ ...draft, description: text });
                  setError(null);
                }}
                placeholder="e.g. Contractor interim invoice"
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
                placeholder="e.g. 250000"
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
              <EydFieldLabel label="Status" />
              <View style={styles.chipRow}>
                {(['paid', 'pending', 'failed'] as PaymentStatus[]).map((status) => (
                  <EydChip
                    key={status}
                    label={PAYMENT_STATUS_META[status].label}
                    tone={PAYMENT_STATUS_META[status].tone}
                    selected={draft.status === status}
                    onPress={() => setDraft({ ...draft, status })}
                  />
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <EydFieldLabel label="Category (optional)" />
              <View style={styles.chipWrap}>
                <EydChip
                  label="None"
                  tone="blue"
                  selected={draft.categoryId === null}
                  onPress={() => setDraft({ ...draft, categoryId: null })}
                />
                {BUDGET_CATEGORIES.map((cat) => (
                  <EydChip
                    key={cat.id}
                    label={cat.label}
                    tone="blue"
                    selected={draft.categoryId === cat.id}
                    onPress={() => setDraft({ ...draft, categoryId: cat.id as BudgetCategoryId })}
                  />
                ))}
              </View>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  paymentText: { flex: 1, gap: 6 },
  paymentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  paymentSub: { flexShrink: 1 },
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
  inputAmount: { height: 56, fontSize: 22, fontWeight: '700' },
  saveButton: { flex: 2 },
  deleteButton: { flex: 1 },
});