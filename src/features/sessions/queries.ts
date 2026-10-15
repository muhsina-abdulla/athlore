import { and, asc, between, desc, eq, isNull, max, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { DEFAULT_CATEGORIES, DEFAULT_SESSION_TYPES } from '@/db/defaults';
import {
  categories,
  drafts,
  exerciseSets,
  exercises,
  outbox,
  sessionExercises,
  sessionTypeAssignments,
  sessions,
  sessionTypes,
  type SetKind,
} from '@/db/schema';
import type { SyncStatus } from '@/components/ui';
import {
  groupSets,
  parseDraftPayload,
  type ExerciseEntry,
  type SessionForm,
  type SetEntry,
} from '@/features/sessions/formState';
import { todayKey } from '@/lib/dates';

// Defaults first, in the order they are defined; custom entries after, in the order
// they came back (creation order). Array.sort is stable.
function sortByDefaultOrder<T extends { id: string }>(rows: T[], defaults: readonly { id: string }[]): T[] {
  const rank = (id: string) => {
    const i = defaults.findIndex((d) => d.id === id);
    return i === -1 ? defaults.length : i;
  };
  return [...rows].sort((a, b) => rank(a.id) - rank(b.id));
}

// Every hook here is live: screens update when rows change, with no manual refresh.

export function useCategories() {
  const { data } = useLiveQuery(
    db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.createdAt), asc(sql`lower(${categories.name})`)),
  );
  // Defaults keep their designed order; the athlete's own follow in creation order.
  return sortByDefaultOrder(data, DEFAULT_CATEGORIES);
}

export function useSessionTypes() {
  const { data } = useLiveQuery(
    db
      .select()
      .from(sessionTypes)
      .where(isNull(sessionTypes.deletedAt))
      .orderBy(asc(sessionTypes.createdAt), asc(sessionTypes.name)),
  );
  return sortByDefaultOrder(data, DEFAULT_SESSION_TYPES);
}

export type SessionRow = {
  id: string;
  trainingDate: string;
  categoryName: string | null;
  trainingFocus: string | null;
  durationMinutes: number | null;
  rating: number | null;
  createdAt: Date;
  sync: SyncStatus;
};

function toSyncStatus(status: 'pending' | 'in_flight' | 'failed' | null): SyncStatus {
  if (status === null) return 'synced';
  return status === 'failed' ? 'failed' : 'pending';
}

// Newest training day first; within a day, newest entry first. Sorted by the
// training date, never by when the entry was created or submitted.
export function useSessionRows(): SessionRow[] {
  const { data } = useLiveQuery(
    db
      .select({
        id: sessions.id,
        trainingDate: sessions.trainingDate,
        categoryName: categories.name,
        trainingFocus: sessions.trainingFocus,
        durationMinutes: sessions.durationMinutes,
        rating: sessions.rating,
        createdAt: sessions.createdAt,
        outboxStatus: outbox.status,
      })
      .from(sessions)
      .leftJoin(categories, eq(categories.id, sessions.categoryId))
      .leftJoin(outbox, and(eq(outbox.entity, 'session'), eq(outbox.entityId, sessions.id)))
      .where(isNull(sessions.deletedAt))
      .orderBy(desc(sessions.trainingDate), desc(sessions.createdAt)),
  );
  return data.map(({ outboxStatus, ...row }) => ({ ...row, sync: toSyncStatus(outboxStatus) }));
}

export function useSession(id: string) {
  const { data } = useLiveQuery(
    db
      .select({
        session: sessions,
        categoryName: categories.name,
        outboxStatus: outbox.status,
      })
      .from(sessions)
      .leftJoin(categories, eq(categories.id, sessions.categoryId))
      .leftJoin(outbox, and(eq(outbox.entity, 'session'), eq(outbox.entityId, sessions.id)))
      .where(and(eq(sessions.id, id), isNull(sessions.deletedAt)))
      .limit(1),
    [id],
  );
  const { data: typeRows } = useLiveQuery(
    db
      .select({ id: sessionTypes.id, name: sessionTypes.name })
      .from(sessionTypeAssignments)
      .innerJoin(sessionTypes, eq(sessionTypes.id, sessionTypeAssignments.sessionTypeId))
      .where(eq(sessionTypeAssignments.sessionId, id))
      .orderBy(asc(sessionTypes.name)),
    [id],
  );
  const { data: exerciseRows } = useLiveQuery(
    db
      .select({
        id: sessionExercises.id,
        exerciseId: sessionExercises.exerciseId,
        name: exercises.name,
        defaultKind: exercises.defaultKind,
        notes: sessionExercises.notes,
      })
      .from(sessionExercises)
      .innerJoin(exercises, eq(exercises.id, sessionExercises.exerciseId))
      .where(eq(sessionExercises.sessionId, id))
      .orderBy(asc(sessionExercises.position)),
    [id],
  );
  const { data: setRows } = useLiveQuery(
    db
      .select({ set: exerciseSets })
      .from(exerciseSets)
      .innerJoin(sessionExercises, eq(sessionExercises.id, exerciseSets.sessionExerciseId))
      .where(eq(sessionExercises.sessionId, id))
      .orderBy(asc(exerciseSets.position)),
    [id],
  );
  const row = data[0];
  if (!row) return null;
  return {
    ...row.session,
    categoryName: row.categoryName,
    sync: toSyncStatus(row.outboxStatus),
    sessionTypes: typeRows,
    exercises: toExerciseEntries(exerciseRows, setRows.map((r) => r.set)),
  };
}

