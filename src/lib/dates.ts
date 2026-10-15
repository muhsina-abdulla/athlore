// Training dates are 'YYYY-MM-DD' strings in the athlete's local calendar.
// They are never converted through UTC, so a late-night session stays on the
// day it was trained.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

// Monday is the first day of the training week.
export function weekStartKey(key: string): string {
  const date = fromDateKey(key);
  const offset = (date.getDay() + 6) % 7;
  return addDays(key, -offset);
}

export function formatDay(key: string): string {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  return fromDateKey(key).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatLongDay(key: string): string {
  return fromDateKey(key).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// "Today, October 9" / "Yesterday, October 8" / "Wed, October 7". The year is
// added only when the date is not in the current year.
export function formatDateRow(key: string, month: 'long' | 'short' = 'long'): string {
  const today = todayKey();
  const date = fromDateKey(key);
  const monthDay = date.toLocaleDateString('en-US', { month, day: 'numeric' });
  if (key === today) return `Today, ${monthDay}`;
  if (key === addDays(today, -1)) return `Yesterday, ${monthDay}`;
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const year = date.getFullYear() === new Date().getFullYear() ? '' : `, ${date.getFullYear()}`;
  return `${weekday}, ${monthDay}${year}`;
}

// The days of one month as date keys, padded with nulls so a Monday-first grid
// lines up. `month` is 0-based, like Date.
export function monthDays(year: number, month: number): (string | null)[] {
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let d = 1; d <= count; d++) days.push(toDateKey(new Date(year, month, d)));
  return days;
}
