import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import {
  EydButton,
  EydCard,
  EydChip,
  EydEmpty,
  EydFieldLabel,
  EydRow,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { formatDayMonth, formatINR } from '@/lib/eyd/format';
import { QUOTATION_STATUS_META } from '@/lib/eyd/meta';
import { BUDGET_CATEGORY_LABEL } from '@/lib/eyd/seed';
import { logActivity, setQuotationStatus, useEyD } from '@/lib/eyd/store';

export default function QuotationDetailScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, update } = useEyD();

  const quote = state.quotations.find((q) => q.id === id);

  const header = <EydHeaderBar title="Quotation" onBack={() => router.back()} right={<EydSyncPill />} />;

  if (!quote) {
    return (
      <EydScreen header={header}>
        <EydContainer>
          <EydEmpty icon="documents-outline" title="Quotation not found" body="This quotation may have been deleted." />
        </EydContainer>
      </EydScreen>
    );
  }

  const vendor = quote.vendorId ? state.professionals.find((p) => p.id === quote.vendorId) : undefined;
  const status = QUOTATION_STATUS_META[quote.status];

  const accept = () => {
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

  const reject = () => {
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
      footer={
        <View style={styles.footer}>
          <EydButton label="Accept" onPress={accept} disabled={quote.status === 'accepted'} style={styles.footerBtn} />
          <EydButton label="Reject" variant="danger" onPress={reject} disabled={quote.status === 'rejected'} style={styles.footerBtn} />
        </View>
      }>
      <EydContainer style={styles.stack}>
        <EydCard style={styles.stack}>
          <View style={styles.topRow}>
            <View style={styles.topText}>
              <EydText variant="title" numberOfLines={1}>
                {quote.vendorName}
              </EydText>
              <EydText variant="body" tone="secondary">
                {quote.scope}
              </EydText>
            </View>
            <EydChip label={status.label} tone={status.tone} />
          </View>
          <View style={styles.metaRow}>
            <EydText variant="small" tone="muted">
              {formatDayMonth(quote.date)}
            </EydText>
            {quote.categoryId ? <EydChip label={BUDGET_CATEGORY_LABEL[quote.categoryId]} tone="blue" /> : null}
            {vendor ? <EydChip label="From your network" tone="success" /> : null}
          </View>
        </EydCard>

        <EydSectionTitle title="Quotation summary" caption="Totals computed from the BOQ below." />
        <EydCard style={styles.stack}>
          <EydRow label="Line items" value={`${quote.items.length}`} />
          <EydRow label="Quoted total" value={formatINR(quote.total)} tone="blue" />
        </EydCard>

        <EydSectionTitle title="BOQ line items" caption="Item · qty · rate → total" />
        <EydCard padded={false}>
          <View style={[styles.boqHead, { borderBottomColor: t.border }]}>
            <EydText variant="small" tone="secondary" style={styles.boqItem}>
              Item
            </EydText>
            <EydText variant="small" tone="secondary" style={styles.boqQty}>
              Qty
            </EydText>
            <EydText variant="small" tone="secondary" style={styles.boqRate}>
              Rate
            </EydText>
            <EydText variant="small" tone="secondary" style={styles.boqTotal}>
              Total
            </EydText>
          </View>
          {quote.items.map((it, i) => (
            <View key={`${it.item}-${i}`} style={[styles.boqRow, { borderBottomWidth: i === quote.items.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
              <EydText variant="small" style={styles.boqItem} numberOfLines={2}>
                {it.item}
              </EydText>
              <EydText variant="small" tone="secondary" style={styles.boqQty}>
                {it.qty} {it.unit}
              </EydText>
              <EydText variant="small" tone="secondary" style={styles.boqRate}>
                {formatINR(it.unitPrice)}
              </EydText>
              <EydText variant="small" style={styles.boqTotal}>
                {formatINR(it.total)}
              </EydText>
            </View>
          ))}
          <View style={[styles.boqRow, styles.boqSumRow]}>
            <EydText variant="small" tone="secondary" style={styles.boqItem}>
              Total
            </EydText>
            <View style={styles.boqQty} />
            <View style={styles.boqRate} />
            <EydText variant="subheading" style={styles.boqTotal}>
              {formatINR(quote.total)}
            </EydText>
          </View>
        </EydCard>

        {quote.notes ? (
          <>
            <EydSectionTitle title="Notes" />
            <EydCard>
              <EydFieldLabel label="From the vendor" />
              <EydText variant="body">{quote.notes}</EydText>
            </EydCard>
          </>
        ) : null}

        <EydText variant="small" tone="muted" align="center">
          Sample quotation — mock vendor data for this demo, not a real offer.
        </EydText>
      </EydContainer>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  topText: { flex: 1, gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  boqHead: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  boqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  boqSumRow: { backgroundColor: '#EDF1F7', borderBottomWidth: 0, alignItems: 'center', paddingVertical: 12 },
  boqItem: { flex: 2.4 },
  boqQty: { flex: 1 },
  boqRate: { flex: 1, textAlign: 'right' },
  boqTotal: { flex: 1.2, textAlign: 'right', fontWeight: '700' },
  footer: { flexDirection: 'row', gap: EyDSpacing.md },
  footerBtn: { flex: 1 },
});