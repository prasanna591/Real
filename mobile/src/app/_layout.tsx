import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { BuilderAuthProvider } from '@/lib/builder-auth';
import { FollowProvider } from '@/lib/follow';
import { OfflineProvider } from '@/lib/network';
import { SessionProvider } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'DM Sans': require('../../assets/fonts/DMSans-Regular.ttf'),
    'DM Sans-Medium': require('../../assets/fonts/DMSans-Medium.ttf'),
    'DM Sans-SemiBold': require('../../assets/fonts/DMSans-SemiBold.ttf'),
    'DM Sans-Bold': require('../../assets/fonts/DMSans-Bold.ttf'),
    'Playfair Display': require('../../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'Playfair Display-SemiBold': require('../../assets/fonts/PlayfairDisplay-SemiBold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <BuilderAuthProvider>
          <OfflineProvider>
            <FollowProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <ErrorBoundary>
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
                    <Stack.Screen name="project/[id]/panorama" />
                    <Stack.Screen name="project/[id]/assistant" />
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
                    <Stack.Screen
                      name="post-property"
                      options={{ presentation: 'modal', headerShown: true, title: 'Post your property' }}
                    />
                  </Stack>
                </ErrorBoundary>
              </ThemeProvider>
            </FollowProvider>
          </OfflineProvider>
      </BuilderAuthProvider>
    </SessionProvider>
    </SafeAreaProvider>
  );
}
