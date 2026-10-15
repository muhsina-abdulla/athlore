import type { MaterialIconsIconName } from '@react-native-vector-icons/material-icons';

// The log form's state. It is also the draft payload, so it must stay plain JSON.

import type { SetKind } from '@/db/schema';

// One row in an exercise's set table. Values are strings so half-typed numbers
// like "62." survive while typing; they are parsed when the session is saved.
export type SetEntry = {
  id: string;
  reps: string;
  // The set's main number, which depends on the exercise's kind: weight for
  // reps_weight, added load for added_load, seconds for time, metres for distance.
  amount: string;
  isTop: boolean;
  // How many identical sets this row stands for. Missing (older drafts) means 1.
  count?: number | null;
};

export type ExerciseEntry = {
  id: string;
  exerciseId: string;
  // Copied from the exercise so lists and drafts show it without a lookup.
  name: string;
  kind: SetKind;
  notes: string;
  sets: SetEntry[];
};

export type SessionForm = {
  trainingDate: string;
  categoryId: string | null;
  trainingFocus: string;
  durationMinutes: number | null;
  sessionTypeIds: string[];
  techniques: string;
  selfAssessment: string;
  coachFeedback: string;
  injuryNotes: string;
  proudOf: string;
  toImprove: string;
  rating: number | null;
  moodScale: number | null;
  exercises: ExerciseEntry[];
};

export function emptyForm(trainingDate: string): SessionForm {
  return {
    trainingDate,
    categoryId: null,
    trainingFocus: '',
    durationMinutes: null,
    sessionTypeIds: [],
    techniques: '',
    selfAssessment: '',
    coachFeedback: '',
    injuryNotes: '',
    proudOf: '',
    toImprove: '',
    rating: null,
    moodScale: null,
    exercises: [],
  };
}

// True once the user has entered anything beyond the default date. Untouched
// forms never become drafts.
export function hasContent(form: SessionForm): boolean {
  return (
    form.categoryId !== null ||
    form.trainingFocus.trim() !== '' ||
    form.durationMinutes !== null ||
    form.sessionTypeIds.length > 0 ||
    form.techniques.trim() !== '' ||
    form.selfAssessment.trim() !== '' ||
    form.coachFeedback.trim() !== '' ||
    form.injuryNotes.trim() !== '' ||
    form.proudOf.trim() !== '' ||
    form.toImprove.trim() !== '' ||
    form.rating !== null ||
    form.moodScale !== null ||
    form.exercises.length > 0
  );
}

export function canSave(form: SessionForm): boolean {
  return form.categoryId !== null && form.trainingDate !== '';
}

// Draft payloads are parsed defensively: a draft written by an older version of
// the app must still open rather than crash or be lost.
export function parseDraftPayload(payload: string, fallbackDate: string): SessionForm {
  const base = emptyForm(fallbackDate);
  try {
    const raw = JSON.parse(payload) as Partial<SessionForm>;
    return {
      ...base,
      ...raw,
      sessionTypeIds: Array.isArray(raw.sessionTypeIds) ? raw.sessionTypeIds : [],
      // Drafts written before exercises existed have none.
      exercises: Array.isArray(raw.exercises) ? raw.exercises : [],
    };
  } catch {
    return base;
  }
}

// How the athlete felt emotionally after training, not how tired the body is.
// Stored as 1-5; only these labels and icons are for display, so they can change
// without touching saved data.
export const MOODS: readonly { value: number; label: string; icon: MaterialIconsIconName }[] = [
  { value: 1, label: 'Rough', icon: 'sentiment-very-dissatisfied' },
  { value: 2, label: 'Low', icon: 'sentiment-dissatisfied' },
  { value: 3, label: 'Okay', icon: 'sentiment-neutral' },
  { value: 4, label: 'Good', icon: 'sentiment-satisfied' },
  { value: 5, label: 'Great', icon: 'sentiment-very-satisfied' },
];

