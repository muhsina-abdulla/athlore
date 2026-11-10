import { and, eq, sql } from 'drizzle-orm';

import type { Db } from '@/db/client';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SESSION_TYPES,
  RETIRED_CATEGORY_IDS,
  RETIRED_SESSION_TYPE_IDS,
} from '@/db/defaults';
import {
  categories,
  exercises,
  exerciseSets,
  outbox,
  SET_KINDS,
  sessionExercises,
  sessions,
  sessionTypeAssignments,
  sessionTypes,
  syncMeta,
  type SetKind,
} from '@/db/schema';
import {
  bool,
  buildSessionPayload,
  date,
  exerciseToRemote,
  lookupToRemote,
  num,
  str,
} from '@/sync/mapping';
import {
  RemoteError,
  type LookupTable,
  type PullTable,
  type RemoteApi,
  type RemoteRow,
} from '@/sync/remote';

// How a sync works (docs/architecture.md):
//
// PUSH. Every change made on the phone queued an outbox entry. They are sent
// lookups first (a session can't be saved before the category it points at), then
// sessions. An entry is removed only after the server confirms it, and only if the
// item wasn't edited again while the push was running. Retrying is always safe:
// ids come from the phone, so the server upserts rather than duplicates.
//
// PULL. Rows changed on the server since the last pull are copied down, so a fresh
// phone gets everything back. A row with an unsent local change is left alone: the
// phone's own edit wins until it has been pushed.

export type SyncSummary = {
  pushed: number;
  failed: number;
  pulled: number;
  // Rows that could not be applied locally. The pull position is not moved past
  // them, so they are tried again next time.
  pullFailures: number;
  // Why the run stopped early: offline, or not signed in.
  stopped: 'network' | 'auth' | null;
  error: string | null;
};

const ENTITY_ORDER = { category: 0, session_type: 1, exercise: 2, session: 3 } as const;
type Entity = keyof typeof ENTITY_ORDER;

// Shared defaults belong to the server. The app never pushes them.
const SERVER_OWNED_IDS: Record<'category' | 'session_type', Set<string>> = {
  category: new Set<string>([...DEFAULT_CATEGORIES.map((c) => c.id), ...RETIRED_CATEGORY_IDS]),
  session_type: new Set<string>([...DEFAULT_SESSION_TYPES.map((t) => t.id), ...RETIRED_SESSION_TYPE_IDS]),
};

const PULL_ORDER: PullTable[] = ['categories', 'user_session_types', 'exercises', 'sessions'];
const PAGE_SIZE = 1000;
// The first page of each pull starts a little before the saved position, in case a
// row committed on the server after a later one. Re-applying a row is harmless.
const OVERLAP_MS = 2 * 60 * 1000;
const CHILD_BATCH = 50;

type OutboxRow = typeof outbox.$inferSelect;

