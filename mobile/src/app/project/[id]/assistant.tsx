import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Bubble,
  Composer,
  GiftedChat,
  InputToolbar,
  Send,
  type IMessage,
  type Reply,
  type User,
} from 'react-native-gifted-chat';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSaved } from '@/hooks/use-saved';
import { getAnalyticsSessionId } from '@/lib/analytics';
import { sendAssistantChat } from '@/services/api';
import type { ChatTurn } from '@/types/api';

const BOT_USER: User = { _id: 'assistant', name: 'Property Assistant' };

const SUGGESTIONS = {
  type: 'radio' as const,
  keepIt: true,
  values: [
    { title: 'Is this good for a family?', value: 'Is this good for a family with two children?' },
    { title: "What's the EMI?", value: "What's the EMI for the starting price?" },
    { title: 'Units under ₹1.5 Cr', value: 'Show me units under 1.5 crore' },
    { title: 'Best balcony view', value: 'Which unit has the best balcony view?' },
  ],
};

function messageId(seed: number): string {
  return `${seed}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanReply(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').trim();
}

export default function AssistantScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string; unit?: string; projectName?: string }>();
  const projectId = Number(params.id);
  const { user: sessionUser } = useSaved();

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const historyRef = useRef<ChatTurn[]>([]);
  const idSeed = useRef(0);

  const currentUser: User = useMemo(
    () =>
      sessionUser
        ? { _id: `user-${sessionUser.id}`, name: sessionUser.name }
        : { _id: 'guest', name: 'You' },
    [sessionUser],
  );

  useEffect(() => {
    const greeting =
      `Hi${sessionUser ? ` ${sessionUser.name.split(' ')[0]}` : ''}! I'm your AI property assistant` +
      (params.projectName ? ` for ${params.projectName}` : '') +
      '. All answers come from live listing data — ask me about pricing, EMI, family fit, views or availability.';
    setMessages([
      {
        _id: messageId(idSeed.current++),
        text: greeting,
        createdAt: Date.now(),
        user: BOT_USER,
        quickReplies: SUGGESTIONS,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushAssistantReply = useCallback((text: string, withSuggestions: boolean) => {
    setMessages(prev =>
      GiftedChat.append(prev, [
        {
          _id: messageId(idSeed.current++),
          text: cleanReply(text),
          createdAt: Date.now(),
          user: BOT_USER,
          ...(withSuggestions ? { quickReplies: SUGGESTIONS } : {}),
        },
      ]),
    );
  }, []);

  const requestReply = useCallback(
    async (userText: string) => {
      setIsTyping(true);
      try {
        const sessionId = await getAnalyticsSessionId();
        const result = await sendAssistantChat(historyRef.current, projectId, sessionId);
        historyRef.current = [...historyRef.current, { role: 'assistant', content: result.reply }];
        pushAssistantReply(result.reply, true);
      } catch {
        pushAssistantReply(
          'Sorry, I could not reach the listing database just now. Please try again in a moment.',
          false,
        );
      } finally {
        setIsTyping(false);
      }
    },
    [projectId, pushAssistantReply],
  );

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      const sent = newMessages[0];
      if (!sent) return;
      setMessages(prev => GiftedChat.append(prev, newMessages));
      historyRef.current = [...historyRef.current, { role: 'user', content: sent.text }];
      await requestReply(sent.text);
    },
    [requestReply],
  );

  const onQuickReply = useCallback(
    (replies: Reply[]) => {
      const value = replies[0]?.value;
      if (!value) return;
      void onSend([
        {
          _id: messageId(idSeed.current++),
          text: value,
          createdAt: Date.now(),
          user: currentUser,
        },
      ]);
    },
    [onSend, currentUser],
  );

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ title: params.unit ? `Ask · ${params.unit}` : 'AI Property Assistant' }} />
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
          <GiftedChat
            messages={messages}
            onSend={onSend}
            onQuickReply={onQuickReply}
            user={currentUser}
            isSendButtonAlwaysVisible
            isAvatarOnTop
            minInputToolbarHeight={56}
            quickReplyStyle={{
              backgroundColor: theme.backgroundSelected,
              borderRadius: Radius.sm,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border,
            }}
            quickReplyTextStyle={{ color: theme.primaryDark }}
            renderBubble={props => (
              <Bubble
                {...props}
                wrapperStyle={{
                  left: {
                    backgroundColor: theme.backgroundElement,
                    borderRadius: Radius.lg,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: theme.border,
                  },
                  right: {
                    backgroundColor: theme.primary,
                    borderRadius: Radius.lg,
                  },
                }}
                textStyle={{
                  left: { color: theme.text },
                  right: { color: '#FFFFFF' },
                }}
              />
            )}
            renderInputToolbar={props => (
              <InputToolbar
                {...props}
                containerStyle={{
                  backgroundColor: theme.backgroundElement,
                  borderTopColor: theme.border,
                }}
              />
            )}
            renderComposer={props => (
              <Composer
                {...props}
                textInputProps={{
                  ...props.textInputProps,
                  placeholder: 'Ask about price, EMI, family fit…',
                  placeholderTextColor: theme.textSecondary,
                  selectionColor: theme.primary,
                }}
              />
            )}
            renderSend={props => (
              <Send
                {...props}
                containerStyle={{ justifyContent: 'center', paddingHorizontal: Spacing.two }}
                label="➤"
                textStyle={{ color: theme.primary, fontSize: 18 }}
              />
            )}
            renderChatFooter={() =>
              isTyping ? (
                <View style={[styles.typingRow]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Assistant is checking listings…
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.footerNote}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.footerText}>
                    Grounded in live listing data · not legal or financial advice
                  </ThemedText>
                </View>
              )
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  footerNote: {
    alignItems: 'center',
    paddingBottom: Spacing.one,
  },
  footerText: {
    fontSize: 10,
  },
});
