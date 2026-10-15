import { and, eq, isNull, sql } from 'drizzle-orm';

import { db, type Db } from '@/db/client';
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
import {
  canSave,
  parseDraftPayload,
  setCount,
  type ExerciseEntry,
  type SessionForm,
  type SetEntry,
} from '@/features/sessions/formState';
import { newId } from '@/lib/id';
import { todayKey } from '@/lib/dates';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

// The Expo SQLite driver runs transactions synchronously: it commits as soon as
// the callback returns. So every transaction callback below is sync and ends each
// statement in .run(). An async callback would commit after its first statement.

// Whitespace-only text is stored as missing, never as an empty string.
const textOrNull = (value: string): string | null => (value.trim() === '' ? null : value);

const toInt = (value: string): number | null => {
  const n = parseInt(value.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};

const toNumber = (value: string): number | null => {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

// Maps a set from the form to its columns. Which column holds the main number
// depends on the exercise's kind. Sets with nothing entered are dropped.
function setColumns(kind: SetKind, set: SetEntry) {
  const reps = toInt(set.reps);
  const amount = toNumber(set.amount);
  const base = {
    reps: null as number | null,
    weight: null as number | null,
    weightUnit: null as 'kg' | 'lb' | null,
    addedLoad: null as number | null,
    durationSeconds: null as number | null,
    distanceMeters: null as number | null,
  };
  switch (kind) {
    case 'reps_weight':
      return { ...base, reps, weight: amount, weightUnit: amount === null ? null : ('kg' as const) };
    case 'added_load':
      return { ...base, reps, addedLoad: amount, weightUnit: amount === null ? null : ('kg' as const) };
    case 'bodyweight':
      return { ...base, reps };
    case 'time':
      return { ...base, durationSeconds: amount === null ? null : Math.round(amount) };
    case 'distance':
      return { ...base, distanceMeters: amount };
  }
}

function isEmptySet(kind: SetKind, set: SetEntry): boolean {
  const c = setColumns(kind, set);
  return (
    c.reps === null &&
    c.weight === null &&
    c.addedLoad === null &&
    c.durationSeconds === null &&
    c.distanceMeters === null
  );
}

// ---------- Outbox ----------

// Queue an entity for the server. Saving the same entity again replaces its
// queue entry, so there is at most one per entity and retries stay idempotent.
function enqueue(
  tx: Tx | Db,
  entity: 'category' | 'session_type' | 'exercise' | 'session',
  entityId: string,
) {
  tx.insert(outbox)
    .values({ entity, entityId, status: 'pending', attempts: 0, createdAt: new Date() })
    .onConflictDoUpdate({
      target: [outbox.entity, outbox.entityId],
      set: { status: 'pending', attempts: 0, lastError: null },
    })
    .run();
}

// ---------- Drafts ----------

export async function saveDraft(sessionId: string, isEdit: boolean, form: SessionForm) {
  const payload = JSON.stringify(form);
  await db
    .insert(drafts)
    .values({ sessionId, isEdit, payload, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: drafts.sessionId,
      set: { isEdit, payload, updatedAt: new Date() },
    });
}

export async function deleteDraft(sessionId: string) {
  await db.delete(drafts).where(eq(drafts.sessionId, sessionId));
}

export async function getDraft(sessionId: string) {
  const row = await db.query.drafts.findFirst({ where: eq(drafts.sessionId, sessionId) });
  if (!row) return null;
  return { isEdit: row.isEdit, form: parseDraftPayload(row.payload, todayKey()) };
}

// ---------- Categories ----------

// Returns the existing category when the name already exists (any letter case),
// so adding a custom category can never create a near-duplicate.
export async function createCategory(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${trimmed})`)
    .limit(1);
  const found = existing[0];
  if (found) {
    if (found.deletedAt) {
      const restoredId = found.id;
      db.transaction((tx) => {
        tx.update(categories)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(eq(categories.id, restoredId))
          .run();
        enqueue(tx, 'category', restoredId);
      });
    }
    return found.id;
  }
  const id = newId();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(categories).values({ id, name: trimmed, createdAt: now, updatedAt: now }).run();
    enqueue(tx, 'category', id);
  });
  return id;
}

export async function createSessionType(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await db
    .select()
    .from(sessionTypes)
    .where(sql`lower(${sessionTypes.name}) = lower(${trimmed})`)
    .limit(1);
  if (existing[0]) return existing[0].id;
  const id = newId();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(sessionTypes).values({ id, name: trimmed, createdAt: now, updatedAt: now }).run();
    enqueue(tx, 'session_type', id);
  });
  return id;
}

// ---------- Sessions ----------

// Writes the session, its session types and its outbox entry in one transaction,
// then drops the draft. If anything fails nothing is written and the draft stays.
//
// The saved session stays in the outbox until the server confirms it, and shows
// as "Waiting to sync" in History. It is not "submitted" until then.
export async function saveSession(sessionId: string, form: SessionForm): Promise<void> {
  if (!canSave(form) || form.categoryId === null) {
    throw new Error('A session needs a training date and a category.');
  }
  const categoryId = form.categoryId;
  const now = new Date();

  db.transaction((tx) => {
    const fields = {
      trainingDate: form.trainingDate,
      categoryId,
      trainingFocus: textOrNull(form.trainingFocus),
      durationMinutes: form.durationMinutes,
      techniques: textOrNull(form.techniques),
      selfAssessment: textOrNull(form.selfAssessment),
      coachFeedback: textOrNull(form.coachFeedback),
      injuryNotes: textOrNull(form.injuryNotes),
      proudOf: textOrNull(form.proudOf),
      toImprove: textOrNull(form.toImprove),
      rating: form.rating,
      moodScale: form.moodScale,
      updatedAt: now,
    };

    // createdAt, source and submittedAt are only set on first insert.
    tx.insert(sessions)
      .values({ id: sessionId, ...fields, source: 'app', createdAt: now })
      .onConflictDoUpdate({ target: sessions.id, set: fields })
      .run();

    tx.delete(sessionTypeAssignments).where(eq(sessionTypeAssignments.sessionId, sessionId)).run();
    if (form.sessionTypeIds.length > 0) {
      tx.insert(sessionTypeAssignments)
        .values(form.sessionTypeIds.map((sessionTypeId) => ({ sessionId, sessionTypeId })))
        .run();
    }

    // Exercises are replaced as a whole: the form holds the full list, so the
    // saved list always matches it. Deleting a session exercise removes its sets.
    tx.delete(sessionExercises).where(eq(sessionExercises.sessionId, sessionId)).run();
    form.exercises.forEach((entry: ExerciseEntry, position) => {
      tx.insert(sessionExercises)
        .values({
          id: entry.id,
          sessionId,
          exerciseId: entry.exerciseId,
          position,
          notes: textOrNull(entry.notes),
          createdAt: now,
          updatedAt: now,
        })
        .run();
      // A row that stands for several identical sets becomes that many rows. The
      // first keeps the row's id; the others get new ones. A top set is a single
      // set, so a repeated row is never top.
      const sets = entry.sets
        .filter((set) => !isEmptySet(entry.kind, set))
        .flatMap((set) => {
          const n = setCount(set);
          return Array.from({ length: n }, (_, i) => ({
            ...set,
            id: i === 0 ? set.id : newId(),
            isTop: n === 1 && set.isTop,
          }));
        });
      if (sets.length > 0) {
        tx.insert(exerciseSets)
          .values(
            sets.map((set, i) => ({
              id: set.id,
              sessionExerciseId: entry.id,
              position: i,
              kind: entry.kind,
              isTop: set.isTop,
              ...setColumns(entry.kind, set),
              createdAt: now,
              updatedAt: now,
            })),
          )
          .run();
      }
    });

    enqueue(tx, 'session', sessionId);
    tx.delete(drafts).where(eq(drafts.sessionId, sessionId)).run();
  });
}

// Soft delete, so the deletion can sync. History and analytics skip deleted rows.
export async function deleteSession(sessionId: string): Promise<void> {
  const now = new Date();
  db.transaction((tx) => {
    tx.update(sessions)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(sessions.id, sessionId), isNull(sessions.deletedAt)))
      .run();
    enqueue(tx, 'session', sessionId);
    tx.delete(drafts).where(eq(drafts.sessionId, sessionId)).run();
  });
}

// ---------- Exercises ----------

// Adds a custom exercise to the athlete's own list. Returns the existing exercise
// when the name already exists (any letter case), so the master list and custom
// ones can never hold near-duplicates.
export async function createExercise(
  name: string,
  muscleGroup: string | null,
  defaultKind: SetKind,
): Promise<string> {
  const trimmed = name.trim();
  const existing = await db
    .select()
    .from(exercises)
    .where(sql`lower(${exercises.name}) = lower(${trimmed})`)
    .limit(1);
  const found = existing[0];
  if (found) {
    if (found.deletedAt) {
      const restoredId = found.id;
      db.transaction((tx) => {
        tx.update(exercises)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(eq(exercises.id, restoredId))
          .run();
        enqueue(tx, 'exercise', restoredId);
      });
    }
    return found.id;
  }
  const id = newId();
  const now = new Date();
  db.transaction((tx) => {
    tx.insert(exercises)
      .values({ id, name: trimmed, isCustom: true, muscleGroup, defaultKind, createdAt: now, updatedAt: now })
      .run();
    enqueue(tx, 'exercise', id);
  });
  return id;
}

// ---------- Removing custom categories and session types ----------

export type RemoveResult = { ok: true } | { ok: false; usedBy: number };

// A category that sessions still use is never removed, so history never loses a
// label. Removing is a soft delete (it can sync), and only sessions that are not
// themselves deleted count as using it.
export async function deleteCategory(categoryId: string): Promise<RemoveResult> {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(sessions)
    .where(and(eq(sessions.categoryId, categoryId), isNull(sessions.deletedAt)))
    .get();
  const usedBy = row?.n ?? 0;
  if (usedBy > 0) return { ok: false, usedBy };
  const now = new Date();
  db.transaction((tx) => {
    tx.update(categories)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .run();
    enqueue(tx, 'category', categoryId);
  });
  return { ok: true };
}

export async function deleteSessionType(sessionTypeId: string): Promise<RemoveResult> {
  const row = db
    .select({ n: sql<number>`count(distinct ${sessions.id})` })
    .from(sessionTypeAssignments)
    .innerJoin(sessions, eq(sessions.id, sessionTypeAssignments.sessionId))
    .where(and(eq(sessionTypeAssignments.sessionTypeId, sessionTypeId), isNull(sessions.deletedAt)))
    .get();
  const usedBy = row?.n ?? 0;
  if (usedBy > 0) return { ok: false, usedBy };
  const now = new Date();
  db.transaction((tx) => {
    tx.update(sessionTypes)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(sessionTypes.id, sessionTypeId), isNull(sessionTypes.deletedAt)))
      .run();
    enqueue(tx, 'session_type', sessionTypeId);
  });
  return { ok: true };
}
