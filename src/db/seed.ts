import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SESSION_TYPES,
  RETIRED_CATEGORY_IDS,
  RETIRED_SESSION_TYPE_IDS,
} from '@/db/defaults';
import { DEFAULT_EXERCISES } from '@/db/defaultExercises';
import { categories, exercises, sessions, sessionTypeAssignments, sessionTypes } from '@/db/schema';

// Safe to run on every launch. It brings the default lists up to date without
// touching anything the athlete made:
//   1. a default that was renamed in a newer version is renamed in place (same id)
//   2. missing defaults are added; existing rows are never overwritten
//   3. defaults that are no longer offered are hidden, but only if no session
//      uses them, so history never loses a label
// Defaults are not pushed through the outbox: the server applies the same changes.
export async function seedDefaults() {
  const now = new Date();
  const stamp = { createdAt: now, updatedAt: now };

  // 1. Renames. A rename that would clash with a custom entry of the same name is
  // skipped; the default then keeps its old name rather than failing startup.
  for (const c of DEFAULT_CATEGORIES) {
    try {
      await db
        .update(categories)
        .set({ name: c.name, updatedAt: now })
        .where(and(eq(categories.id, c.id), ne(categories.name, c.name)));
    } catch {
      // name already taken by a custom category
    }
  }
  for (const t of DEFAULT_SESSION_TYPES) {
    try {
      await db
        .update(sessionTypes)
        .set({ name: t.name, updatedAt: now })
        .where(and(eq(sessionTypes.id, t.id), ne(sessionTypes.name, t.name)));
    } catch {
      // name already taken by a custom session type
    }
  }

  // 2. Additions.
  await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES.map((c) => ({ ...c, ...stamp })))
    .onConflictDoNothing();
  await db
    .insert(sessionTypes)
    .values(DEFAULT_SESSION_TYPES.map((t) => ({ ...t, ...stamp })))
    .onConflictDoNothing();
  await db
    .insert(exercises)
    .values(DEFAULT_EXERCISES.map((e) => ({ ...e, isCustom: false, ...stamp })))
    .onConflictDoNothing();

  // 3. Retirements.
  await db
    .update(categories)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        inArray(categories.id, [...RETIRED_CATEGORY_IDS]),
        isNull(categories.deletedAt),
        sql`not exists (select 1 from ${sessions} where ${sessions.categoryId} = ${categories.id})`,
      ),
    );
  await db
    .update(sessionTypes)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        inArray(sessionTypes.id, [...RETIRED_SESSION_TYPE_IDS]),
        isNull(sessionTypes.deletedAt),
        sql`not exists (select 1 from ${sessionTypeAssignments} where ${sessionTypeAssignments.sessionTypeId} = ${sessionTypes.id})`,
      ),
    );
}
