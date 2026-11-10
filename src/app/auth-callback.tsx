import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { completeSignIn } from '@/auth/store';
import { colors } from '@/theme/tokens';

// Google sends the browser back to athlore://auth-callback?code=... When Android
// reopens the app at that address, this screen finishes the sign-in and then moves
// on. It shows only the background colour; the layout sends a signed-in person to the
// tabs and anyone else to the sign-in screen.
export default function AuthCallback() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    void completeSignIn({
      code: params.code ?? null,
      accessToken: null,
      refreshToken: null,
      error: params.error_description ?? params.error ?? null,
    }).catch(() => {
      // The sign-in screen shows its own error if the browser window path failed too.
    });
  }, [params.code, params.error, params.error_description]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Redirect href="/" />
    </View>
  );
}
