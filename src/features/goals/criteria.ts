// Measurable milestones: what they count, and how far along they are. Pure functions,
// so the same rules run in the app and in tests.

export const METRICS = ['sessions', 'training_days', 'hours'] as const;
export type Metric = (typeof METRICS)[number];

export const METRIC_LABEL: Record<Metric, string> = {
  sessions: 'Sessions',
  training_days: 'Training days',
  hours: 'Hours',
};

export type Criteria = {
  metric: Metric;
  target: number;
  // Only count this category. Null counts every category.
  categoryId: string | null;
  // Only count training on or after this date ('YYYY-MM-DD'). Null counts all history.
  since: string | null;
};

// What the criteria need to know about a session. Always the training date, never
// when it was created or submitted.
export type SessionFact = {
  id: string;
  trainingDate: string;
  categoryId: string | null;
  durationMinutes: number | null;
};

export type Progress = { current: number; target: number; fraction: number; met: boolean };

export function progressOf(criteria: Criteria, facts: SessionFact[]): Progress {
  const counted = facts.filter(
    (f) =>
      (criteria.categoryId === null || f.categoryId === criteria.categoryId) &&
      (criteria.since === null || f.trainingDate >= criteria.since),
  );

  let current: number;
  if (criteria.metric === 'sessions') {
    current = counted.length;
  } else if (criteria.metric === 'training_days') {
    // Several sessions on one day are one training day.
    current = new Set(counted.map((f) => f.trainingDate)).size;
  } else {
    const minutes = counted.reduce((sum, f) => sum + (f.durationMinutes ?? 0), 0);
    current = Math.round((minutes / 60) * 10) / 10;
  }

  const target = Math.max(criteria.target, 0);
  const fraction = target === 0 ? 1 : Math.min(current / target, 1);
  return { current, target, fraction, met: current >= target };
}

// Stored as JSON text. Anything unreadable is treated as "no criteria".
export function parseCriteria(json: string | null): Criteria | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json) as Partial<Criteria>;
    if (
      !METRICS.includes(value.metric as Metric) ||
      typeof value.target !== 'number' ||
      !(value.target > 0)
    ) {
      return null;
    }
    return {
      metric: value.metric as Metric,
      target: value.target,
      categoryId: typeof value.categoryId === 'string' ? value.categoryId : null,
      since: typeof value.since === 'string' ? value.since : null,
    };
  } catch {
    return null;
  }
}

export function serializeCriteria(criteria: Criteria): string {
  return JSON.stringify(criteria);
}

const trim = (n: number) => String(Number.isInteger(n) ? n : Math.round(n * 10) / 10);

// "20 sessions", "12 training days", "30 hours", with the category when there is one.
export function describeCriteria(criteria: Criteria, categoryName: string | null): string {
  const unit =
    criteria.metric === 'sessions'
      ? criteria.target === 1
        ? 'session'
        : 'sessions'
      : criteria.metric === 'training_days'
        ? criteria.target === 1
          ? 'training day'
          : 'training days'
        : criteria.target === 1
          ? 'hour'
          : 'hours';
  const base = `${trim(criteria.target)} ${unit}`;
  return categoryName ? `${base} of ${categoryName}` : base;
}

export function describeProgress(criteria: Criteria, progress: Progress): string {
  const unit =
    criteria.metric === 'sessions'
      ? 'sessions'
      : criteria.metric === 'training_days'
        ? 'days'
        : 'hours';
  return `${trim(progress.current)} of ${trim(progress.target)} ${unit}`;
}
