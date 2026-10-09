import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EydContainer, EydHeaderBar, EydScreen } from '@/components/eyd/screen';
import {
  EydCard,
  EydChip,
  EydIconBadge,
  EydRow,
  EydSyncPill,
  EydText,
} from '@/components/eyd/ui';
import { EyDSpacing } from '@/constants/eyd';
import { Fonts } from '@/constants/theme';
import { useEyDTheme } from '@/hooks/use-eyd-theme';
import { uid } from '@/lib/eyd/format';
import { answer, SUGGESTED_QUESTIONS, type IntelligenceAnswer } from '@/lib/eyd/intelligence';
import { useEyD } from '@/lib/eyd/store';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  result?: IntelligenceAnswer;
}

export default function IntelligenceScreen() {
  const router = useRouter();
  const t = useEyDTheme();
  const { state } = useEyD();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);

  const header = <EydHeaderBar title="EYD Intelligence" onBack={() => router.back()} right={<EydSyncPill />} />;

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    setInput('');
    setPending(true);
    setMessages((prev) => [...prev, { id: uid('m'), role: 'user', text: q }]);
    const result = await answer(q, state);
    setMessages((prev) => [...prev, { id: uid('m'), role: 'assistant', text: q, result }]);
    setPending(false);
  };

  return (
    <EydScreen
      header={header}
      footer={
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => ask(input)}
            placeholder="Ask about budget, schedule, quotes…"
            placeholderTextColor={t.textMuted}
            returnKeyType="send"
            style={[styles.input, { backgroundColor: t.surfaceAlt, color: t.text }]}
          />
          <Pressable
            onPress={() => ask(input)}
            disabled={pending || !input.trim()}
            accessibilityLabel="Send"
            style={[
              styles.sendBtn,
              { backgroundColor: pending || !input.trim() ? t.surfaceAlt : t.blue },
            ]}>
            <Ionicons name="send" size={16} color={pending || !input.trim() ? t.textMuted : t.onBlue} />
          </Pressable>
        </View>
      }>
      <EydContainer style={styles.stack}>
        <EydCard tone="blueSoft">
          <EydText variant="small" tone="secondary">
            Answers are computed locally from this device&apos;s project data — no network, no account. Sample heuristics, not financial advice.
          </EydText>
        </EydCard>

        {messages.length === 0 ? (
          <EydCard style={styles.intro}>
            <EydIconBadge icon="bulb-outline" tone="blue" size={44} />
            <EydText variant="subheading">Ask EYD anything about your project</EydText>
            <EydText variant="small" tone="secondary">
              Budget, schedule, quotations and next steps — answered from your own data.
            </EydText>
          </EydCard>
        ) : null}

        {messages.map((m) =>
          m.role === 'user' ? (
            <View key={m.id} style={styles.userRow}>
              <View style={[styles.userBubble, { backgroundColor: t.blue }]}>
                <EydText variant="small" tone="onBlue">
                  {m.text}
                </EydText>
              </View>
            </View>
          ) : (
            <EydCard key={m.id} style={styles.answerCard}>
              <EydText variant="eyebrow" tone="blue">
                EYD
              </EydText>
              <EydText variant="subheading">{m.result?.headline}</EydText>
              {m.result && m.result.metrics.length > 0 ? (
                <View style={styles.metrics}>
                  {m.result.metrics.map((metric) => (
                    <EydRow key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />
                  ))}
                </View>
              ) : null}
              <View style={styles.recCard}>
                <EydText variant="small" tone="secondary">
                  {m.result?.recommendation}
                </EydText>
              </View>
              <EydText variant="small" tone="muted">
                Computed from your data · offline
              </EydText>
            </EydCard>
          ),
        )}

        {pending ? (
          <EydCard style={styles.pendingCard}>
            <EydText variant="small" tone="secondary">
              Thinking…
            </EydText>
          </EydCard>
        ) : null}

        <View style={styles.suggestions}>
          {(messages.length === 0
            ? [...SUGGESTED_QUESTIONS]
            : [...SUGGESTED_QUESTIONS, 'How much have I paid so far?']
          ).map((q) => (
            <EydChip key={q} label={q} tone="blue" onPress={() => ask(q)} />
          ))}
        </View>
      </EydContainer>
    </EydScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: EyDSpacing.md },
  intro: { gap: 8, alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  userBubble: { maxWidth: '85%', borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 9 },
  answerCard: { gap: 8 },
  metrics: { gap: 2 },
  recCard: { backgroundColor: '#E9F0FE', borderRadius: 12, padding: 12 },
  pendingCard: { paddingVertical: 14 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: Fonts.sans,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});