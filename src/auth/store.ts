import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';

import { parseAuthRedirect, type AuthRedirect } from '@/auth/redirect';
import type { AppUser } from '@/auth/user';
import { supabase } from '@/lib/supabase';
import { useSyncStatus } from '@/sync/status';

// Lets the sign-in browser window close itself and hand the result back (needed on
// web, harmless on phones).
WebBrowser.maybeCompleteAuthSession();

// Where the browser sends the person back to. A built app owns the athlore:// address.
// Expo Go doesn't (it only opens exp:// addresses), and Linking.createURL still returns
// athlore:// there because the app config has a scheme, which leaves the browser stuck on
// a blank page. So inside Expo Go, point at the running dev server instead.
function isExpoGo(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient || !!Constants.expoGoConfig
  );
}

function signInReturnUrl(): string {
  const host = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (isExpoGo() && host) {
    return `exp://${host}/--/auth-callback`;
  }
  return Linking.createURL('auth-callback');
}

// loading:   checking whether someone is already signed in
// signedOut: Supabase is set up but nobody is signed in
// signedIn:  signed in
// localOnly: Supabase is not set up (no .env), so the app runs on the phone alone
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'localOnly';

type AuthStore = {
  status: AuthStatus;
  user: AppUser | null;
  signingIn: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

type SessionLike = {
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  };
} | null;

function toUser(session: SessionLike): AppUser | null {
  if (!session) return null;
  const meta = session.user.user_metadata ?? {};
  const name =
    typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : null;
  const picture =
    typeof meta.avatar_url === 'string' ? meta.avatar_url : typeof meta.picture === 'string' ? meta.picture : null;
  return { id: session.user.id, email: session.user.email ?? null, name, avatarUrl: picture };
}

// Debug logging for sign-in, development builds only. Shows in the Metro terminal.
function debug(...parts: unknown[]) {
  if (__DEV__) console.log('[auth]', ...parts);
}

// The one-time code in a sign-in address is a credential: never print it.
function redact(url: string) {
  return url.replace(/(code|access_token|refresh_token)=[^&#]+/g, '$1=<hidden>');
}

// Asks the sign-in address directly and logs what comes back. A blank browser page
// usually means this answer is an error, or it never answers. Debug only.
async function probeAuthorizeUrl(url: string) {
  if (!__DEV__) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.text();
    debug('probe status', res.status);
    debug('probe final url', res.url.split('?')[0]);
    debug('probe body', body.slice(0, 300).replace(/\s+/g, ' '));
  } catch (e) {
    debug('probe failed', e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }
}

// The return address can reach the app two ways: through the sign-in browser window,
// and as Android reopening the app on the `auth-callback` screen. Both call this, and
// a one-time code is only ever used once.
const finished = new Set<string>();

export async function completeSignIn(parsed: AuthRedirect): Promise<void> {
  if (!supabase) return;
  debug('finishing sign-in', {
    hasCode: Boolean(parsed.code),
    hasTokens: Boolean(parsed.accessToken),
    error: parsed.error,
  });
  if (parsed.error) throw new Error(parsed.error);

  const key = parsed.code ?? parsed.accessToken;
  if (!key) throw new Error('Sign-in did not finish. Please try again.');
  if (finished.has(key)) return;
  finished.add(key);

  if (parsed.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(parsed.code);
    if (error) throw error;
  } else if (parsed.accessToken && parsed.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: parsed.accessToken,
      refresh_token: parsed.refreshToken,
    });
    if (error) throw error;
  } else {
    throw new Error('Sign-in did not finish. Please try again.');
  }
}

export const useAuth = create<AuthStore>((set) => ({
  status: 'loading',
  user: null,
  signingIn: false,
  error: null,

  // Signs out on this phone only (scope "local"), so it works offline too. Nothing is
  // deleted: sessions, drafts and anything still waiting to sync stay on the phone and
  // are sent when someone signs in again. onAuthStateChange (see startAuth) then moves
  // the app to the sign-in screen.
  signOut: async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      set({ error: error.message });
      return;
    }
    set({ error: null });
    useSyncStatus.getState().reset();
  },

  // Sign in with Google in the phone's browser. Supabase hands back a one-time code
  // at the address below, which is exchanged for a session. This works in Expo Go and
  // in a built app alike.
  signInWithGoogle: async () => {
    if (!supabase) return;
    set({ signingIn: true, error: null });
    try {
      const redirectTo = signInReturnUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      debug('redirectTo', redirectTo);
      debug('signInWithOAuth error', error?.message ?? 'none');
      debug('authorize url', data?.url ?? 'none');
      if (error || !data?.url) throw error ?? new Error('Could not start sign-in.');

      await probeAuthorizeUrl(data.url);

      // Expo Go's in-app sign-in window stays black. Open the normal browser instead;
      // when Google is done it opens the exp:// address above, which brings the person
      // back to the auth-callback screen and finishes sign-in there.
      if (isExpoGo()) {
        debug('Expo Go: opening the normal browser');
        await Linking.openURL(data.url);
        debug('Expo Go: browser opened, waiting for the return to auth-callback');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      debug('browser result', result.type, 'url' in result ? redact(result.url) : '');
      // Closing the browser window is not an error.
      if (result.type !== 'success') return;

      await completeSignIn(parseAuthRedirect(result.url));
      // onAuthStateChange (see startAuth) moves the app to signed in.
    } catch (e) {
      debug('sign-in failed', e instanceof Error ? e.message : String(e));
      set({ error: e instanceof Error ? e.message : 'Could not sign in.' });
    } finally {
      set({ signingIn: false });
    }
  },
}));

// Call once at startup. Returns a function that stops listening.
export function startAuth(): () => void {
  if (!supabase) {
    useAuth.setState({ status: 'localOnly' });
    return () => {};
  }
  const apply = (session: SessionLike) =>
    useAuth.setState({ status: session ? 'signedIn' : 'signedOut', user: toUser(session) });

  // If checking for a saved sign-in fails or takes too long, show the sign-in screen
  // instead of waiting forever on a blank page.
  const giveUp = (reason: string) => {
    if (useAuth.getState().status === 'loading') {
      console.warn(`[auth] ${reason}`);
      useAuth.setState({ status: 'signedOut', user: null });
    }
  };
  const timer = setTimeout(() => giveUp('Checking the saved sign-in took longer than 5 seconds.'), 5000);

  supabase.auth
    .getSession()
    .then(({ data }) => apply(data.session))
    .catch((e: unknown) => giveUp(`getSession failed: ${e instanceof Error ? e.message : String(e)}`));
  // Only record the change here: calling back into Supabase from inside this
  // listener can deadlock it.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
  return () => {
    clearTimeout(timer);
    data.subscription.unsubscribe();
  };
}
