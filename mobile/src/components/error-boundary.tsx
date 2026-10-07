import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ThemedView style={styles.container}>
          <ThemedText type="subtitle">Something went wrong</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.text}>
            We&apos;re sorry — an unexpected error occurred. Please restart the app or go back.
          </ThemedText>
          <ThemedText
            type="linkPrimary"
            onPress={() => this.setState({ hasError: false })}>
            Try again
          </ThemedText>
        </ThemedView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  text: {
    textAlign: 'center',
  },
});
