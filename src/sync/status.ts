import { create } from 'zustand';

import type { SyncSummary } from '@/sync/engine';

// What the app shows about syncing. The numbers of waiting and failed sessions come
// from the outbox itself (they are live queries); this is only the state of the
// worker.
export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'signedOut';

// How a finished run is described. Offline and signed-out are not errors: nothing
// is wrong with the data, it just can't be sent right now.
export function stateAfter(summary: SyncSummary): SyncState {
  if (summary.stopped === 'network') return 'offline';
  if (summary.stopped === 'auth') return 'signedOut';
  if (summary.failed > 0 || summary.pullFailures > 0) return 'error';
  return 'idle';
}

type SyncStatusStore = {
  state: SyncState;
  lastSyncedAt: number | null;
  lastError: string | null;
  begin: () => void;
  finish: (summary: SyncSummary) => void;
  fail: (message: string) => void;
};

export const useSyncStatus = create<SyncStatusStore>((set) => ({
  state: 'idle',
  lastSyncedAt: null,
  lastError: null,
  begin: () => set({ state: 'syncing' }),
  finish: (summary) => {
    const state = stateAfter(summary);
    set({
      state,
      lastError: summary.error,
      // "Last synced" only moves when the run really reached the server.
      ...(summary.stopped === null ? { lastSyncedAt: Date.now() } : {}),
    });
  },
  fail: (message) => set({ state: 'error', lastError: message }),
}));
