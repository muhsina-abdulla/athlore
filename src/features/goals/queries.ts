import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { categories, goals, milestoneSessions, milestones, sessions } from '@/db/schema';
import {
  parseCriteria,
  progressOf,
  type Criteria,
  type Progress,
  type SessionFact,
} from '@/features/goals/criteria';

// Every hook here is live: screens update when rows change.

// The sessions measurable milestones count. Deleted sessions never count.
export function useSessionFacts(): SessionFact[] {
  const { data } = useLiveQuery(
    db
      .select({
        id: sessions.id,
        trainingDate: sessions.trainingDate,
        categoryId: sessions.categoryId,
        durationMinutes: sessions.durationMinutes,
      })
      .from(sessions)
      .where(isNull(sessions.deletedAt)),
  );
  return data;
}

export function useGoals() {
  const { data } = useLiveQuery(
    db
      .select()
      .from(goals)
      .where(and(isNull(goals.deletedAt), isNull(goals.archivedAt)))
      .orderBy(asc(goals.position), asc(goals.createdAt)),
  );
  return data;
}

export type MilestoneItem = {
  id: string;
  goalId: string;
  position: number;
  title: string;
  kind: 'measurable' | 'skill';
  criteria: Criteria | null;
  completedAt: Date | null;
  completedBy: 'auto' | 'manual' | null;
};

// Milestones of goals that still exist, in path order.
export function useMilestones(): MilestoneItem[] {
  const { data } = useLiveQuery(
    db
      .select({
        id: milestones.id,
        goalId: milestones.goalId,
        position: milestones.position,
        title: milestones.title,
        kind: milestones.kind,
        criteria: milestones.criteria,
        completedAt: milestones.completedAt,
        completedBy: milestones.completedBy,
      })
      .from(milestones)
      .innerJoin(goals, eq(goals.id, milestones.goalId))
      .where(and(isNull(milestones.deletedAt), isNull(goals.deletedAt), isNull(goals.archivedAt)))
      .orderBy(asc(milestones.position), asc(milestones.createdAt)),
  );
  return data.map(({ criteria, ...row }) => ({ ...row, criteria: parseCriteria(criteria) }));
}

// How far along a milestone is. Skill milestones are done or not; measurable ones
// count the training history.
export function milestoneProgress(m: MilestoneItem, facts: SessionFact[]): Progress | null {
  if (m.kind === 'skill' || !m.criteria) return null;
  const progress = progressOf(m.criteria, facts);
  // A milestone that was completed stays completed, even if sessions were deleted later.
  return m.completedAt ? { ...progress, fraction: 1, met: true } : progress;
}

export function fractionOf(m: MilestoneItem, facts: SessionFact[]): number {
  if (m.completedAt) return 1;
  return milestoneProgress(m, facts)?.fraction ?? 0;
}

export type GoalSummary = {
  done: number;
  total: number;
  // The first milestone not yet completed.
  next: MilestoneItem | null;
};

export function summarizeGoal(path: MilestoneItem[]): GoalSummary {
  const done = path.filter((m) => m.completedAt).length;
  return { done, total: path.length, next: path.find((m) => !m.completedAt) ?? null };
}

export function useCategoryNames(): Map<string, string> {
  const { data } = useLiveQuery(
    db.select({ id: categories.id, name: categories.name }).from(categories),
  );
  return new Map(data.map((c) => [c.id, c.name]));
}

// ---------- Sessions linked to a milestone ----------

export type LinkedSession = {
  id: string;
  trainingDate: string;
  trainingFocus: string | null;
  categoryName: string | null;
};

export function useLinkedSessions(milestoneId: string | null): LinkedSession[] {
  const { data } = useLiveQuery(
    db
      .select({
        id: sessions.id,
        trainingDate: sessions.trainingDate,
        trainingFocus: sessions.trainingFocus,
        categoryName: categories.name,
      })
      .from(milestoneSessions)
      .innerJoin(sessions, eq(sessions.id, milestoneSessions.sessionId))
      .leftJoin(categories, eq(categories.id, sessions.categoryId))
      .where(
        and(
          // An id that matches nothing, while no milestone is open.
          eq(milestoneSessions.milestoneId, milestoneId ?? ''),
          isNull(sessions.deletedAt),
        ),
      )
      .orderBy(desc(sessions.trainingDate)),
    [milestoneId],
  );
  return data;
}