type SetRow = typeof exerciseSets.$inferSelect;

// The set's main number lives in a different column per kind. Numbers become
// plain strings ("62.5") so they can be edited like freshly typed values.
function amountOf(set: SetRow): string {
  const value =
    set.kind === 'reps_weight'
      ? set.weight
      : set.kind === 'added_load'
        ? set.addedLoad
        : set.kind === 'time'
          ? set.durationSeconds
          : set.kind === 'distance'
            ? set.distanceMeters
            : null;
  return value === null ? '' : String(value);
}

function toExerciseEntries(
  rows: { id: string; exerciseId: string; name: string; defaultKind: SetKind; notes: string | null }[],
  sets: SetRow[],
): ExerciseEntry[] {
  return rows.map((row) => {
    const own = sets.filter((s) => s.sessionExerciseId === row.id);
    const entries: SetEntry[] = own.map((s) => ({
      id: s.id,
      reps: s.reps === null ? '' : String(s.reps),
      amount: amountOf(s),
      isTop: s.isTop,
    }));
    return {
      id: row.id,
      exerciseId: row.exerciseId,
      name: row.name,
      kind: own[0]?.kind ?? row.defaultKind,
      notes: row.notes ?? '',
      sets: groupSets(entries),
    };
  });
}

export type SessionDetail = NonNullable<ReturnType<typeof useSession>>;

export function sessionToForm(session: SessionDetail): SessionForm {
  return {
    trainingDate: session.trainingDate,
    categoryId: session.categoryId,
    trainingFocus: session.trainingFocus ?? '',
    durationMinutes: session.durationMinutes,
    sessionTypeIds: session.sessionTypes.map((t) => t.id),
    techniques: session.techniques ?? '',
    selfAssessment: session.selfAssessment ?? '',
    coachFeedback: session.coachFeedback ?? '',
    injuryNotes: session.injuryNotes ?? '',
    proudOf: session.proudOf ?? '',
    toImprove: session.toImprove ?? '',
    rating: session.rating,
    moodScale: session.moodScale,
    exercises: session.exercises,
  };
}

export type DraftRow = {
  sessionId: string;
  isEdit: boolean;
  updatedAt: Date;
  form: SessionForm;
};

// Newest first. Drafts of existing sessions (isEdit) are included so an
// interrupted edit can be resumed too.
export function useDrafts(): DraftRow[] {
  const { data } = useLiveQuery(db.select().from(drafts).orderBy(desc(drafts.updatedAt)));
  return data.map((d) => ({
    sessionId: d.sessionId,
    isEdit: d.isEdit,
    updatedAt: d.updatedAt,
    form: parseDraftPayload(d.payload, todayKey()),
  }));
}

// Training dates between two keys, one entry per session. Callers derive
// sessions (entries) and training days (distinct dates) separately.
export function useTrainingDates(fromKey: string, toKey: string): string[] {
  const { data } = useLiveQuery(
    db
      .select({ trainingDate: sessions.trainingDate })
      .from(sessions)
      .where(and(isNull(sessions.deletedAt), between(sessions.trainingDate, fromKey, toKey))),
    [fromKey, toKey],
  );
  return data.map((r) => r.trainingDate);
}

// ---------- Exercises ----------

// The master list plus the athlete's own, alphabetical.
export function useExercises() {
  const { data } = useLiveQuery(
    db
      .select()
      .from(exercises)
      .where(isNull(exercises.deletedAt))
      .orderBy(asc(sql`lower(${exercises.name})`)),
  );
  return data;
}

// Exercises used most recently, newest first. Suggested at the top of the picker.
export function useRecentExerciseIds(limit = 6): string[] {
  const { data } = useLiveQuery(
    db
      .select({
        exerciseId: sessionExercises.exerciseId,
        lastDate: max(sessions.trainingDate),
        lastCreated: max(sessions.createdAt),
      })
      .from(sessionExercises)
      .innerJoin(sessions, eq(sessions.id, sessionExercises.sessionId))
      .where(isNull(sessions.deletedAt))
      .groupBy(sessionExercises.exerciseId)
      .orderBy(desc(max(sessions.trainingDate)), desc(max(sessions.createdAt)))
      .limit(limit),
    [limit],
  );
  return data.map((r) => r.exerciseId);
}
