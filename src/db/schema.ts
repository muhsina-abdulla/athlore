import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Local SQLite schema. It mirrors the Supabase schema (docs/architecture.md).
// - ids are client-generated UUIDs, so a retried push can never duplicate a row
// - deletes are soft (deletedAt) so they can sync
// - timestamps are epoch milliseconds
// - user_id is not stored locally: the server sets it from the signed-in user

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  deletedAt: integer('deleted_at', { mode: 'timestamp_ms' }),
};

export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('categories_name_unique').on(sql`lower(${t.name})`)],
);

// The athlete's session types: the shared defaults plus their own. (The table is
// named user_session_types; the TypeScript name stays short.)
export const sessionTypes = sqliteTable(
  'user_session_types',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('user_session_types_name_unique').on(sql`lower(${t.name})`)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    // 'YYYY-MM-DD' in the athlete's local calendar. All history, sorting and
    // analytics use this, never createdAt or submittedAt.
    trainingDate: text('training_date').notNull(),
    // Required for app sessions. Null only for migrated legacy rows.
    categoryId: text('category_id').references(() => categories.id),
    trainingFocus: text('training_focus'),
    durationMinutes: integer('duration_minutes'),
    // Legacy duration text, kept verbatim next to the parsed value.
    durationRaw: text('duration_raw'),
    techniques: text('techniques'),
    selfAssessment: text('self_assessment'),
    coachFeedback: text('coach_feedback'),
    injuryNotes: text('injury_notes'),
    proudOf: text('proud_of'),
    toImprove: text('to_improve'),
    // Stored 1-10. The app shows it as 5 stars, and each point is half a star
    // (7 = three and a half stars). Legacy values keep their original numbers.
    rating: integer('rating'),
    // 1-5: Rough, Low, Okay, Good, Great (emotional mood). Legacy mood text goes in moodText.
    moodScale: integer('mood_scale'),
    moodText: text('mood_text'),
    source: text('source', { enum: ['app', 'legacy'] }).notNull().default('app'),
    // Set only when the server confirms the session. Null means not yet submitted.
    submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }),
    ...timestamps,
  },
  (t) => [
    index('sessions_training_date_idx').on(t.trainingDate),
    check('sessions_category_required', sql`${t.source} = 'legacy' OR ${t.categoryId} IS NOT NULL`),
    check('sessions_rating_range', sql`${t.rating} IS NULL OR (${t.rating} BETWEEN 1 AND 10)`),
    check('sessions_mood_range', sql`${t.moodScale} IS NULL OR (${t.moodScale} BETWEEN 1 AND 5)`),
  ],
);

// Which session types a session has (a session can have several).
export const sessionTypeAssignments = sqliteTable(
  'session_type_assignments',
  {
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    sessionTypeId: text('session_type_id')
      .notNull()
      .references(() => sessionTypes.id),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.sessionTypeId] })],
);

export const SET_KINDS = ['reps_weight', 'added_load', 'bodyweight', 'time', 'distance'] as const;
export type SetKind = (typeof SET_KINDS)[number];

export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    // Master-list exercises come from the app (isCustom = false); the athlete's
    // own additions are custom.
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    muscleGroup: text('muscle_group'),
    // How its sets are logged unless changed: weight, added load, bodyweight,
    // time or distance.
    defaultKind: text('default_kind', { enum: SET_KINDS }).notNull().default('reps_weight'),
    ...timestamps,
  },
  (t) => [uniqueIndex('exercises_name_unique').on(sql`lower(${t.name})`)],
);

export const sessionExercises = sqliteTable(
  'session_exercises',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [index('session_exercises_session_idx').on(t.sessionId)],
);

export const exerciseSets = sqliteTable(
  'exercise_sets',
  {
    id: text('id').primaryKey(),
    sessionExerciseId: text('session_exercise_id')
      .notNull()
      .references(() => sessionExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    kind: text('kind', { enum: SET_KINDS }).notNull(),
    isTop: integer('is_top', { mode: 'boolean' }).notNull().default(false),
    reps: integer('reps'),
    weight: real('weight'),
    weightUnit: text('weight_unit', { enum: ['kg', 'lb'] }),
    addedLoad: real('added_load'),
    durationSeconds: integer('duration_seconds'),
    distanceMeters: real('distance_m'),
    ...timestamps,
  },
  (t) => [index('exercise_sets_session_exercise_idx').on(t.sessionExerciseId)],
);

// ---------- Local only (never synced) ----------

// One autosaved form per session being written or edited. The id is the
// session's own id, so a draft turns into its session without re-keying.
export const drafts = sqliteTable('drafts', {
  sessionId: text('session_id').primaryKey(),
  // true when the draft edits a session that already exists.
  isEdit: integer('is_edit', { mode: 'boolean' }).notNull().default(false),
  payload: text('payload').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

// Work waiting to reach the server. One row per entity; saving again replaces it.
export const outbox = sqliteTable(
  'outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entity: text('entity', { enum: ['category', 'session_type', 'exercise', 'session'] }).notNull(),
    entityId: text('entity_id').notNull(),
    status: text('status', { enum: ['pending', 'in_flight', 'failed'] })
      .notNull()
      .default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('outbox_entity_unique').on(t.entity, t.entityId)],
);

export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
