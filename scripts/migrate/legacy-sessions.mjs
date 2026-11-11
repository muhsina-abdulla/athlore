// One-time migration of the old Google Form spreadsheet into Supabase.
// Runs on your computer only. It is not part of the app.
//
//   Dry run (writes nothing, safe to repeat):
//     node scripts/migrate/legacy-sessions.mjs --file "data/Training Logs - Training Logs.csv"
//
//   Real run:
//     node scripts/migrate/legacy-sessions.mjs --file "data/Training Logs - Training Logs.csv" \
//       --user-email you@example.com --apply
//
// Options
//   --file <path>         the CSV (kept in the gitignored data/ folder)
//   --utc-offset <+hh:mm> time zone the form's Timestamp column was written in (default +05:30)
//   --user-email <email>  whose account the sessions belong to (needed with --apply)
//   --apply               really write to Supabase. Without it nothing is written.
//
// A real run needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a file named
// .env.migrate (gitignored). That key can read and write everything, so it stays on this
// computer: never paste it into chat, the app, or git.
//
// Hand-decided durations can go in data/duration-overrides.json, for example
//   { "52": 225 }
// meaning: data row 52 lasted 225 minutes.

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { buildPlan, formatReport, parseCsv } from './parse.mjs';

function readArgs(argv) {
  const out = { apply: false, utcOffset: '+05:30' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') out.apply = true;
    else if (a === '--file') out.file = argv[++i];
    else if (a === '--utc-offset') out.utcOffset = argv[++i];
    else if (a === '--user-email') out.userEmail = argv[++i];
    else throw new Error(`Unknown option: ${a}`);
  }
  return out;
}

function fail(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

const args = readArgs(process.argv.slice(2));
if (!args.file) fail('Give the CSV with --file "data/<name>.csv".');
if (!existsSync(args.file)) fail(`File not found: ${args.file}`);
if (!/^[+-]\d{2}:\d{2}$/.test(args.utcOffset)) fail('--utc-offset must look like +05:30.');

const overridesPath = 'data/duration-overrides.json';
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};

const rows = parseCsv(readFileSync(args.file, 'utf8'));
const { sessions, report } = buildPlan(rows, { utcOffset: args.utcOffset, overrides });

const summary = formatReport(report);
const reportPath = 'data/migration-report.txt';
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${summary}\n`);
console.log(summary);
console.log(`\nReport saved to ${reportPath} (it holds row numbers and durations only).`);
console.log(`Timestamps were read as UTC${args.utcOffset}.`);

if (!args.apply) {
  console.log('\nDRY RUN: nothing was written. Add --apply (and --user-email) to import.');
  process.exit(0);
}

// ---------- Real run ----------

if (!args.userEmail) fail('--apply needs --user-email, the account the sessions belong to.');
if (!existsSync('.env.migrate')) fail('Create .env.migrate with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
process.loadEnvFile('.env.migrate');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fail('.env.migrate is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(email) {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? '').toLowerCase() === wanted);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

const userId = await findUserId(args.userEmail);
if (!userId) fail(`No Supabase user with that email. Sign in to the app with Google once first.`);

const { count: existing, error: countError } = await admin
  .from('sessions')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('source', 'legacy');
if (countError) fail(`Could not read the sessions table: ${countError.message}`);
console.log(`\nLegacy sessions already in Supabase for this user: ${existing ?? 0}`);

// Existing rows are never overwritten (ignoreDuplicates), so editing a migrated session
// in the app and then running this again cannot undo the edit.
const records = sessions.map(({ row, ...s }) => ({ ...s, user_id: userId }));
let written = 0;
for (let i = 0; i < records.length; i += 25) {
  const batch = records.slice(i, i + 25);
  const { error } = await admin.from('sessions').upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
  if (error) fail(`Stopped after ${written} sessions. ${error.message}\nRunning the command again is safe: finished rows are skipped.`);
  written += batch.length;
  console.log(`Sent ${written} of ${records.length}`);
}

const { count: after } = await admin
  .from('sessions')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId)
  .eq('source', 'legacy');
console.log(`\nDone. Legacy sessions in Supabase now: ${after ?? 0} (was ${existing ?? 0}).`);
console.log('Open the app and tap Sync now in History to bring them onto the phone.');
