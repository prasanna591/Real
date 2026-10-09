import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { EyDRadius, EyDSpacing, type EyDTone, type EyDTokens } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { useOffline } from '@/lib/network';

/* ─── Text ─── */

export type EyDVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'small'
  | 'eyebrow'
  | 'metric';

export type EyDTextTone = 'text' | 'secondary' | 'muted' | 'blue' | 'onBlue' | 'success' | 'warning' | 'danger' | 'warm';

interface EydTextProps {
  children: React.ReactNode;
  variant?: EyDVariant;
  tone?: EyDTextTone;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
}

export function EydText({
  children,
  variant = 'body',
  tone = 'text',
  style,
  numberOfLines,
  align,
  uppercase,
}: EydTextProps) {
  const t = useEyDTheme();
  const color =
    tone === 'secondary'
      ? t.textSecondary
      : tone === 'muted'
        ? t.textMuted
        : tone === 'blue'
          ? t.blue
          : tone === 'onBlue'
            ? t.onBlue
            : tone === 'success'
              ? t.success
              : tone === 'warning'
                ? t.warning
                : tone === 'danger'
                  ? t.danger
                  : tone === 'warm'
                    ? t.warm
                    : t.text;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[styles[variant], { color }, uppercase && styles.uppercase, align && { textAlign: align }, style]}>
      {children}
    </Text>
  );
}

/* ─── Card ─── */

interface EydCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'surface' | 'alt' | 'blueSoft' | 'warmSoft';
}

export function EydCard({ children, style, padded = true, tone = 'surface' }: EydCardProps) {
  const t = useEyDTheme();
  const background =
    tone === 'alt' ? t.surfaceAlt : tone === 'blueSoft' ? t.blueSoft : tone === 'warmSoft' ? t.warmSoft : t.surface;

  return (
    <View
      style={[
        styles.card,
        padded && styles.cardPadded,
        { backgroundColor: background, borderColor: t.border },
        style,
      ]}>
      {children}
    </View>
  );
}

/* ─── Section header ─── */

interface EydSectionTitleProps {
  title: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EydSectionTitle({ title, caption, actionLabel, onAction }: EydSectionTitleProps) {
  const t = useEyDTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionText}>
        <EydText variant="eyebrow" tone="secondary">
          {title}
        </EydText>
        {caption ? (
          <EydText variant="small" tone="muted" style={styles.sectionCaption}>
            {caption}
          </EydText>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <EydText variant="small" tone="blue" style={styles.sectionAction}>
            {actionLabel}
          </EydText>
        </Pressable>
      ) : null}
      <View style={[styles.sectionUnderline, { backgroundColor: t.border }]} />
    </View>
  );
}

/* ─── Button ─── */

interface EydButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
}

