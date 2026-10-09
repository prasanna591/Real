import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { BuilderAuthProvider } from '@/lib/builder-auth';
import { EyDProvider } from '@/lib/eyd/store';
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
            <EyDProvider>
              <FollowProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                  <ErrorBoundary>
                    <AnimatedSplashOverlay />
                    <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="saved" options={{ title: 'Saved' }} />
                      <Stack.Screen name="scans" options={{ title: 'Room scans' }} />
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
                      <Stack.Screen name="build/index" options={{ title: 'My project' }} />
                      <Stack.Screen name="build/budget" options={{ title: 'Budget' }} />
                      <Stack.Screen name="build/payments" options={{ title: 'Payments' }} />
                      <Stack.Screen name="build/roadmap" options={{ title: 'Roadmap' }} />
                      <Stack.Screen name="build/progress" options={{ title: 'Progress' }} />
                      <Stack.Screen name="build/notifications" options={{ title: 'Notifications' }} />
                      <Stack.Screen name="build/network/index" options={{ title: 'Professionals' }} />
                      <Stack.Screen name="build/network/[id]" options={{ title: 'Professional' }} />
                      <Stack.Screen name="build/quotations" options={{ title: 'Quotations' }} />
                      <Stack.Screen name="build/quotations/[id]" options={{ title: 'Quotation' }} />
                      <Stack.Screen name="build/materials" options={{ title: 'Materials' }} />
                      <Stack.Screen name="build/documents" options={{ title: 'Documents' }} />
                      <Stack.Screen name="build/intelligence" options={{ title: 'Intelligence' }} />
                      <Stack.Screen name="build/passport" options={{ title: 'Home passport' }} />
                    </Stack>
                  </ErrorBoundary>
                </ThemeProvider>
              </FollowProvider>
            </EyDProvider>
          </OfflineProvider>
        </BuilderAuthProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
