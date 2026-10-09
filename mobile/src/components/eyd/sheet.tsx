import { Ionicons } from '@expo/vector-icons';
import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EydText } from './ui';
import { EyDSpacing } from '@/constants/eyd';
import { useEyDTheme } from '@/hooks/use-eyd-theme';

interface EydSheetProps {
  visible: boolean;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pinned action row (buttons) above the safe-area inset. */
  footer?: ReactNode;
}

/** Standard bottom sheet used by every editor/confirmation flow in EYD. */
export function EydSheet({ visible, title, eyebrow, onClose, children, footer }: EydSheetProps) {
  const t = useEyDTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: t.surface, paddingBottom: footer ? EyDSpacing.md : insets.bottom || 16 },
        ]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              {eyebrow ? (
                <EydText variant="eyebrow" tone="blue">
                  {eyebrow}
                </EydText>
              ) : null}
              <EydText variant="heading">{title}</EydText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[styles.closeButton, { backgroundColor: t.surfaceAlt }]}>
              <Ionicons name="chevron-down" size={20} color={t.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,31,58,0.45)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: EyDSpacing.lg,
    paddingTop: EyDSpacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: EyDSpacing.md },
  headerText: { flex: 1, gap: 2 },
  closeButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flexGrow: 0 },
  bodyContent: { gap: EyDSpacing.md, paddingBottom: EyDSpacing.sm },
  footer: { flexDirection: 'row', gap: EyDSpacing.md, paddingTop: EyDSpacing.md },
});
