import type { SupabaseClient } from '@supabase/supabase-js';

import {
  RemoteError,
  type LookupTable,
  type PullTable,
  type RemoteApi,
  type RemoteRow,
  type SessionPayload,
} from '@/sync/remote';

// The real server: Supabase. Saving a session is one call to the push_session
// function (all or nothing, see supabase/migrations/20261108000000_push_session.sql);
// lookups are plain upserts; pulling reads rows changed since a time.

type Failure = { message?: string; code?: string; status?: number } | null | undefined;

// Sorts a failure into the three kinds the engine reacts to differently.
export function toRemoteError(failure: Failure | unknown): RemoteError {
  const f = (failure ?? {}) as { message?: unknown; code?: unknown; status?: unknown };
  const message = typeof f.message === 'string' && f.message !== '' ? f.message : 'Unknown error';
  const code = typeof f.code === 'string' ? f.code : '';
  const status = typeof f.status === 'number' ? f.status : 0;

  // Signed out, or the sign-in expired.
  if (status === 401 || code === 'PGRST301' || code === 'PGRST302' || /\bjwt\b/i.test(message)) {
    return new RemoteError('auth', message);
  }
  // Offline or unreachable: nothing was wrong with the data itself.
  if (
    /network request failed|failed to fetch|fetch failed|network error|timed? ?out|load failed|econn|enotfound/i.test(
      message,
    ) ||
    status === 0 && /typeerror/i.test(message)
  ) {
    return new RemoteError('network', message);
  }
  return new RemoteError('server', message);
}

const PAGE = 1000;

// The server returns at most 1000 rows per request and does not say when it cut a
// result short. A session with many sets, or a batch of sessions, can pass that, so
// results are read page by page until a short page. Missing the tail would mean
// silently losing sets.
export async function fetchAll(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: RemoteRow[] | null; error: Failure }>,
): Promise<RemoteRow[]> {
  const all: RemoteRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw toRemoteError(error);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

export function createSupabaseRemote(client: SupabaseClient): RemoteApi {
  return {
    async upsertLookup(table: LookupTable, row: RemoteRow) {
      const { error } = await client.from(table).upsert(row, { onConflict: 'id' });
      if (error) throw toRemoteError(error);
    },

    async pushSession(payload: SessionPayload) {
      const { data, error } = await client.rpc('push_session', { p: payload });
      if (error) throw toRemoteError(error);
      const submittedAt =
        data && typeof data === 'object' && typeof (data as RemoteRow).submitted_at === 'string'
          ? ((data as RemoteRow).submitted_at as string)
          : null;
      return { submittedAt };
    },

    async pullRows(table: PullTable, since: string | null, limit: number) {
      let query = client.from(table).select('*');
      if (since) query = query.gte('updated_at', since);
      const { data, error } = await query
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit);
      if (error) throw toRemoteError(error);
      return (data ?? []) as RemoteRow[];
    },

    async pullSessionChildren(sessionIds: string[]) {
      const assignments = await fetchAll((from, to) =>
        client
          .from('session_type_assignments')
          .select('*')
          .in('session_id', sessionIds)
          .order('session_id')
          .order('session_type_id')
          .range(from, to),
      );
      const exercises = await fetchAll((from, to) =>
        client
          .from('session_exercises')
          .select('*')
          .in('session_id', sessionIds)
          .order('id')
          .range(from, to),
      );

      // The exercise ids go in the URL, so ask in small groups.
      const sets: RemoteRow[] = [];
      const exerciseIds = exercises.map((e) => e.id).filter((id): id is string => typeof id === 'string');
      for (const ids of chunk(exerciseIds, 100)) {
        sets.push(
          ...(await fetchAll((from, to) =>
            client
              .from('exercise_sets')
              .select('*')
              .in('session_exercise_id', ids)
              .order('id')
              .range(from, to),
          )),
        );
      }
      return { assignments, exercises, sets };
    },
  };
}
