import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BuilderAuthProvider } from '@/lib/builder-auth';
import { SessionProvider } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <BuilderAuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="project/[id]/index" />
              <Stack.Screen name="project/[id]/units" />
              <Stack.Screen name="project/[id]/tour" />
              <Stack.Screen
                name="project/[id]/room-scan"
                options={{ headerShown: false, presentation: 'fullScreenModal' }}
              />
              <Stack.Screen name="project/[id]/room-walkthrough" />
              <Stack.Screen
                name="builder/login"
                options={{ headerShown: true, title: 'Builder sign in' }}
              />
              <Stack.Screen
                name="builder/new"
                options={{ headerShown: true, title: 'New project' }}
              />
              <Stack.Screen
                name="enquiry"
                options={{ presentation: 'modal', headerShown: true, title: 'Enquire' }}
              />
              <Stack.Screen
                name="book-visit"
                options={{ presentation: 'modal', headerShown: true, title: 'Book site visit' }}
              />
            </Stack>
          </ThemeProvider>
        </BuilderAuthProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
