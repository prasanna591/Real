import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { name: 'index', href: '/', label: 'Home', icon: 'home-outline' as const },
  { name: 'plan', href: '/plan', label: 'Plan', icon: 'compass-outline' as const },
  { name: 'project', href: '/project', label: 'Project', icon: 'business-outline' as const },
  { name: 'network', href: '/network', label: 'Network', icon: 'people-outline' as const },
  { name: 'account', href: '/account', label: 'Profile', icon: 'person-outline' as const },
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
  const theme = useTheme();
  return (
    <View style={[styles.tabBarOuter]} pointerEvents="box-none">
      <View
        style={[
          styles.tabBarSurface,
          {
            backgroundColor: `${theme.backgroundElement}E0`,
            borderTopColor: theme.border,
          },
        ]}>
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
    backdropFilter: 'blur(20px) saturate(180%)',
    borderTopWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
  } as any,
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
    gap: 3,
    paddingVertical: 10,
    cursor: 'pointer',
  },
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
