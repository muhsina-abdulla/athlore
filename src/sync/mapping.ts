import { asc, eq } from 'drizzle-orm';

import type { Db } from '@/db/client';
import {
  exerciseSets,
  sessionExercises,
  sessions,
  sessionTypeAssignments,
  type SetKind,
} from '@/db/schema';
import type { RemoteRow, SessionPayload } from '@/sync/remote';

// ---------- reading values from server rows ----------
// Server rows arrive as plain JSON, so each value is checked rather than trusted.

export const str = (row: RemoteRow, key: string): string | null => {
  const value = row[key];
  return typeof value === 'string' ? value : null;
};

export const num = (row: RemoteRow, key: string): number | null => {
  const value = row[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  // Postgres numeric values can arrive as strings.
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};

export const bool = (row: RemoteRow, key: string): boolean => row[key] === true;

export const date = (row: RemoteRow, key: string): Date | null => {
  const value = str(row, key);
  if (value === null) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const iso = (value: Date | null | undefined): string | null => (value ? value.toISOString() : null);

// ---------- local rows to server rows ----------

type LookupRow = { id: string; name: string; createdAt: Date; deletedAt: Date | null };

export function lookupToRemote(row: LookupRow): RemoteRow {
  return {
    id: row.id,
    name: row.name,
    created_at: iso(row.createdAt),
    deleted_at: iso(row.deletedAt),
  };
}

export function exerciseToRemote(row: LookupRow & {
  isCustom: boolean;
  muscleGroup: string | null;
  defaultKind: SetKind;
}): RemoteRow {
  return {
    ...lookupToRemote(row),
    is_custom: row.isCustom,
    muscle_group: row.muscleGroup,
    default_kind: row.defaultKind,
  };
}

// Reads a session and everything under it from the phone's database, in the shape
// the server's push_session function takes. `updatedAt` is when the session was last
// changed, so the engine can tell if the user edited it while the push was running.
// user_id, submitted_at and updated_at are left out: the server owns them.
export function buildSessionPayload(
  db: Db,
  sessionId: string,
): { payload: SessionPayload; updatedAt: number } | null {
  const s = db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!s) return null;

  const types = db
    .select({ id: sessionTypeAssignments.sessionTypeId })
    .from(sessionTypeAssignments)
    .where(eq(sessionTypeAssignments.sessionId, sessionId))
    .all();

  const exercises = db
    .select()
    .from(sessionExercises)
    .where(eq(sessionExercises.sessionId, sessionId))
    .orderBy(asc(sessionExercises.position))
    .all();

  const sets = db
    .select({ set: exerciseSets })
    .from(exerciseSets)
    .innerJoin(sessionExercises, eq(sessionExercises.id, exerciseSets.sessionExerciseId))
    .where(eq(sessionExercises.sessionId, sessionId))
    .all()
    .map((r) => r.set);

  return {
    updatedAt: s.updatedAt.getTime(),
    payload: {
      session: {
        id: s.id,
        training_date: s.trainingDate,
        category_id: s.categoryId,
        training_focus: s.trainingFocus,
        duration_minutes: s.durationMinutes,
        duration_raw: s.durationRaw,
        techniques: s.techniques,
        self_assessment: s.selfAssessment,
        coach_feedback: s.coachFeedback,
        coach_name: s.coachName,
        injury_notes: s.injuryNotes,
        proud_of: s.proudOf,
        to_improve: s.toImprove,
        rating: s.rating,
        mood_scale: s.moodScale,
        mood_text: s.moodText,
        source: s.source,
        created_at: iso(s.createdAt),
        deleted_at: iso(s.deletedAt),
      },
      session_type_ids: types.map((t) => t.id),
      exercises: exercises.map((e) => ({
        id: e.id,
        exercise_id: e.exerciseId,
        position: e.position,
        notes: e.notes,
        created_at: iso(e.createdAt),
      })),
      sets: sets.map((x) => ({
        id: x.id,
        session_exercise_id: x.sessionExerciseId,
        position: x.position,
        kind: x.kind,
        is_top: x.isTop,
        reps: x.reps,
        weight: x.weight,
        weight_unit: x.weightUnit,
        added_load: x.addedLoad,
        duration_seconds: x.durationSeconds,
        distance_m: x.distanceMeters,
        created_at: iso(x.createdAt),
      })),
    },
  };
}
