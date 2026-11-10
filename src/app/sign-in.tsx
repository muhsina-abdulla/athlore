import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/store';
import { BrandMark } from '@/components/BrandMark';
import { GoogleLogo } from '@/components/GoogleLogo';
import { Button, Txt } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

// Shown only when Supabase is set up and nobody is signed in. Once signed in, the
// app opens straight to the tabs, even offline.
export default function SignInScreen() {
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const signingIn = useAuth((s) => s.signingIn);
  const error = useAuth((s) => s.error);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <BrandMark />
        <View style={styles.heading}>
          <Txt variant="title" style={styles.centered}>
            Athlore
          </Txt>
          <Txt variant="overline" color="textSecondary" style={styles.tagline}>
            Your training. Your progress. Your story.
          </Txt>
        </View>

        <View style={styles.action}>
          <Button
            title="Continue with Google"
            variant="secondary"
            leading={<GoogleLogo />}
            loading={signingIn}
            onPress={signInWithGoogle}
          />
          {error ? (
            <Txt variant="caption" color="danger" style={styles.centered}>
              {error}
            </Txt>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.screen },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.xxl },
  heading: { alignItems: 'center', gap: space.sm },
  tagline: { textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1.2 },
  action: { alignSelf: 'stretch', gap: space.md, marginTop: space.lg },
  centered: { textAlign: 'center' },
});