export function EydButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  size = 'md',
  style,
}: EydButtonProps) {
  const t = useEyDTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary'
      ? t.blue
      : variant === 'danger'
        ? t.danger
        : variant === 'secondary'
          ? t.surfaceAlt
          : 'transparent';
  const fg = variant === 'primary' || variant === 'danger' ? t.onBlue : variant === 'ghost' ? t.blue : t.text;
  const border = variant === 'ghost' ? t.border : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        { backgroundColor: bg, borderColor: border, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
          <Text style={[size === 'sm' ? styles.buttonLabelSm : styles.buttonLabel, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ─── Chip ─── */

interface EydChipProps {
  label: string;
  tone?: EyDTone;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

const TONE_KEYS: Record<EyDTone, { bg: keyof EyDTokens; fg: keyof EyDTokens }> = {
  neutral: { bg: 'surfaceAlt', fg: 'text' },
  blue: { bg: 'blueSoft', fg: 'blue' },
  success: { bg: 'successSoft', fg: 'success' },
  warning: { bg: 'warningSoft', fg: 'warning' },
  danger: { bg: 'dangerSoft', fg: 'danger' },
  warm: { bg: 'warmSoft', fg: 'warm' },
};

export function EydChip({ label, tone = 'neutral', selected, onPress, icon }: EydChipProps) {
  const t = useEyDTheme();
  const keys = TONE_KEYS[tone];
  const bg = selected ? t.blue : t[keys.bg];
  const fg = selected ? t.onBlue : t[keys.fg];

  const content = (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={[styles.chipLabel, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }}>
      {content}
    </Pressable>
  );
}

/* ─── Progress ─── */

interface EydProgressProps {
  value: number;
  tone?: 'blue' | 'success' | 'warning' | 'danger';
  height?: number;
  showLabel?: boolean;
}

export function EydProgress({ value, tone = 'blue', height = 8, showLabel }: EydProgressProps) {
  const t = useEyDTheme();
  const pct = Math.max(0, Math.min(100, value));
  const color = tone === 'success' ? t.success : tone === 'warning' ? t.warning : tone === 'danger' ? t.danger : t.blue;

  return (
    <View style={styles.progressRow}>
      <View style={[styles.progressTrack, { height, backgroundColor: t.surfaceAlt }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color, height }]} />
      </View>
      {showLabel ? (
        <EydText variant="small" tone="secondary" style={styles.progressLabel}>
          {Math.round(pct)}%
        </EydText>
      ) : null}
    </View>
  );
}

/* ─── Sync status ─── */

export function EydSyncPill({ compact }: { compact?: boolean }) {
  const t = useEyDTheme();
  const { isOffline } = useOffline();
  const label = isOffline ? 'OFFLINE' : 'SYNCED';
  const color = isOffline ? t.warning : t.success;
  const bg = isOffline ? t.warningSoft : t.successSoft;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={`Status ${label}`}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      {!compact ? (
        <Text style={[styles.pillLabel, { color }]}>{label}</Text>
      ) : null}
    </View>
  );
}

/* ─── Icon badge ─── */

export function EydIconBadge({
  icon,
  tone = 'blue',
  size = 36,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: EyDTone;
  size?: number;
}) {
  const t = useEyDTheme();
  const bg =
    tone === 'success'
      ? t.successSoft
      : tone === 'warning'
        ? t.warningSoft
        : tone === 'danger'
          ? t.dangerSoft
          : tone === 'warm'
            ? t.warmSoft
            : tone === 'neutral'
              ? t.surfaceAlt
              : t.blueSoft;
  const fg =
    tone === 'success'
      ? t.success
      : tone === 'warning'
        ? t.warning
        : tone === 'danger'
          ? t.danger
          : tone === 'warm'
            ? t.warm
            : tone === 'neutral'
              ? t.textSecondary
              : t.blue;

  return (
    <View style={[styles.iconBadge, { backgroundColor: bg, width: size, height: size, borderRadius: size / 3 }]}>
      <Ionicons name={icon} size={Math.round(size * 0.47)} color={fg} />
    </View>
  );
}

/* ─── Empty state ─── */

export function EydEmpty({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <EydIconBadge icon={icon} size={48} />
      <EydText variant="heading" style={styles.emptyTitle}>
        {title}
      </EydText>
      <EydText variant="small" tone="secondary" align="center">
        {body}
      </EydText>
      {actionLabel && onAction ? (
        <EydButton label={actionLabel} onPress={onAction} variant="secondary" size="sm" style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

/* ─── Row (label + value) ─── */

export function EydRow({ label, value, tone }: { label: string; value: string; tone?: EyDTextTone }) {
  return (
    <View style={styles.kvRow}>
      <EydText variant="small" tone="secondary">
        {label}
      </EydText>
      <EydText variant="small" tone={tone ?? 'text'} style={styles.kvValue}>
        {value}
      </EydText>
    </View>
  );
}

/* ─── Field label (forms) ─── */

export function EydFieldLabel({ label }: { label: string }) {
  return (
    <EydText variant="small" tone="secondary" style={styles.fieldLabel}>
      {label}
    </EydText>
  );
}

const styles = StyleSheet.create({
  display: { fontFamily: Fonts.sans, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontFamily: Fonts.sans, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontFamily: Fonts.sans, fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  small: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metric: { fontFamily: Fonts.sans, fontSize: 28, lineHeight: 32, fontWeight: '700', letterSpacing: -0.6 },
  uppercase: { textTransform: 'uppercase' },

  card: {
    borderRadius: EyDRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...(Platform.select({
      web: { boxShadow: '0 1px 2px rgba(11,31,58,0.05)' },
      ios: {
        shadowColor: '#0B1F3A',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
    }) as object),
  },
  cardPadded: { padding: EyDSpacing.lg },

  sectionRow: { marginBottom: EyDSpacing.md },
  sectionText: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  sectionCaption: { flexShrink: 1 },
  sectionAction: { fontWeight: '700' },
  sectionUnderline: { height: StyleSheet.hairlineWidth, marginTop: EyDSpacing.sm },

  button: {
    minHeight: 48,
    borderRadius: EyDRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: EyDSpacing.lg,
    paddingVertical: EyDSpacing.sm,
  },
  buttonSm: { minHeight: 38, paddingHorizontal: EyDSpacing.md },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonLabel: { fontFamily: Fonts.sans, fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  buttonLabelSm: { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '700' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: EyDRadius.pill,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  chipLabel: { fontFamily: Fonts.sans, fontSize: 12.5, fontWeight: '700', flexShrink: 1 },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressTrack: { flex: 1, borderRadius: EyDRadius.pill, overflow: 'hidden' },
  progressFill: { borderRadius: EyDRadius.pill },
  progressLabel: { minWidth: 34, textAlign: 'right', fontWeight: '700' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: EyDRadius.pill,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillLabel: { fontFamily: Fonts.sans, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },

  iconBadge: { alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 },
  emptyTitle: { textAlign: 'center' },
  emptyAction: { marginTop: 6, minWidth: 180 },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 },
  kvValue: { fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  fieldLabel: { fontWeight: '700' },
});
