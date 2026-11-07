import { and, gte, inArray, isNull, lte, sql, type SQL, type SQLWrapper } from 'drizzle-orm';

import {
  categories,
  exercises,
  sessionExercises,
  sessions,
  sessionTypeAssignments,
  sessionTypes,
} from '@/db/schema';
import { addDays, fromDateKey, monthDays, todayKey, weekStartKey } from '@/lib/dates';

// What the History list is narrowed by. Everything is optional, and an empty
// filter shows every session.
export type HistoryFilters = {
  // Words to look for. Every word must appear somewhere in the session.
  query: string;
  // Sessions in any of these categories. Empty means all categories.
  categoryIds: string[];
  // Inclusive training-date range as 'YYYY-MM-DD'. Null means unbounded.
  from: string | null;
  to: string | null;
};

export const NO_FILTERS: HistoryFilters = { query: '', categoryIds: [], from: null, to: null };

export function hasActiveFilters(f: HistoryFilters): boolean {
  return f.query.trim() !== '' || f.categoryIds.length > 0 || f.from !== null || f.to !== null;
}

// "%" and "_" are wildcards in LIKE, so a search for "50%" must not match "50 kg".
function likePattern(word: string): string {
  return `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// One word matches a session if it is in any of its text, its category or session
// type names, or the name of an exercise done in it.
function wordMatches(word: string): SQL {
  const pattern = likePattern(word);
  const like = (column: SQLWrapper) => sql`${column} like ${pattern} escape '\\'`;
  return sql`(${sql.join(
    [
      like(sessions.trainingFocus),
      like(sessions.techniques),
      like(sessions.selfAssessment),
      like(sessions.coachFeedback),
      like(sessions.coachName),
      like(sessions.injuryNotes),
      like(sessions.proudOf),
      like(sessions.toImprove),
      like(sessions.moodText),
      like(categories.name),
      sql`exists (select 1 from ${sessionTypeAssignments}
        inner join ${sessionTypes} on ${sessionTypes.id} = ${sessionTypeAssignments.sessionTypeId}
        where ${sessionTypeAssignments.sessionId} = ${sessions.id}
        and ${sessionTypes.name} like ${pattern} escape '\\')`,
      sql`exists (select 1 from ${sessionExercises}
        inner join ${exercises} on ${exercises.id} = ${sessionExercises.exerciseId}
        where ${sessionExercises.sessionId} = ${sessions.id}
        and ${exercises.name} like ${pattern} escape '\\')`,
    ],
    sql` or `,
  )})`;
}

// The WHERE clause for the History list. Deleted sessions are always excluded.
// The query must join the categories table, which the History query does.
export function buildHistoryWhere(f: HistoryFilters): SQL {
  const words = f.query.trim().split(/\s+/).filter(Boolean);
  const conditions: (SQL | undefined)[] = [
    isNull(sessions.deletedAt),
    ...words.map(wordMatches),
    f.categoryIds.length > 0 ? inArray(sessions.categoryId, f.categoryIds) : undefined,
    f.from ? gte(sessions.trainingDate, f.from) : undefined,
    f.to ? lte(sessions.trainingDate, f.to) : undefined,
  ];
  // and() skips undefined, and always has the deleted check, so it is never empty.
  return and(...conditions) as SQL;
}

// ---------- date range presets ----------

export type DatePreset = {
  id: 'week' | 'last7' | 'month' | 'lastMonth' | 'last3Months';
  label: string;
};

export const DATE_PRESETS: readonly DatePreset[] = [
  { id: 'week', label: 'This week' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'last3Months', label: 'Last 3 months' },
];

// The training-date range a preset stands for, relative to `today`. Weeks start
// on Monday, like everywhere else in the app.
export function presetRange(
  id: DatePreset['id'],
  today: string = todayKey(),
): { from: string; to: string } {
  const [y, m] = today.split('-').map(Number);
  const monthKey = (year: number, month0: number, last: boolean) => {
    const days = monthDays(year, month0).filter((d): d is string => d !== null);
    return last ? days[days.length - 1] : days[0];
  };
  switch (id) {
    case 'week':
      return { from: weekStartKey(today), to: today };
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'month':
      return { from: monthKey(y, m - 1, false), to: today };
    case 'lastMonth': {
      const prev = new Date(y, m - 2, 1);
      return {
        from: monthKey(prev.getFullYear(), prev.getMonth(), false),
        to: monthKey(prev.getFullYear(), prev.getMonth(), true),
      };
    }
    case 'last3Months': {
      const start = new Date(y, m - 3, 1);
      return { from: monthKey(start.getFullYear(), start.getMonth(), false), to: today };
    }
  }
}

// Which preset (if any) the current range equals, so the sheet can highlight it.
export function matchingPreset(
  from: string | null,
  to: string | null,
  today: string = todayKey(),
): DatePreset['id'] | null {
  if (from === null || to === null) return null;
  const found = DATE_PRESETS.find((p) => {
    const r = presetRange(p.id, today);
    return r.from === from && r.to === to;
  });
  return found ? found.id : null;
}

// "12 Oct", or "12 Oct 2025" when it is not this year.
function shortDate(key: string): string {
  const date = fromDateKey(key);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

// The text on the Date filter chip: a preset's name, or the dates themselves.
export function formatRange(
  from: string | null,
  to: string | null,
  today: string = todayKey(),
): string {
  const preset = matchingPreset(from, to, today);
  if (preset) return DATE_PRESETS.find((p) => p.id === preset)?.label ?? 'Date';
  if (from && to) return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
  if (from) return `From ${shortDate(from)}`;
  if (to) return `Until ${shortDate(to)}`;
  return 'Date';
}
