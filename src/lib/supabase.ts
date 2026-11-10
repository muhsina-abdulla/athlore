import 'react-native-url-polyfill/auto';
// Gives Supabase a place to keep the sign-in on the phone, using the SQLite that is
// already part of the app.
import 'expo-sqlite/localStorage/install';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Without both values (a .env file, see .env.example) the app still works fully on
// the phone: there is just no sign-in and no sync.
export const isSyncConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: localStorage,
          autoRefreshToken: true,
          persistSession: true,
          // This is an app, not a web page: there is no sign-in code in the address bar.
          detectSessionInUrl: false,
          // The sign-in code is exchanged for a session, so no token travels in a URL.
          flowType: 'pkce',
          // Extra sign-in messages in the Metro terminal, development only.
          debug: __DEV__,
        },
      })
    : null;

// Refreshing the sign-in in the background only makes sense while the app is open.
// Registered once, here, as Supabase asks.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
