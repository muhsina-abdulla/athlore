import { asc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { categories, sessionTypeAssignments, sessions, sessionTypes } from '@/db/schema';
import type { StatFact } from '@/features/analytics/stats';

// Every logged session (deleted ones never count) with its category and session types.
export function useStatFacts(): StatFact[] {
  const { data: rows } = useLiveQuery(
    db
      .select({
        id: sessions.id,
        trainingDate: sessions.trainingDate,
        categoryName: categories.name,
        durationMinutes: sessions.durationMinutes,
        rating: sessions.rating,
      })
      .from(sessions)
      .leftJoin(categories, eq(categories.id, sessions.categoryId))
      .where(isNull(sessions.deletedAt))
      .orderBy(asc(sessions.trainingDate)),
  );
  const { data: assigned } = useLiveQuery(
    db
      .select({ sessionId: sessionTypeAssignments.sessionId, name: sessionTypes.name })
      .from(sessionTypeAssignments)
      .innerJoin(sessionTypes, eq(sessionTypes.id, sessionTypeAssignments.sessionTypeId)),
  );

  return useMemo(() => {
    const byId = new Map<string, string[]>();
    for (const a of assigned) byId.set(a.sessionId, [...(byId.get(a.sessionId) ?? []), a.name]);
    return rows.map((r) => ({ ...r, typeNames: byId.get(r.id) ?? [] }));
  }, [rows, assigned]);
}
