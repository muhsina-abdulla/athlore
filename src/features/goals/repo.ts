import { and, eq, isNull, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { goals, milestoneSessions, milestones, type MilestoneKind } from '@/db/schema';
import { serializeCriteria, type Criteria } from '@/features/goals/criteria';
import { newId } from '@/lib/id';

// The Expo SQLite driver runs transactions synchronously: every callback is sync and
// every statement ends in .run().

export async function createGoal(title: string): Promise<string | null> {
  const name = title.trim();
  if (name === '') return null;
  const [{ top }] = await db.select({ top: max(goals.position) }).from(goals);
  const id = newId();
  const now = new Date();
  await db.insert(goals).values({
    id,
    title: name,
    position: (top ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function renameGoal(id: string, title: string): Promise<void> {
  const name = title.trim();
  if (name === '') return;
  await db.update(goals).set({ title: name, updatedAt: new Date() }).where(eq(goals.id, id));
}

// Soft delete: the goal and its milestones are hidden, not erased.
export function deleteGoal(id: string): void {
  const now = new Date();
  db.transaction((tx) => {
    tx.update(milestones).set({ deletedAt: now, updatedAt: now }).where(eq(milestones.goalId, id)).run();
    tx.update(goals).set({ deletedAt: now, updatedAt: now }).where(eq(goals.id, id)).run();
  });
}

export type MilestoneInput = {
  title: string;
  kind: MilestoneKind;
  criteria: Criteria | null;
};

export async function addMilestone(goalId: string, input: MilestoneInput): Promise<void> {
  const title = input.title.trim();
  if (title === '') return;
  const [{ top }] = await db
    .select({ top: max(milestones.position) })
    .from(milestones)
    .where(and(eq(milestones.goalId, goalId), isNull(milestones.deletedAt)));
  const now = new Date();
  await db.insert(milestones).values({
    id: newId(),
    goalId,
    position: (top ?? -1) + 1,
    title,
    kind: input.kind,
    criteria: input.kind === 'measurable' && input.criteria ? serializeCriteria(input.criteria) : null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateMilestone(id: string, input: MilestoneInput): Promise<void> {
  const title = input.title.trim();
  if (title === '') return;
  await db
    .update(milestones)
    .set({
      title,
      kind: input.kind,
      criteria:
        input.kind === 'measurable' && input.criteria ? serializeCriteria(input.criteria) : null,
      // Changing what a milestone asks for reopens it; the next evaluation decides again.
      completedAt: null,
      completedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(milestones.id, id));
}

export async function deleteMilestone(id: string): Promise<void> {
  const now = new Date();
  await db.update(milestones).set({ deletedAt: now, updatedAt: now }).where(eq(milestones.id, id));
}

// A skill milestone is completed (or reopened) by hand.
export async function setSkillCompleted(id: string, completed: boolean): Promise<void> {
  const now = new Date();
  await db
    .update(milestones)
    .set({
      completedAt: completed ? now : null,
      completedBy: completed ? 'manual' : null,
      updatedAt: now,
    })
    .where(eq(milestones.id, id));
}

// Measurable milestones whose criteria are now met. Called by the evaluator.
export function completeAutomatically(ids: string[]): void {
  if (ids.length === 0) return;
  const now = new Date();
  db.transaction((tx) => {
    for (const id of ids) {
      tx.update(milestones)
        .set({ completedAt: now, completedBy: 'auto', updatedAt: now })
        .where(and(eq(milestones.id, id), isNull(milestones.completedAt)))
        .run();
    }
  });
}

export function setLinkedSessions(milestoneId: string, sessionIds: string[]): void {
  db.transaction((tx) => {
    tx.delete(milestoneSessions).where(eq(milestoneSessions.milestoneId, milestoneId)).run();
    for (const sessionId of sessionIds) {
      tx.insert(milestoneSessions).values({ milestoneId, sessionId }).run();
    }
  });
}

export async function getLinkedSessionIds(milestoneId: string): Promise<string[]> {
  const rows = await db
    .select({ sessionId: milestoneSessions.sessionId })
    .from(milestoneSessions)
    .where(eq(milestoneSessions.milestoneId, milestoneId));
  return rows.map((r) => r.sessionId);
}
