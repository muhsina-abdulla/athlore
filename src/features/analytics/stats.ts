import { addDays, fromDateKey, weekStartKey } from '@/lib/dates';

// Training analysis computed from the sessions that were logged. Everything here uses
// the training date, and keeps sessions and training days apart: two sessions on one
// day are two sessions but one training day.

export type StatFact = {
  id: string;
  trainingDate: string;
  categoryName: string | null;
  durationMinutes: number | null;
  rating: number | null;
  typeNames: string[];
};

export type RangeKey = '4w' | '12w' | 'all';

export const RANGE_LABEL: Record<RangeKey, string> = {
  '4w': 'Last 4 weeks',
  '12w': 'Last 12 weeks',
  all: 'All time',
};

const WEEKS: Record<Exclude<RangeKey, 'all'>, number> = { '4w': 4, '12w': 12 };
// How many weeks the weekly view shows when the range is all time.
const ALL_TIME_WEEKS = 12;

// First day included, or null for everything. A "week" is Monday to Sunday and the
// current week counts as one of them.
export function rangeStart(range: RangeKey, today: string): string | null {
  if (range === 'all') return null;
  return addDays(weekStartKey(today), -(WEEKS[range] - 1) * 7);
}

export type Share = { name: string; sessions: number; trainingDays: number; minutes: number };
export type Week = { weekStart: string; sessions: number; trainingDays: number };
export type MonthRating = { month: string; average: number; rated: number };

export type Stats = {
  sessions: number;
  trainingDays: number;
  totalMinutes: number;
  // Sessions that have a duration; hours only cover those.
  withDuration: number;
  averageMinutes: number | null;
  averageRating: number | null;
  rated: number;
  byCategory: Share[];
  byType: Share[];
  weeks: Week[];
  activeWeeks: number;
  streakWeeks: number;
  daysPerWeek: number;
  ratingByMonth: MonthRating[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function shares(
  facts: StatFact[],
  namesOf: (f: StatFact) => string[],
  fallback: string,
): Share[] {
  const map = new Map<string, { ids: number; dates: Set<string>; minutes: number }>();
  for (const f of facts) {
    const names = namesOf(f);
    for (const name of names.length > 0 ? names : [fallback]) {
      const entry = map.get(name) ?? { ids: 0, dates: new Set<string>(), minutes: 0 };
      entry.ids += 1;
      entry.dates.add(f.trainingDate);
      entry.minutes += f.durationMinutes ?? 0;
      map.set(name, entry);
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, sessions: v.ids, trainingDays: v.dates.size, minutes: v.minutes }))
    .sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));
}

export function computeStats(allFacts: StatFact[], range: RangeKey, today: string): Stats {
  const start = rangeStart(range, today);
  const facts = allFacts.filter(
    (f) => f.trainingDate <= today && (start === null || f.trainingDate >= start),
  );

  const days = new Set(facts.map((f) => f.trainingDate));
  const durations = facts.filter((f) => f.durationMinutes !== null);
  const totalMinutes = durations.reduce((s, f) => s + (f.durationMinutes ?? 0), 0);
  const ratings = facts.filter((f) => f.rating !== null);
  const ratingSum = ratings.reduce((s, f) => s + (f.rating ?? 0), 0);

  // Weekly view: the weeks in range (the last 12 for all time), oldest first.
  const thisWeek = weekStartKey(today);
  const weekCount = range === 'all' ? ALL_TIME_WEEKS : WEEKS[range];
  const weeks: Week[] = Array.from({ length: weekCount }, (_, i) => {
    const weekStart = addDays(thisWeek, -(weekCount - 1 - i) * 7);
    const end = addDays(weekStart, 6);
    const inWeek = allFacts.filter((f) => f.trainingDate >= weekStart && f.trainingDate <= end);
    return {
      weekStart,
      sessions: inWeek.length,
      trainingDays: new Set(inWeek.map((f) => f.trainingDate)).size,
    };
  });

  // Weeks in a row with training, counted back from this week (or from last week while
  // this one is still empty, so a Monday doesn't read as a broken streak).
  let streakWeeks = 0;
  let i = weeks.length - 1;
  if (i >= 0 && weeks[i].sessions === 0) i -= 1;
  while (i >= 0 && weeks[i].sessions > 0) {
    streakWeeks += 1;
    i -= 1;
  }

  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const f of ratings) {
    const month = f.trainingDate.slice(0, 7);
    const entry = byMonth.get(month) ?? { sum: 0, n: 0 };
    entry.sum += f.rating ?? 0;
    entry.n += 1;
    byMonth.set(month, entry);
  }
  const ratingByMonth = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({ month, average: round1(v.sum / v.n), rated: v.n }));

  const activeWeeks = weeks.filter((w) => w.sessions > 0).length;
  return {
    sessions: facts.length,
    trainingDays: days.size,
    totalMinutes,
    withDuration: durations.length,
    averageMinutes: durations.length > 0 ? Math.round(totalMinutes / durations.length) : null,
    averageRating: ratings.length > 0 ? round1(ratingSum / ratings.length) : null,
    rated: ratings.length,
    byCategory: shares(facts, (f) => (f.categoryName ? [f.categoryName] : []), 'No category'),
    byType: shares(facts, (f) => f.typeNames, 'No session type'),
    weeks,
    activeWeeks,
    streakWeeks,
    daysPerWeek: weeks.length > 0 ? round1(weeks.reduce((s, w) => s + w.trainingDays, 0) / weeks.length) : 0,
    ratingByMonth,
  };
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : String(round1(hours));
}

export function monthLabel(month: string): string {
  return fromDateKey(`${month}-01`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
