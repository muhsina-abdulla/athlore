import { AppState } from 'react-native';

import { useAuth } from '@/auth/store';
import { db } from '@/db/client';
import { supabase } from '@/lib/supabase';
import { runSync } from '@/sync/engine';
import { onSyncRequested } from '@/sync/signal';
import { useSyncStatus } from '@/sync/status';
import { createSupabaseRemote } from '@/sync/supabaseRemote';

// Decides WHEN to sync. The engine decides what to send and receive.
//
// Only one sync runs at a time. A request that arrives during a run is not lost: it
// triggers one more run when the current one ends.

let running = false;
let again = false;

// Sync logging for development builds. Shows in the Metro terminal.
function debug(...parts: unknown[]) {
  if (__DEV__) console.log('[sync]', ...parts);
}

export async function syncNow(): Promise<void> {
  if (!supabase) return;
  if (useAuth.getState().status !== 'signedIn') return;
  if (running) {
    again = true;
    return;
  }

  running = true;
  useSyncStatus.getState().begin();
  debug('start');
  try {
    const summary = await runSync(db, createSupabaseRemote(supabase));
    debug('finished', summary);
    useSyncStatus.getState().finish(summary);
  } catch (e) {
    debug('crashed', e instanceof Error ? e.message : String(e));
    useSyncStatus.getState().fail(e instanceof Error ? e.message : 'Sync failed.');
  } finally {
    running = false;
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

const SAVE_DELAY_MS = 1000;
const PERIODIC_MS = 5 * 60 * 1000;

// Starts the worker. It syncs when:
// - something was saved (a moment later, so quick edits are sent together)
// - the app opens or comes back to the foreground
// - someone signs in
// - every few minutes while the app is open
// Returns a function that stops it.
export function startSyncWorker(): () => void {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  const stopSignal = onSyncRequested(() => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void syncNow(), SAVE_DELAY_MS);
  });

  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });

  const stopAuth = useAuth.subscribe((state, previous) => {
    if (state.status === 'signedIn' && previous.status !== 'signedIn') void syncNow();
  });

  const interval = setInterval(() => void syncNow(), PERIODIC_MS);
  void syncNow();

  return () => {
    stopSignal();
    appState.remove();
    stopAuth();
    clearInterval(interval);
    if (saveTimer) clearTimeout(saveTimer);
  };
}
