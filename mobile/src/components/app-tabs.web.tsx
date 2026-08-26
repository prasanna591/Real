import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', href: '/', label: 'Home', icon: 'home-outline' as const },
  { name: 'saved', href: '/saved', label: 'Saved', icon: 'heart-outline' as const },
  { name: 'account', href: '/account', label: 'Account', icon: 'person-outline' as const },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {TABS.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton label={tab.label} icon={tab.icon} />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

function TabButton({
  isFocused,
  label,
  icon,
  ...props
}: TabTriggerSlotProps & { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tabButton, pressed && { opacity: 0.7 }]}>
      <View style={[styles.iconWrap, isFocused && { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <ThemedText type="small" style={{ color, fontWeight: isFocused ? '700' : '500' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CustomTabList({ children, ...rest }: TabListProps & { children?: ReactNode }) {
  return (
    <View style={[styles.tabBarOuter]} pointerEvents="box-none">
      <View style={styles.tabBarSurface}>
        <View style={[styles.tabBarInner, { maxWidth: MaxContentWidth }]} {...rest}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarSurface: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: 'auto',
    width: '100%',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 10,
    cursor: 'pointer',
  },
  iconWrap: {
    width: 36,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