export const DURATION_PRESETS = [
  { minutes: 60, label: '1 hr' },
  { minutes: 90, label: '1.5 hr' },
  { minutes: 120, label: '2 hr' },
  { minutes: 150, label: '2.5 hr' },
  { minutes: 180, label: '3 hr' },
] as const;

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function formatMinutesTotal(minutes: number | null): string {
  if (minutes === null) return '';
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} total`;
}

// How each kind of set is logged: which columns the set table shows.
export const KIND_META: Record<
  SetKind,
  { label: string; showReps: boolean; amountLabel: string | null; amountPrefix?: string }
> = {
  reps_weight: { label: 'Weight', showReps: true, amountLabel: 'kg' },
  added_load: { label: '+ Load', showReps: true, amountLabel: 'kg', amountPrefix: '+' },
  bodyweight: { label: 'Bodyweight', showReps: true, amountLabel: null },
  time: { label: 'Time', showReps: false, amountLabel: 'sec' },
  distance: { label: 'Distance', showReps: false, amountLabel: 'm' },
};

export const SET_KIND_ORDER: readonly SetKind[] = [
  'reps_weight',
  'added_load',
  'bodyweight',
  'time',
  'distance',
];

// The title of a set table's main-number column. Null when the kind has none.
export const AMOUNT_COLUMN: Record<SetKind, string | null> = {
  reps_weight: 'Weight',
  added_load: 'Load',
  bodyweight: null,
  time: 'Time',
  distance: 'Distance',
};

// "60 kg", "+10 kg", "60 sec", "25 m". Empty when nothing was entered.
export function formatAmount(kind: SetKind, amount: string): string {
  const meta = KIND_META[kind];
  const value = amount.trim();
  if (!value) return '';
  return `${meta.amountPrefix ?? ''}${value}${meta.amountLabel ? ` ${meta.amountLabel}` : ''}`;
}

// "8 × 60 kg", "8 × +10 kg", "12 reps", "60 sec", "25 m". Empty parts are left out.
export function formatSet(kind: SetKind, set: Pick<SetEntry, 'reps' | 'amount'>): string {
  const meta = KIND_META[kind];
  const reps = set.reps.trim();
  const amount = set.amount.trim();
  const amountText = formatAmount(kind, amount);
  if (!meta.showReps) return amountText;
  if (reps && amountText) return `${reps} × ${amountText}`;
  if (reps) return amountText || `${reps} reps`;
  return amountText;
}

export function newSetEntry(id: string): SetEntry {
  return { id, reps: '', amount: '', isTop: false };
}

export const MAX_SET_REPEAT = 20;

export function setCount(set: Pick<SetEntry, 'count'>): number {
  const n = set.count ?? 1;
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), MAX_SET_REPEAT) : 1;
}

// Sets are stored one row per set. When a saved exercise is opened for editing,
// consecutive sets that are exactly alike (same reps and number, none marked top)
// fold back into one row with a count, so the form shows what was entered.
export function groupSets(sets: SetEntry[]): SetEntry[] {
  const grouped: SetEntry[] = [];
  for (const set of sets) {
    const last = grouped[grouped.length - 1];
    const alike =
      last !== undefined &&
      !last.isTop &&
      !set.isTop &&
      last.reps === set.reps &&
      last.amount === set.amount;
    if (alike) last.count = setCount(last) + 1;
    else grouped.push({ ...set, count: 1 });
  }
  return grouped;
}

// Numbers the rows of a set table. A row that stands for several identical sets
// takes a range, so numbering runs on: 1, 2–4, 5.
export function labelSets<T extends Pick<SetEntry, 'count'>>(
  sets: T[],
): { set: T; label: string; repeated: boolean }[] {
  const rows: { set: T; label: string; repeated: boolean }[] = [];
  let next = 1;
  for (const set of sets) {
    const n = setCount(set);
    rows.push({ set, label: n > 1 ? `${next}–${next + n - 1}` : String(next), repeated: n > 1 });
    next += n;
  }
  return rows;
}
