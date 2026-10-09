import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EydAlertRow } from '@/components/eyd/alert-row';
import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import {
  EydCard,
  EydEmpty,
  EydIconBadge,
  EydSectionTitle,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { relativeTime } from '@/lib/eyd/format';
import { ACTIVITY_KIND_META, ALERT_KIND_META } from '@/lib/eyd/meta';
import { buildAlerts, recentActivity } from '@/lib/eyd/selectors';
import { markAllAlertsRead, useEyD } from '@/lib/eyd/store';
import type { AlertKind } from '@/lib/eyd/types';

const ALERT_KIND_ORDER: AlertKind[] = ['budget', 'project_update', 'action_required', 'upcoming'];

export default function NotificationsScreen() {
  const router = useRouter();
  const { state, update } = useEyD();

  const alerts = buildAlerts(state);
  const activity = recentActivity(state, 20);
  const readSet = new Set(state.readAlertIds);
  const unreadCount = alerts.filter((a) => !readSet.has(a.id)).length;

  const groups = ALERT_KIND_ORDER.map((kind) => ({
    kind,
    items: alerts.filter((a) => a.kind === kind),
  })).filter((g) => g.items.length > 0);

  const header = <EydHeaderBar title="Notifications" onBack={() => router.back()} right={<EydSyncPill />} />;

  return (
    <EydScreen header={header}>
      <EydContainer style={styles.stack}>
        <EydSectionTitle
          title="Alerts"
          caption={
            alerts.length === 0
              ? 'Generated on this device from your project data.'
              : `${unreadCount} unread · generated on this device`
          }
          actionLabel={unreadCount > 0 ? 'Mark all as read' : undefined}
          onAction={unreadCount > 0 ? () => update((d) => markAllAlertsRead(d, alerts.map((a) => a.id))) : undefined}
        />

        {alerts.length === 0 ? (
          <EydEmpty
            icon="notifications-outline"
            title="You're all caught up"
            body="Budget, schedule and action alerts will show up here."
          />
        ) : (
          groups.map((g) => {
            const meta = ALERT_KIND_META[g.kind];
            const groupUnread = g.items.filter((a) => !readSet.has(a.id)).length;
            return (
              <View key={g.kind} style={styles.group}>
                <View style={styles.groupHead}>
                  <EydIconBadge icon={meta.icon} tone={meta.tone} size={28} />
                  <EydText variant="small" tone="secondary" style={styles.groupLabel}>
                    {meta.label}
                  </EydText>
                  <EydText variant="small" tone="muted">
                    {groupUnread > 0 ? `${groupUnread} unread` : `${g.items.length} total`}
                  </EydText>
                </View>
                {g.items.map((alert) => (
                  <EydAlertRow key={alert.id} alert={alert} unread={!readSet.has(alert.id)} />
                ))}
              </View>
            );
          })
        )}

        {/* ── Activity feed ── */}
        <EydSectionTitle title="Activity" caption="Everything that changed in this project, newest first." />
        {activity.length === 0 ? (
          <EydEmpty icon="time-outline" title="No activity yet" body="Expenses, payments and site updates will appear here." />
        ) : (
          activity.map((item) => {
            const meta = ACTIVITY_KIND_META[item.kind];
            return (
              <EydCard key={item.id} style={styles.activityCard}>
                <EydIconBadge icon={meta.icon} tone={meta.tone} size={30} />
                <View style={styles.activityText}>
                  <EydText variant="small">{item.text}</EydText>
                  <EydText variant="small" tone="muted">
                    {relativeTime(item.createdAt)}
                  </EydText>
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
  group: { gap: 4 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  groupLabel: { flex: 1, fontWeight: '700' },
  activityCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityText: { flex: 1, gap: 2 },
});