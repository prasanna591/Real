import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EydText, EydIconBadge } from './ui';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { EyDSpacing } from '@/constants/eyd';
import { useEyDTheme } from '@/hooks/use-eyd-theme';

interface EydScreenProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  scroll?: boolean;
  /** Adds room for the bottom tab bar (tab screens only). */
  underTabs?: boolean;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function EydScreen({ children, header, scroll = true, underTabs, footer, contentStyle }: EydScreenProps) {
  const t = useEyDTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = (underTabs ? BottomTabInset : insets.bottom) + 28;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, { paddingBottom: bottomPad }, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: t.bg }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {header ? <View style={[styles.header, { borderColor: t.border }]}>{header}</View> : null}
        <View style={styles.flex}>{body}</View>
        {footer ? (
          <View style={[styles.footer, { backgroundColor: t.surface, borderColor: t.border, paddingBottom: insets.bottom || 12 }]}>
            {footer}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

/** Centered content column — same max width as the marketplace screens. */
export function EydContainer({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.container, style]}>{children}</View>;
}

interface EydHeaderBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function EydHeaderBar({ title, onBack, right }: EydHeaderBarProps) {
  const t = useEyDTheme();
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.backButton, { backgroundColor: t.surfaceAlt }]}>
            <Ionicons name="chevron-back" size={20} color={t.text} />
          </Pressable>
        ) : null}
        {title ? (
          <EydText variant="heading" numberOfLines={1} style={styles.headerTitle}>
            {title}
          </EydText>
        ) : null}
      </View>
      {right ? <View style={styles.headerSide}>{right}</View> : null}
    </View>
  );
}

/** Full-bleed screen header with eyebrow + large title (used by tab roots). */
export function EydHero({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.heroRow}>
      <View style={styles.heroText}>
        {eyebrow ? (
          <EydText variant="eyebrow" tone="secondary">
            {eyebrow}
          </EydText>
        ) : null}
        <EydText variant="title" style={styles.heroTitle}>
          {title}
        </EydText>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

interface EydLinkRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: 'blue' | 'neutral' | 'success' | 'warning' | 'warm';
  badge?: string;
}

/** Navigable list row — used by the project hub and profile menus. */
export function EydLinkRow({ icon, title, subtitle, onPress, tone = 'neutral', badge }: EydLinkRowProps) {
  const t = useEyDTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.linkRow,
        { borderColor: t.border, backgroundColor: pressed ? t.surfaceAlt : t.surface },
      ]}>
      <EydIconBadge icon={icon} tone={tone} />
      <View style={styles.linkText}>
        <EydText variant="subheading" numberOfLines={1}>
          {title}
        </EydText>
        {subtitle ? (
          <EydText variant="small" tone="secondary" numberOfLines={2}>
            {subtitle}
          </EydText>
        ) : null}
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: t.blueSoft }]}>
          <EydText variant="small" tone="blue" style={styles.badgeText}>
            {badge}
          </EydText>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: EyDSpacing.lg,
    paddingVertical: EyDSpacing.sm,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 44,
  },
  headerSide: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  backButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flexShrink: 1 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: EyDSpacing.lg,
    paddingTop: EyDSpacing.md,
  },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: EyDSpacing.lg, gap: EyDSpacing.lg },
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroText: { flex: 1, gap: 4 },
  heroTitle: { textTransform: 'capitalize' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  linkText: { flex: 1, gap: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontWeight: '800', fontSize: 11 },
});
