import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EydIconBadge, EydText } from './ui';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { ALERT_KIND_META } from '@/lib/eyd/meta';
import { markAlertRead, useEyD } from '@/lib/eyd/store';
import type { EydAlert } from '@/lib/eyd/types';

/**
 * One alert line item. Tapping navigates to the alert's route (when set)
 * and marks it read in local state.
 */
export function EydAlertRow({ alert, unread }: { alert: EydAlert; unread?: boolean }) {
  const t = useEyDTheme();
  const router = useRouter();
  const { update } = useEyD();
  const meta = ALERT_KIND_META[alert.kind];
  const eyebrowTone = meta.tone === 'neutral' ? 'secondary' : meta.tone;

  const open = () => {
    if (!alert.route) return;
    update((draft) => markAlertRead(draft, alert.id));
    router.push(alert.route);
  };

  return (
    <Pressable
      onPress={open}
      disabled={!alert.route}
      accessibilityRole="button"
      accessibilityLabel={alert.title}
      style={({ pressed }) => [
        styles.row,
        { borderColor: t.border, backgroundColor: pressed ? t.surfaceAlt : t.surface },
        unread && { borderColor: t.blue },
      ]}>
      <EydIconBadge icon={meta.icon} tone={meta.tone} />
      <View style={styles.text}>
        <EydText variant="eyebrow" tone={eyebrowTone}>
          {meta.label}
        </EydText>
        <EydText variant="subheading">{alert.title}</EydText>
        <EydText variant="small" tone="secondary">
          {alert.body}
        </EydText>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: t.blue }]} /> : null}
      {alert.route ? <Ionicons name="chevron-forward" size={16} color={t.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  text: { flex: 1, gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
