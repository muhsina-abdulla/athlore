import {
  Inter_400Regular,
  Inter_400Regular_Italic,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { startAuth, useAuth } from '@/auth/store';
import { DatabaseGate } from '@/db/DatabaseGate';
import { loadProfilePhoto, LOCAL_OWNER } from '@/features/profile/photo';
import { startSyncWorker } from '@/sync/worker';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.divider,
    notification: colors.danger,
  },
};

// Everything that needs the database lives in here, so it only starts once the
// database is ready. Starts sign-in and the background sync, and sends someone who
// isn't signed in to the sign-in screen.
function AppStack() {
  const status = useAuth((s) => s.status);

  const userId = useAuth((s) => s.user?.id);

  useEffect(() => startAuth(), []);
  // The profile photo belongs to whoever is signed in (or to the phone, without sign-in).
  useEffect(() => loadProfilePhoto(userId ?? LOCAL_OWNER), [userId]);
  useEffect(() => startSyncWorker(), []);

  // Show the background colour, not a spinner, while checking for a saved sign-in.
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  // Without Supabase set up (localOnly) the app runs on the phone alone.
  const allowed = status === 'signedIn' || status === 'localOnly';

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="auth-callback" />
      <Stack.Protected guard={allowed}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="log" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="deleted" />
        <Stack.Screen name="profile" />
      </Stack.Protected>
      <Stack.Protected guard={!allowed}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_400Regular_Italic,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <DatabaseGate>
        <AppStack />
      </DatabaseGate>
    </ThemeProvider>
  );
}
