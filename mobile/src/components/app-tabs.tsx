import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, type ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const TabIcon =
    (icon: IconName, selectedIcon: IconName) =>
    function TabIconInner({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
      return <Ionicons name={focused ? selectedIcon : icon} size={size} color={color} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.backgroundElement },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: TabIcon('home-outline', 'home') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarLabel: 'Plan', tabBarIcon: TabIcon('compass-outline', 'compass') }} />
      <Tabs.Screen name="project" options={{ title: 'Project', tabBarLabel: 'Project', tabBarIcon: TabIcon('business-outline', 'business') }} />
      <Tabs.Screen name="network" options={{ title: 'Network', tabBarLabel: 'Network', tabBarIcon: TabIcon('people-outline', 'people') }} />
      <Tabs.Screen name="account" options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: TabIcon('person-outline', 'person') }} />
    </Tabs>
  );
}
