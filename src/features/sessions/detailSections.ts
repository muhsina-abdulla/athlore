import { MOODS, type SessionForm } from '@/features/sessions/formState';

// The optional sections under "Add details". One list drives the form, the
// compact view while a section is open, and the "Next" bar above the keyboard.

export type DetailKey =
  | 'techniques'
  | 'selfAssessment'
  | 'coachFeedback'
  | 'injuryNotes'
  | 'ratingMood'
  | 'proudOf'
  | 'toImprove'
  | 'exercises';

export type DetailSection = {
  key: DetailKey;
  title: string;
  hint?: string;
  tone?: 'danger';
  placeholder?: string;
};

export const DETAIL_SECTIONS: readonly DetailSection[] = [
  { key: 'techniques', title: 'Techniques learned', placeholder: 'Techniques or skills you worked on' },
  { key: 'selfAssessment', title: 'Self-assessment', placeholder: 'How did it go?' },
  { key: 'coachFeedback', title: 'Coach feedback', placeholder: 'What your coach said' },
  { key: 'injuryNotes', title: 'Injury or discomfort', tone: 'danger', placeholder: 'Any pain or discomfort' },
  { key: 'ratingMood', title: 'Rating and mood', hint: 'Overall session impression' },
  { key: 'proudOf', title: "What I'm proud of", placeholder: 'A win from this session' },
  { key: 'toImprove', title: 'What to improve', placeholder: 'What to work on next' },
  { key: 'exercises', title: 'Exercises', hint: 'Sets, reps and weight' },
];

// Sections whose body is a single text box.
export type TextDetailKey = Exclude<DetailKey, 'ratingMood' | 'exercises'>;

const firstLine = (text: string) => text.split('\n').find((l) => l.trim() !== '')?.trim() ?? '';

// What a collapsed section shows under its title. Null means nothing entered.
export function sectionPreview(form: SessionForm, key: DetailKey): string | null {
  if (key === 'ratingMood') {
    const parts: string[] = [];
    if (form.rating !== null) parts.push(`${form.rating}/10`);
    const mood = MOODS.find((m) => m.value === form.moodScale);
    if (mood) parts.push(mood.label);
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (key === 'exercises') {
    const count = form.exercises.length;
    return count === 0 ? null : `${count} exercise${count === 1 ? '' : 's'}`;
  }
  const text = firstLine(form[key]);
  return text === '' ? null : text;
}

export function nextSection(key: DetailKey): DetailSection | null {
  const i = DETAIL_SECTIONS.findIndex((s) => s.key === key);
  return DETAIL_SECTIONS[i + 1] ?? null;
}
