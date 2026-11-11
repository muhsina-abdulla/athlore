// Pure logic for the one-time migration of the Google Form spreadsheet. No file or
// network access here, so it can be tested on made-up rows.
//
// Rules (see docs/architecture.md, "Legacy migration"):
//   - Text is copied verbatim. A value that is completely empty becomes null.
//   - Date is the training date; Timestamp is when the form was submitted. They are
//     never swapped, even when the timestamp comes first.
//   - Duration is parsed to minutes, and the original text is always kept. A value that
//     could mean two different things is left null and listed for review.
//   - Nothing is inferred: no category, session types, coach or exercises.

import { createHash } from 'node:crypto';

// ---------- CSV ----------

// Reads CSV text into rows of strings. Handles quoted fields that contain commas,
// line breaks and doubled quotes ("") exactly as written.
export function parseCsv(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
    } else if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell !== ''));
}

// ---------- Dates ----------

// "4/22/2025" -> "2025-04-22". Null if it is not a real calendar date.
export function parseUsDate(value) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// "4/22/2025 23:07:34" -> an ISO time. The form does not record a time zone, so the
// caller says which one the times were written in (for example "+05:30").
export function parseUsTimestamp(value, utcOffset) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const date = parseUsDate(`${m[1]}/${m[2]}/${m[3]}`);
  if (!date) return null;
  const [h, min, s] = [Number(m[4]), Number(m[5]), Number(m[6])];
  if (h > 23 || min > 59 || s > 59) return null;
  const iso = `${date}T${String(h).padStart(2, '0')}:${m[5]}:${m[6]}${utcOffset}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// ---------- Duration ----------

// Returns { minutes, status }.
//   status "ok"            parsed with no doubt
//   status "assumed_hours" a bare number such as "1.75"; read as hours, listed in the report
//   status "ambiguous"     could be decimal hours or hours and minutes (e.g. "3.45h"); minutes is null
//   status "unparsed"      not understood; minutes is null
//   status "missing"       empty; minutes is null
const HOUR = '(?:h|hr|hrs|hour|hours)';
const MINUTE = '(?:m|min|mins|minute|minutes)';

export function parseDuration(raw) {
  const t = raw.trim().toLowerCase();
  if (t === '') return { minutes: null, status: 'missing' };

  // "1 hr 20 min", "1h20m"
  let m = new RegExp(`^(\\d+)\\s*${HOUR}\\s*(\\d+)\\s*${MINUTE}?$`).exec(t);
  if (m) return { minutes: Number(m[1]) * 60 + Number(m[2]), status: 'ok' };

  // "2:00 hr", "1:30"
  m = new RegExp(`^(\\d+):(\\d{2})\\s*${HOUR}?$`).exec(t);
  if (m && Number(m[2]) < 60) return { minutes: Number(m[1]) * 60 + Number(m[2]), status: 'ok' };

  // "45 min"
  m = new RegExp(`^(\\d+)\\s*${MINUTE}$`).exec(t);
  if (m) return { minutes: Number(m[1]), status: 'ok' };

  // "2h", "2.75 h", "1hr", and a bare "1.75"
  m = new RegExp(`^(\\d+)(?:\\.(\\d+))?\\s*(${HOUR})?$`).exec(t);
  if (m) {
    const whole = Number(m[1]);
    const fraction = m[2] ?? '';
    const hasUnit = m[3] !== undefined;
    if (!hasUnit && whole > 12) return { minutes: null, status: 'ambiguous' };

    // A fraction like .45 could be 45 minutes or 0.45 of an hour. Clean fractions
    // (.5, .25, .75) and fractions of 60 or more can only be parts of an hour.
    const CLEAN = new Set(['', '0', '00', '5', '50', '25', '75']);
    if (!CLEAN.has(fraction) && Number(fraction.padEnd(2, '0').slice(0, 2)) < 60) {
      return { minutes: null, status: 'ambiguous' };
    }
    const hours = Number(`${whole}.${fraction || '0'}`);
    return { minutes: Math.round(hours * 60), status: hasUnit ? 'ok' : 'assumed_hours' };
  }

  return { minutes: null, status: 'unparsed' };
}

// ---------- Rows ----------

export const COLUMNS = {
  timestamp: 'Timestamp',
  date: 'Date',
  focus: 'Training Focus',
  duration: 'Duration',
  techniques: 'Technique/Skill Learned',
  selfAssessment: 'Self Assessment',
  coachFeedback: 'Coach Feedback',
  injury: 'Injury Status/Any Pain or Discomfort Noted',
  rating: 'Self Rating',
  mood: 'Mood',
  proud: "What I'm Proud of",
  improve: 'What I have to Improve',
};

// Text is kept exactly as written. Only a value with nothing in it is "missing".
const text = (value) => (value.trim() === '' ? null : value);

// The same id every time for the same entry, so running the import again can never
// create a duplicate.
const NAMESPACE = '6f1c2c1e-3b7a-4e0d-9c55-1a2b3c4d5e6f';
export function legacyId(key) {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const bytes = createHash('sha1').update(Buffer.concat([ns, Buffer.from(key, 'utf8')])).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Turns the parsed CSV into rows ready for the sessions table, plus a report of
// everything that needs a human look. `overrides` maps a data row number (1 is the
// first row under the header) to minutes, for durations decided by hand.
export function buildPlan(rows, { utcOffset = '+05:30', overrides = {} } = {}) {
  const report = {
    total: 0,
    ready: 0,
    ambiguousDurations: [],
    assumedHours: [],
    unparsedDurations: [],
    missingDurations: [],
    badDates: [],
    badTimestamps: [],
    badRatings: [],
    duplicates: [],
    timestampBeforeDate: [],
  };
  if (rows.length === 0) throw new Error('The file is empty.');

  const header = rows[0].map((h) => h.trim());
  const index = {};
  for (const [key, name] of Object.entries(COLUMNS)) {
    const at = header.indexOf(name);
    if (at === -1) throw new Error(`Column not found: "${name}". Found: ${header.join(' | ')}`);
    index[key] = at;
  }

  const sessions = [];
  const seen = new Map();
  rows.slice(1).forEach((cells, i) => {
    const n = i + 1;
    report.total += 1;
    const get = (key) => cells[index[key]] ?? '';

    const trainingDate = parseUsDate(get('date'));
    if (!trainingDate) {
      report.badDates.push({ row: n, value: get('date') });
      return; // a session cannot exist without its training date
    }
    const submittedAt = parseUsTimestamp(get('timestamp'), utcOffset);
    if (!submittedAt) report.badTimestamps.push({ row: n, value: get('timestamp') });

    const key = `${trainingDate}|${get('timestamp').trim()}|${get('focus')}`;
    if (seen.has(key)) {
      report.duplicates.push({ row: n, sameAsRow: seen.get(key) });
      return;
    }
    seen.set(key, n);

    const durationRaw = text(get('duration'));
    let { minutes, status } = parseDuration(get('duration'));
    if (overrides[n] !== undefined) {
      minutes = overrides[n];
      status = 'ok';
    }
    if (status === 'ambiguous') report.ambiguousDurations.push({ row: n, date: trainingDate, raw: get('duration') });
    else if (status === 'assumed_hours') report.assumedHours.push({ row: n, date: trainingDate, raw: get('duration') });
    else if (status === 'unparsed') report.unparsedDurations.push({ row: n, date: trainingDate, raw: get('duration') });
    else if (status === 'missing') report.missingDurations.push({ row: n, date: trainingDate });

    let rating = null;
    const ratingText = get('rating').trim();
    if (ratingText !== '') {
      const r = Number(ratingText);
      if (Number.isInteger(r) && r >= 1 && r <= 10) rating = r;
      else report.badRatings.push({ row: n, date: trainingDate, value: ratingText });
    }

    // Compared as written in the form (local time), not after converting to UTC.
    const writtenDate = parseUsDate(get('timestamp').trim().split(' ')[0] ?? '');
    if (writtenDate && writtenDate < trainingDate) {
      // Not wrong, just worth knowing: the form was filled in before the training date.
      report.timestampBeforeDate.push({ row: n, date: trainingDate });
    }

    sessions.push({
      row: n,
      id: legacyId(key),
      training_date: trainingDate,
      category_id: null,
      training_focus: text(get('focus')),
      duration_minutes: minutes,
      duration_raw: durationRaw,
      techniques: text(get('techniques')),
      self_assessment: text(get('selfAssessment')),
      coach_feedback: text(get('coachFeedback')),
      injury_notes: text(get('injury')),
      proud_of: text(get('proud')),
      to_improve: text(get('improve')),
      rating,
      mood_scale: null,
      mood_text: text(get('mood')),
      source: 'legacy',
      submitted_at: submittedAt,
      created_at: submittedAt ?? undefined,
    });
  });

  report.ready = sessions.length;
  return { sessions, report };
}

// A plain-text summary. It lists row numbers, dates and raw durations only, never
// the text of an entry, because that text is health and personal information.
export function formatReport(report) {
  const lines = [];
  const add = (title, items, describe) => {
    lines.push(`${title}: ${items.length}`);
    for (const item of items) lines.push(`  - ${describe(item)}`);
  };
  lines.push(`Rows in file: ${report.total}`);
  lines.push(`Ready to import: ${report.ready}`);
  lines.push('');
  add('Ambiguous durations (left empty until you decide)', report.ambiguousDurations, (d) => `row ${d.row}, ${d.date}: "${d.raw}"`);
  add('Durations with no unit (read as hours)', report.assumedHours, (d) => `row ${d.row}, ${d.date}: "${d.raw}"`);
  add('Durations not understood (left empty)', report.unparsedDurations, (d) => `row ${d.row}, ${d.date}: "${d.raw}"`);
  add('Sessions with no duration', report.missingDurations, (d) => `row ${d.row}, ${d.date}`);
  add('Skipped: training date missing or not a date', report.badDates, (d) => `row ${d.row}: "${d.value}"`);
  add('Submitted-at time not understood (left empty)', report.badTimestamps, (d) => `row ${d.row}: "${d.value}"`);
  add('Ratings outside 1 to 10 (left empty)', report.badRatings, (d) => `row ${d.row}, ${d.date}: "${d.value}"`);
  add('Skipped as duplicates', report.duplicates, (d) => `row ${d.row} repeats row ${d.sameAsRow}`);
  add('Form submitted before the training date (kept as is)', report.timestampBeforeDate, (d) => `row ${d.row}, ${d.date}`);
  return lines.join('\n');
}
