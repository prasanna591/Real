import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EydAlertRow } from '@/components/eyd/alert-row';
import { EydContainer, EydHeaderBar, EydLinkRow, EydScreen } from '@/components/eyd/screen';
import {
  EydButton,
  EydCard,
  EydChip,
  EydIconBadge,
  EydProgress,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { formatINRShort, relativeTime } from '@/lib/eyd/format';
import { ACTIVITY_KIND_META } from '@/lib/eyd/meta';
import { HOME_TYPE_LABELS, SCOPE_LABELS } from '@/lib/eyd/seed';
import {
  budgetTotals,
  buildAlerts,
  currentStage,
  nextAction,
  overallProgress,
  paymentTotals,
  recentActivity,
  teamMembers,
  timeline,
} from '@/lib/eyd/selectors';
import { useEyD } from '@/lib/eyd/store';

export default function ProjectOverview() {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useEyD();

  const totals = budgetTotals(state);
  const payments = paymentTotals(state);
  const team = teamMembers(state);
  const progress = overallProgress(state);
  const stage = currentStage(state);
  const tl = timeline(state);
  const action = nextAction(state);
  const activity = recentActivity(state, 5);
  const alerts = buildAlerts(state);
  const readSet = new Set(state.readAlertIds);
  const unread = alerts.filter((a) => !readSet.has(a.id));
  const stageIdx = state.stages.findIndex((s) => s.id === (stage?.id ?? ''));

  const header = (
    <EydHeaderBar
      title="Project dashboard"
      onBack={pathname === '/build' ? () => router.back() : undefined}
      right={<EydSyncPill compact />}
    />
  );

  return (
    <EydScreen header={header}>
      <EydContainer style={styles.stack}>
        {/* ── Hero: who / where ── */}
        <EydCard style={styles.stack}>
          <View style={styles.heroTop}>
            <View style={styles.heroText}>
              <EydText variant="eyebrow" tone="blue">
                {state.project.scope ? SCOPE_LABELS[state.project.scope] : 'Home project'}
                {state.project.homeType ? ` · ${HOME_TYPE_LABELS[state.project.homeType]}` : ''}
              </EydText>
              <EydText variant="title">{state.project.name}</EydText>
            </View>
            <EydChip label={`${progress}%`} tone="blue" />
          </View>
          <EydProgress value={progress} height={10} />
          <View style={styles.heroMeta}>
            <EydText variant="small" tone="secondary">
              Stage {stageIdx >= 0 ? stageIdx + 1 : '—'} of {state.stages.length}
              {stage ? ` · ${stage.label}` : ''}
            </EydText>
            <EydChip
              label={tl.label}
              tone={tl.tone}
            />
          </View>
        </EydCard>

        {/* ── Money + schedule at a glance ── */}
        <View style={styles.statRow}>
          <EydCard style={[styles.statCard, styles.statGrow]}>
            <EydText variant="eyebrow" tone="secondary">
              Budget
            </EydText>
            <EydText variant="metric" numberOfLines={1}>
              {formatINRShort(totals.spent)}
            </EydText>
            <EydText variant="small" tone="secondary">
              of {formatINRShort(totals.total)} ·{' '}
              <EydText variant="small" tone={totals.remaining <= 0 ? 'danger' : 'success'}>
                {formatINRShort(Math.max(0, totals.remaining))} left
              </EydText>
            </EydText>
          </EydCard>

          <EydCard style={[styles.statCard, styles.statGrow]}>
            <EydText variant="eyebrow" tone="secondary">
              Timeline
            </EydText>
            <EydChip label={tl.label} tone={tl.tone} />
            <EydText variant="small" tone="secondary">
              {tl.detail}
            </EydText>
          </EydCard>
        </View>

        {/* ── Next action ── */}
        <EydCard tone="blueSoft" style={styles.stack}>
          <EydText variant="eyebrow" tone="blue">
            Next action
          </EydText>
          <EydText variant="heading">{action.title}</EydText>
          <EydText variant="small" tone="secondary">
            {action.detail}
          </EydText>
          <EydButton
            label={action.cta}
            icon="arrow-forward"
            onPress={() => router.push(action.route)}
            style={styles.actionButton}
          />
        </EydCard>

        {/* ── Alerts ── */}
        <EydSectionTitle
          title="Important alerts"
          caption={alerts.length === 0 ? 'Nothing needs attention.' : `${unread.length} of ${alerts.length} unread`}
          actionLabel={alerts.length > 0 ? 'View all' : undefined}
          onAction={() => router.push('/build/notifications')}
        />
        <View style={styles.stack}>
          {(unread.length > 0 ? unread : alerts).slice(0, 4).map((alert) => (
            <EydAlertRow key={alert.id} alert={alert} unread={!readSet.has(alert.id)} />
          ))}
        </View>

        {/* ── Recent activity ── */}
        <EydSectionTitle title="Recent activity" caption="Latest changes on this project." />
        {activity.length === 0 ? (
          <EydCard>
            <EydText variant="small" tone="secondary">
              No activity yet. Expenses, payments and site updates will appear here.
            </EydText>
          </EydCard>
        ) : (
          <EydCard style={styles.activityCard}>
            {activity.map((item) => {
              const meta = ACTIVITY_KIND_META[item.kind];
              return (
                <View key={item.id} style={styles.activityRow}>
                  <EydIconBadge icon={meta.icon} tone={meta.tone} size={32} />
                  <View style={styles.activityText}>
                    <EydText variant="small">{item.text}</EydText>
                    <EydText variant="small" tone="muted">
                      {relativeTime(item.createdAt)}
                    </EydText>
                  </View>
                </View>
              );
            })}
          </EydCard>
        )}

        {/* ── Quick links ── */}
        <EydSectionTitle title="Project sections" />
        <View style={styles.stack}>
          <EydLinkRow
            icon="wallet-outline"
            title="Budget"
            subtitle={`${Math.round(totals.usedPct)}% used · ${formatINRShort(Math.max(0, totals.remaining))} left`}
            onPress={() => router.push('/build/budget')}
          />
          <EydLinkRow
            icon="map-outline"
            title="Roadmap"
            subtitle={stage ? `Stage ${stageIdx + 1} of ${state.stages.length} · ${stage.label}` : 'View all stages'}
            onPress={() => router.push('/build/roadmap')}
          />
          <EydLinkRow
            icon="trending-up-outline"
            title="Progress"
            subtitle={`${progress}% overall · ${state.progressUpdates.length} site update${state.progressUpdates.length === 1 ? '' : 's'}`}
            onPress={() => router.push('/build/progress')}
          />
          <EydLinkRow
            icon="people-outline"
            title="Professionals"
            subtitle={
              team.length > 0
                ? `${team.length} on your team${state.professionals.length > 0 ? ` · ${state.professionals.length} available` : ''}`
                : `${state.professionals.length} professionals to explore`
            }
            onPress={() => router.push('/build/network')}
          />
          <EydLinkRow
            icon="cube-outline"
            title="Materials"
            subtitle={
              state.projectMaterials.length > 0
                ? `${state.projectMaterials.length} in your list · ${state.materials.length} in catalogue`
                : `${state.materials.length} catalogue items · ${state.materials.filter((m) => m.availability === 'in_stock').length} in stock`
            }
            onPress={() => router.push('/build/materials')}
          />
          <EydLinkRow
            icon="documents-outline"
            title="Quotations"
            subtitle={
              state.quotations.length > 0
                ? `${state.quotations.length} quotation${state.quotations.length === 1 ? '' : 's'} · ${state.quotations.filter((q) => q.status === 'received').length} received`
                : 'Record vendor quotes to compare'
            }
            onPress={() => router.push('/build/quotations')}
          />
          <EydLinkRow
            icon="card-outline"
            title="Payments"
            subtitle={
              payments.paid > 0
                ? `₹${formatINRShort(payments.paid)} paid · ${payments.pending > 0 ? `₹${formatINRShort(payments.pending)} pending` : 'all settled'}`
                : 'No payments recorded'
            }
            onPress={() => router.push('/build/payments')}
          />
          <EydLinkRow
            icon="folder-open-outline"
            title="Documents"
            subtitle={
              state.documents.length > 0
                ? `${state.documents.length} files · ${state.documents.filter((d) => d.source === 'local').length} added by you`
                : 'Plans, bills and agreements'
            }
            onPress={() => router.push('/build/documents')}
          />
          <EydLinkRow
            icon="notifications-outline"
            title="Notifications"
            subtitle={unread.length > 0 ? `${unread.length} unread alert${unread.length === 1 ? '' : 's'}` : 'All caught up'}
            badge={unread.length > 0 ? String(unread.length) : undefined}
            onPress={() => router.push('/build/notifications')}
          />
          <EydLinkRow
            icon="bulb-outline"
            title="Ask EYD"
            subtitle="Budget, schedule and quotation answers from your data"
            tone="warm"
            onPress={() => router.push('/build/intelligence')}
          />
          <EydLinkRow
            icon="sparkles-outline"
            title="Home planner"
            subtitle="Edit requirements, budget and style"
            tone="warm"
            onPress={() => router.push('/plan')}
          />
          <EydLinkRow
            icon="book-outline"
            title="Home passport"
            subtitle="Your home's long-term record: care, payments, warranties"
            onPress={() => router.push('/build/passport')}
          />
        </View>

        <EydText variant="small" tone="muted" align="center" style={styles.footerNote}>
          Saved on this device · Works offline
        </EydText>
      </EydContainer>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  statRow: { flexDirection: 'row', gap: EyDSpacing.md, flexWrap: 'wrap' },
  statCard: { gap: 6, minWidth: 150 },
  statGrow: { flexGrow: 1, flexBasis: 150 },
  actionButton: { alignSelf: 'flex-start', marginTop: 4 },
  activityCard: { gap: 12 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityText: { flex: 1, gap: 1 },
  footerNote: { marginTop: 4 },
});