export async function runSync(db: Db, remote: RemoteApi): Promise<SyncSummary> {
  const summary: SyncSummary = {
    pushed: 0,
    failed: 0,
    pulled: 0,
    pullFailures: 0,
    stopped: null,
    error: null,
  };

  // If the app was killed in the middle of a push, those entries were left in flight.
  db.update(outbox).set({ status: 'pending' }).where(eq(outbox.status, 'in_flight')).run();

  await pushAll(db, remote, summary);
  if (summary.stopped === null) await pullAll(db, remote, summary);
  return summary;
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

function toRemoteError(err: unknown): RemoteError {
  if (err instanceof RemoteError) return err;
  return new RemoteError('server', err instanceof Error ? err.message : String(err));
}

async function pushAll(db: Db, remote: RemoteApi, summary: SyncSummary): Promise<void> {
  const entries = db
    .select()
    .from(outbox)
    .all()
    .sort(
      (a, b) =>
        ENTITY_ORDER[a.entity] - ENTITY_ORDER[b.entity] ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id - b.id,
    );

  for (const entry of entries) {
    db.update(outbox).set({ status: 'in_flight' }).where(eq(outbox.id, entry.id)).run();
    try {
      await pushEntry(db, remote, entry);
      summary.pushed += 1;
    } catch (err) {
      const e = toRemoteError(err);
      if (e.kind === 'network' || e.kind === 'auth') {
        // Not the entry's fault: put it back and stop. Everything after it is still
        // queued, untouched, for the next try.
        db.update(outbox).set({ status: 'pending' }).where(eq(outbox.id, entry.id)).run();
        summary.stopped = e.kind;
        summary.error = e.message;
        return;
      }
      db.update(outbox)
        .set({ status: 'failed', attempts: entry.attempts + 1, lastError: e.message.slice(0, 300) })
        .where(eq(outbox.id, entry.id))
        .run();
      summary.failed += 1;
      summary.error ??= e.message;
    }
  }
}

// Removes the entry if what was pushed is still current. If the item was edited
// while the push was running, the entry stays queued so the newer version is sent.
function settle(db: Db, entry: OutboxRow, unchanged: boolean): void {
  if (unchanged) {
    db.delete(outbox).where(eq(outbox.id, entry.id)).run();
  } else {
    db.update(outbox)
      .set({ status: 'pending', attempts: 0, lastError: null })
      .where(eq(outbox.id, entry.id))
      .run();
  }
}

function drop(db: Db, entry: OutboxRow): void {
  db.delete(outbox).where(eq(outbox.id, entry.id)).run();
}

async function pushEntry(db: Db, remote: RemoteApi, entry: OutboxRow): Promise<void> {
  const id = entry.entityId;

  if (entry.entity === 'category') {
    if (SERVER_OWNED_IDS.category.has(id)) return drop(db, entry);
    const row = db.select().from(categories).where(eq(categories.id, id)).get();
    if (!row) return drop(db, entry);
    await remote.upsertLookup('categories', lookupToRemote(row));
    const now = db.select({ u: categories.updatedAt }).from(categories).where(eq(categories.id, id)).get();
    return settle(db, entry, !now || now.u.getTime() === row.updatedAt.getTime());
  }

  if (entry.entity === 'session_type') {
    if (SERVER_OWNED_IDS.session_type.has(id)) return drop(db, entry);
    const row = db.select().from(sessionTypes).where(eq(sessionTypes.id, id)).get();
    if (!row) return drop(db, entry);
    await remote.upsertLookup('user_session_types', lookupToRemote(row));
    const now = db.select({ u: sessionTypes.updatedAt }).from(sessionTypes).where(eq(sessionTypes.id, id)).get();
    return settle(db, entry, !now || now.u.getTime() === row.updatedAt.getTime());
  }

  if (entry.entity === 'exercise') {
    const row = db.select().from(exercises).where(eq(exercises.id, id)).get();
    // The master list ships with the server; only the athlete's own exercises are sent.
    if (!row || !row.isCustom) return drop(db, entry);
    await remote.upsertLookup('exercises', exerciseToRemote(row));
    const now = db.select({ u: exercises.updatedAt }).from(exercises).where(eq(exercises.id, id)).get();
    return settle(db, entry, !now || now.u.getTime() === row.updatedAt.getTime());
  }

  const built = buildSessionPayload(db, id);
  if (!built) return drop(db, entry);
  const result = await remote.pushSession(built.payload);

  const current = db
    .select({ u: sessions.updatedAt, submittedAt: sessions.submittedAt })
    .from(sessions)
    .where(eq(sessions.id, id))
    .get();

  // The server confirmed it, so the session is now "submitted". Only submittedAt is
  // written here, never updatedAt, which is how an edit made meanwhile is noticed.
  if (current && !current.submittedAt && result.submittedAt) {
    const when = new Date(result.submittedAt);
    if (!Number.isNaN(when.getTime())) {
      db.update(sessions).set({ submittedAt: when }).where(eq(sessions.id, id)).run();
    }
  }
  settle(db, entry, !current || current.u.getTime() === built.updatedAt);
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

async function pullAll(db: Db, remote: RemoteApi, summary: SyncSummary): Promise<void> {
  for (const table of PULL_ORDER) {
    try {
      await pullTable(db, remote, table, summary);
    } catch (err) {
      const e = toRemoteError(err);
      summary.error ??= e.message;
      if (e.kind !== 'server') {
        summary.stopped = e.kind;
        return;
      }
    }
  }
}

const readMeta = (db: Db, key: string): string | null =>
  db.select({ v: syncMeta.value }).from(syncMeta).where(eq(syncMeta.key, key)).get()?.v ?? null;

const writeMeta = (db: Db, key: string, value: string): void => {
  db.insert(syncMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: syncMeta.key, set: { value } })
    .run();
};

const latestUpdate = (rows: RemoteRow[], from: string | null): string | null => {
  let latest = from;
  for (const row of rows) {
    const at = str(row, 'updated_at');
    if (at && (latest === null || new Date(at).getTime() > new Date(latest).getTime())) latest = at;
  }
  return latest;
};

async function pullTable(
  db: Db,
  remote: RemoteApi,
  table: PullTable,
  summary: SyncSummary,
): Promise<void> {
  const key = `pulled:${table}`;
  const saved = readMeta(db, key);
  let cursor = saved;
  let failures = 0;
  let first = true;

  for (;;) {
    const since =
      first && cursor !== null
        ? new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString()
        : cursor;
    first = false;

    const rows = await remote.pullRows(table, since, PAGE_SIZE);
    if (rows.length === 0) break;

    const result = await applyRows(db, remote, table, rows);
    summary.pulled += result.applied;
    failures += result.failed;

    const next = latestUpdate(rows, cursor);
    const progressed = next !== cursor;
    cursor = next;
    // A short page is the last one. A full page that moved nowhere would loop forever.
    if (rows.length < PAGE_SIZE || !progressed) break;
  }

  summary.pullFailures += failures;
  // Only move the saved position when every row was applied, so a failed row is
  // fetched again next time instead of being skipped for good.
  if (failures === 0 && cursor !== null && cursor !== saved) writeMeta(db, key, cursor);
}

function pendingIds(db: Db, entity: Entity): Set<string> {
  return new Set(
    db
      .select({ id: outbox.entityId })
      .from(outbox)
      .where(eq(outbox.entity, entity))
      .all()
      .map((r) => r.id),
  );
}

type ApplyResult = { applied: number; failed: number };

async function applyRows(
  db: Db,
  remote: RemoteApi,
  table: PullTable,
  rows: RemoteRow[],
): Promise<ApplyResult> {
  if (table === 'sessions') return applySessions(db, remote, rows);
  return applyLookups(db, table, rows);
}

// Does another local row already use this name? Names are unique ignoring case.
function nameClash(db: Db, table: LookupTable, id: string, name: string): boolean {
  const target = table === 'categories' ? categories : table === 'user_session_types' ? sessionTypes : exercises;
  const hit = db
    .select({ id: target.id })
    .from(target)
    .where(and(sql`lower(${target.name}) = lower(${name})`, sql`${target.id} != ${id}`))
    .get();
  return hit !== undefined;
}

function applyLookups(db: Db, table: LookupTable, rows: RemoteRow[]): ApplyResult {
  const entity: Entity =
    table === 'categories' ? 'category' : table === 'user_session_types' ? 'session_type' : 'exercise';
  const pending = pendingIds(db, entity);
  const result: ApplyResult = { applied: 0, failed: 0 };

  for (const row of rows) {
    const id = str(row, 'id');
    const name = str(row, 'name');
    if (!id || !name) {
      result.failed += 1;
      continue;
    }
    // The phone's own unsent edit wins until it has been pushed.
    if (pending.has(id)) continue;

    const stamps = {
      createdAt: date(row, 'created_at') ?? new Date(),
      updatedAt: date(row, 'updated_at') ?? new Date(),
      deletedAt: date(row, 'deleted_at'),
    };
    try {
      if (table === 'categories') {
        db.insert(categories)
          .values({ id, name, ...stamps })
          .onConflictDoUpdate({ target: categories.id, set: { name, updatedAt: stamps.updatedAt, deletedAt: stamps.deletedAt } })
          .run();
      } else if (table === 'user_session_types') {
        db.insert(sessionTypes)
          .values({ id, name, ...stamps })
          .onConflictDoUpdate({ target: sessionTypes.id, set: { name, updatedAt: stamps.updatedAt, deletedAt: stamps.deletedAt } })
          .run();
      } else {
        const kind = str(row, 'default_kind');
        const defaultKind: SetKind = SET_KINDS.find((k) => k === kind) ?? 'reps_weight';
        const fields = {
          name,
          isCustom: bool(row, 'is_custom'),
          muscleGroup: str(row, 'muscle_group'),
          defaultKind,
          updatedAt: stamps.updatedAt,
          deletedAt: stamps.deletedAt,
        };
        db.insert(exercises)
          .values({ id, createdAt: stamps.createdAt, ...fields })
          .onConflictDoUpdate({ target: exercises.id, set: fields })
          .run();
      }
      result.applied += 1;
    } catch {
      // A different local entry already has this name: leave both as they are rather
      // than treating it as a failure that would block the pull forever.
      if (!nameClash(db, table, id, name)) result.failed += 1;
    }
  }
  return result;
}

async function applySessions(db: Db, remote: RemoteApi, rows: RemoteRow[]): Promise<ApplyResult> {
  const pending = pendingIds(db, 'session');
  const result: ApplyResult = { applied: 0, failed: 0 };

  const incoming = rows.filter((row) => {
    const id = str(row, 'id');
    return id !== null && !pending.has(id);
  });
  result.failed += rows.filter((row) => str(row, 'id') === null).length;

  for (let i = 0; i < incoming.length; i += CHILD_BATCH) {
    const batch = incoming.slice(i, i + CHILD_BATCH);
    const ids = batch.map((row) => str(row, 'id') as string);
    const children = await remote.pullSessionChildren(ids);

    for (const row of batch) {
      const id = str(row, 'id') as string;
      try {
        // false means the phone has an unsent edit by now, so the server copy is skipped.
        if (replaceSession(db, id, row, children)) result.applied += 1;
      } catch {
        result.failed += 1;
      }
    }
  }
  return result;
}

// Replaces one session and everything under it with the server's version, all or
// nothing, so the phone never holds a half-copied session. Returns false, changing
// nothing, if the session has an unsent local edit.
//
// That check happens here, inside the transaction, and not only before the children
// were fetched: the fetch takes time, and an edit made meanwhile must never be
// overwritten by the older server copy. Nothing can interleave inside a transaction.
function replaceSession(
  db: Db,
  id: string,
  row: RemoteRow,
  children: { assignments: RemoteRow[]; exercises: RemoteRow[]; sets: RemoteRow[] },
): boolean {
  const now = new Date();
  const values = {
    id,
    trainingDate: str(row, 'training_date') ?? '',
    categoryId: str(row, 'category_id'),
    trainingFocus: str(row, 'training_focus'),
    durationMinutes: num(row, 'duration_minutes'),
    durationRaw: str(row, 'duration_raw'),
    techniques: str(row, 'techniques'),
    selfAssessment: str(row, 'self_assessment'),
    coachFeedback: str(row, 'coach_feedback'),
    coachName: str(row, 'coach_name'),
    injuryNotes: str(row, 'injury_notes'),
    proudOf: str(row, 'proud_of'),
    toImprove: str(row, 'to_improve'),
    rating: num(row, 'rating'),
    moodScale: num(row, 'mood_scale'),
    moodText: str(row, 'mood_text'),
    source: str(row, 'source') === 'legacy' ? ('legacy' as const) : ('app' as const),
    submittedAt: date(row, 'submitted_at'),
    createdAt: date(row, 'created_at') ?? now,
    updatedAt: date(row, 'updated_at') ?? now,
    deletedAt: date(row, 'deleted_at'),
  };
  if (values.trainingDate === '') throw new Error('session without a training date');

  const myAssignments = children.assignments.filter((a) => str(a, 'session_id') === id);
  const myExercises = children.exercises.filter((e) => str(e, 'session_id') === id);
  const myExerciseIds = new Set(myExercises.map((e) => str(e, 'id')));
  const mySets = children.sets.filter((s) => myExerciseIds.has(str(s, 'session_exercise_id')));

  let applied = false;
  db.transaction((tx) => {
    const unsent = tx
      .select({ id: outbox.id })
      .from(outbox)
      .where(and(eq(outbox.entity, 'session'), eq(outbox.entityId, id)))
      .get();
    if (unsent) return;

    tx.insert(sessions).values(values).onConflictDoUpdate({ target: sessions.id, set: values }).run();

    tx.delete(sessionTypeAssignments).where(eq(sessionTypeAssignments.sessionId, id)).run();
    // Deleting a session exercise removes its sets with it.
    tx.delete(sessionExercises).where(eq(sessionExercises.sessionId, id)).run();

    for (const a of myAssignments) {
      const sessionTypeId = str(a, 'session_type_id');
      if (!sessionTypeId) throw new Error('assignment without a session type');
      tx.insert(sessionTypeAssignments).values({ sessionId: id, sessionTypeId }).run();
    }
    for (const e of myExercises) {
      const exerciseId = str(e, 'exercise_id');
      const exId = str(e, 'id');
      if (!exerciseId || !exId) throw new Error('exercise without an id');
      tx.insert(sessionExercises)
        .values({
          id: exId,
          sessionId: id,
          exerciseId,
          position: num(e, 'position') ?? 0,
          notes: str(e, 'notes'),
          createdAt: date(e, 'created_at') ?? now,
          updatedAt: date(e, 'updated_at') ?? now,
        })
        .run();
    }
    for (const s of mySets) {
      const setId = str(s, 'id');
      const parent = str(s, 'session_exercise_id');
      const kind = SET_KINDS.find((k) => k === str(s, 'kind'));
      if (!setId || !parent || !kind) throw new Error('set without an id, parent or kind');
      const unit = str(s, 'weight_unit');
      tx.insert(exerciseSets)
        .values({
          id: setId,
          sessionExerciseId: parent,
          position: num(s, 'position') ?? 0,
          kind,
          isTop: bool(s, 'is_top'),
          reps: num(s, 'reps'),
          weight: num(s, 'weight'),
          weightUnit: unit === 'kg' || unit === 'lb' ? unit : null,
          addedLoad: num(s, 'added_load'),
          durationSeconds: num(s, 'duration_seconds'),
          distanceMeters: num(s, 'distance_m'),
          createdAt: date(s, 'created_at') ?? now,
          updatedAt: date(s, 'updated_at') ?? now,
        })
        .run();
    }
    applied = true;
  });
  return applied;
}
