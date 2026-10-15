@AGENTS.md

# Athlore

A personal MMA training intelligence app: log sessions, track progress through goals and milestones, analyze training history, and ask AI questions about it. Built by one person for their own training first. Generalizing to other athletes is future scope, so don't design for multi-tenant or configurable metrics yet.

Product docs (read these before you build a feature):
- [docs/vision.md](docs/vision.md): why the product exists and its principles
- [docs/requirements.md](docs/requirements.md): what each feature must do
- [docs/architecture.md](docs/architecture.md): stack, data model, sync and draft flow, folder structure
- [docs/roadmap.md](docs/roadmap.md): phase order and what's done. Tick items off here when they ship.

## Current state

- Phase 1 (foundation) is done. **Phase 2 (core training journal) is next**: Google auth, session create/edit, drafts, sync, history.
- The stack is Expo SDK 57, React Native 0.86, React 19.2, and TypeScript 6 in strict mode. The package manager is **npm** (`package-lock.json`), so use `npx`, not `bunx`.
- The app shell is in place:
  - Expo Router with routes in `src/app/`: four tabs (`index`, `history`, `progress`, `insights`) using `Tabs` from `expo-router/js-tabs`, plus `log` and `session/[id]`.
  - Theme tokens in `src/theme/tokens.ts`, and components in `src/components/`.
  - Inter fonts via `@expo-google-fonts/inter`.
  - Icons come from `@react-native-vector-icons/material-icons`, because `@expo/vector-icons` is being deprecated.
  - The local database works: expo-sqlite + Drizzle (stable `drizzle-orm`, not the `rc` tag), schema in `src/db/schema.ts`, migrations generated with `npx drizzle-kit generate` into `src/db/migrations/`. Log (with draft autosave), History, Home and Session detail/edit read and write it. Session logic lives in `src/features/sessions/`.
  - Drizzle's Expo SQLite transactions are **synchronous**: callbacks must be sync and end every statement in `.run()`. An async callback commits after its first statement. See docs/architecture.md.
  - Exercises work: a seeded master list (44, by muscle group) plus custom ones, a picker sheet with search and recently used, and a set table per exercise (weight, +load, bodyweight, time or distance, a Top set marker, notes).
  - Supabase: the schema, privacy rules and defaults are written and tested (`supabase/migrations/`, run in order in the Supabase SQL editor). Regenerate the defaults migration with `node scripts/gen-supabase-seed.mjs` after changing `src/db/defaults.ts`. Never re-run `20261014000100_seed_defaults.sql` after the table rename; it refers to the old table name. The app does not talk to Supabase yet.
  - Table names: `user_session_types` (the athlete's session types, defaults plus custom) and `session_type_assignments` (which types a session has). The TypeScript names are `sessionTypes` and `sessionTypeAssignments`.
  - Categories and session types: the defaults are chips; everything else lives behind an "Other" chip in a sheet (pick, add, remove), and a custom entry shows as a chip only while selected. A custom entry that a (non-deleted) session still uses can't be removed. Removal is a soft delete.
  - Dates: the training date uses our own calendar sheet (`DatePickerSheet`, Monday-first, no future days), not the system dialog, so it matches the app's colours.
  - Set rows have a "×" count for identical sets. They are saved as one row per set and folded back into one row when a saved session is opened. A repeated row can't be the top set.
  - Deleting a session is a soft delete (the row, its exercises and sets are kept, hidden from history and analytics).
  - Keyboard: `StackScreen` uses `KeyboardScrollView`, which scrolls the focused field above the keyboard (also as multi-line text grows). `TextField` registers itself with it. `ConfirmDialog` replaces system alerts.
  - Not built yet: Google sign-in, the Supabase client and sync worker (saved sessions stay "Waiting to sync"), the legacy migration script, History search and filters, milestones.
- The architecture is decided. See [docs/architecture.md](docs/architecture.md): local-first SQLite (expo-sqlite + Drizzle), Supabase backend, a hand-rolled outbox for sync, Zustand only for sync status, and an EAS dev build (not Expo Go) for native Google sign-in. The AI provider is still open until Phase 5, so **don't pick one silently.**
- ESLint is configured (`eslint.config.js`, eslint-config-expo).

## Domain rules (non-negotiable)

**Sessions**
- The training date is its own field, separate from `createdAt` and `submittedAt`. All history, sorting, and analytics use the **training date**.
- One training day can hold several independent sessions. Analytics must keep **sessions** and **training days** apart.
- Session fields: training date, category (required), training focus, duration, session types (**more than one allowed**), techniques/skills learned, self-assessment, coach feedback, injury/discomfort notes, self-rating, mood, what I'm proud of, what I need to improve.
- Category is required, but the user can choose an existing one or add their own. It is not a fixed enum.
- Exercise-level detail (name, sets, reps, weight, weight unit, notes) is optional. It must never make quick logging slower.

**Drafts and data safety**
- Autosave drafts locally while the user types. Drafts must survive app restarts, going offline, and failed syncs.
- A draft counts as submitted only after the **server confirms** it. Until then it stays recoverable.
- Submissions must be idempotent: retrying must never create a duplicate session. Use a client-generated ID.

**Milestones**
- A **measurable** milestone completes automatically when its criteria are met. A **skill** milestone is completed manually.
- Each goal has its own milestone path, shown as a game-style progression map in the spirit of Candy Crush, not just charts.
- A milestone can optionally link to sessions.

**AI / training intelligence**
- AI is a separate layer. The journal, history, and analytics must work fully without it.
- Always label content as **recorded** (in the user's history), **analysis** (derived from it), or **suggestion** (generated).
- Never claim the user learned, heard, or experienced something unless it's in their records. Correlations are patterns, not causes.
- Planning features support the user's decisions. They don't replace coaches.

**Migration**
- The existing Google Form spreadsheet is a **one-time migration source**, not an import feature. Don't build a workbook-import UI.
- Keep values exactly as they are. Missing values stay missing, never inferred. Detect duplicates.
- Training data files (`*.xlsx`, `*.xls`, `*.csv`, `.env*`) are personal and gitignored. They include health and injury notes. Never commit them, paste their contents anywhere external, or copy real entries into fixtures or seed data.

What the legacy CSV actually looks like (about 60 rows, April 2025 onward):
- Columns: `Timestamp, Date, Training Focus, Duration, Technique/Skill Learned, Self Assessment, Coach Feedback, Injury Status/Any Pain or Discomfort Noted, Self Rating, Mood, What I'm Proud of, What I have to Improve`.
- It has **no category, session type, or exercise columns**, and every row is one session.
- Dates are `M/D/YYYY`. `Timestamp` (submitted at) is often days after `Date` (training date) and is occasionally before it. Map them to separate fields and never swap them.
- `Duration` is free text in mixed formats: `2h`, `2.75h`, `2.5 h`, `2:00 hr`, `1 hr 20 min`, `1hr`, and bare numbers like `1.75`. A value like `3.45h` is ambiguous (3.45 h or 3 h 45 min). The parser has to flag ambiguous values for manual review instead of guessing.
- `Self Rating` is an integer on a **1–10 scale**.
- `Mood` is **free text** ("Good and accomplished", "Very motivated", "Bored"…).
- Text fields are long, multiline, and full of typos and some Malayalam written in Latin script. Store them verbatim and never "clean up" the wording. Gym exercises (sets/reps/kg) sometimes sit inside free text. Don't auto-extract them into structured exercises.
- Coach feedback often quotes several coaches in one field. There is no coach field.

## Settled product decisions (details in docs/architecture.md)

- **Rating:** stored as 1–10 and shown as 5 stars; each point is half a star, and either half of a star can be tapped. Legacy values keep their original numbers.
- **Mood:** new entries use `mood_scale` 1–5 (Rough/Low/Okay/Good/Great, how the athlete felt emotionally, not physically). Legacy text goes verbatim into `mood_text`. Neither field is ever derived from the other.
- **Defaults:** categories are Grappling, Kickboxing, Boxing, Weight Training. Session types are Technique Drill, Sparring, Rolling, Cardio/Games, Competition Prep. Both live in `src/db/defaults.ts` with fixed ids; old defaults are renamed in place or hidden when unused (`src/db/seed.ts`).
- **Category on migrated sessions:** nullable only when `source = 'legacy'` (a CHECK constraint enforces it). The user can tag them later from History.
- **Exercise sets:** each set has a `kind` (`reps_weight`, `added_load`, `bodyweight`, `time`, `distance`) with nullable value columns.

## Platform and UX

- Android first and phone first. Development runs on an EAS development build on a physical Android device (`npx expo start --dev-client`). Expo Go can't do native Google sign-in. iOS and desktop are not priorities, but don't break cross-platform builds needlessly.
- Optimize for: logging a session fast, reviewing recent training, checking progress and milestones, and getting insights.
- Auth is Google sign-in only for the MVP.

## Design direction (Google Stitch mockups, in progress)

The designs are not final and evolve while we build. Treat them as direction, not a pixel spec. Tagline: "Your training. Your progress. Your story."

**Look:** dark only and card-based, with rounded cards and pill-shaped chips.
- Near-black background, around `#121418`. Slightly lighter cards, around `#1C1F26`, with subtle borders.
- Mint-green accent, around `#6FD49A`, for primary buttons, selected chips, stars, and active tabs. Dark text sits on the accent.
- White primary text and grey secondary text. A coral/red, around `#E5736A`, is for destructive actions and sync errors.
- These hex values are approximate, read from screenshots. Put colors in one theme/tokens module and never hard-code them in screens.
- The old teal splash palette is gone. The Stitch palette replaces it.
- `app.json` uses `userInterfaceStyle: "dark"`.

**Navigation:** a bottom tab bar with **Home · History · Log (raised centre + button) · Progress · Insights**. A sign-in screen with "Continue with Google" comes before the tabs.

**Screens seen so far:**
- **Home:** greeting with the date and an initials avatar. Then:
  - a "N draft(s) saved on this phone · Resume" banner
  - **This week**: sessions vs training days, with weekday dots
  - **Last session** card
  - **Next milestone** card with a percentage and a progress bar
  - an empty state, "Log your first session"
- **Log session:**
  - Header shows a "Draft saved" indicator. The date picker defaults to today.
  - Category chips ending with "Other" (type a new category), and a training focus text input.
  - Duration chips (1 / 1.5 / 2 / 2.5 / 3 hr / Other). Session type chips are multi-select.
  - Then "Add details (optional)": collapsible sections for Techniques learned, Self-assessment, Coach feedback, Injury or discomfort, Rating and mood, What I'm proud of, What to improve, and Exercises.
  - The keyboard toolbar steps through fields ("Next: Injury or discomfort ›").
  - Footer: **Save session**, plus "+ Add another session today".
- **Rating and mood:** 5-star session rating and a 5-option post-training mood picker.
- **Exercises:** a bottom sheet with an exercise library (search, recommendations, add custom). Each exercise has a set table (set / reps / weight or load), a "Top" set marker, notes, and "+ Add set". The sheet ends with "Confirm exercises (N)".
- **History:**
  - A search box ("Search sessions, techniques, feedback"), then a Category multi-select filter sheet and a Date range sheet with presets and a calendar.
  - The list is grouped by training day, with an "N sessions" header per day.
  - Sync states show on each row: "Waiting to sync", "Couldn't sync · Retry", "N sessions waiting to sync · Retry all", and "N offline sessions synced successfully".
- **Session detail:**
  - A read view with a "Recorded at" time shown separately from the training date, plus all reflection sections and exercise tables.
  - An **Edit** mode that reuses the log form, with Save changes / Delete session.
  - Delete asks "Delete this session? … You can't undo this."

## Working conventions

- Before you call a task done, run `npx tsc --noEmit` and `npx expo lint`.
- Add packages with `npx expo install`. If a library needs native code, Expo Go can't run it and a dev build is required, so flag that before adding one.
- Keep the MVP loop in view: **Log → Review → Understand → Track progress**. Don't build later-phase features early unless asked.

## Athlore design rules (must follow)

Look: "Athlore Minimal". Dark, calm, one green accent, lots of space. A training journal, not a flashy fitness app.

Source of truth
- All colors, spacing, radii and type come from `src/theme/tokens.ts`. Never hard-code a hex value, font size or spacing number in a screen. If a value is missing, add a named token to tokens.ts first, then use it.
- Build screens from `src/components/ui.tsx` (Txt, Card, Chip, Button, Stars, ProgressBar, Avatar, Icon, SectionTitle, SyncBadge, TabScreen, StackScreen) and `BottomSheet.tsx`. If a pattern appears on two screens, make it a component in `src/components/`.
- Do not reintroduce the orange "Kinetic Discipline" or navy design variants from the Stitch export.

Color
- Background `colors.bg` (#14161A). Surfaces are `colors.card` (#1C1F25); pressed state `colors.cardPressed`; inputs and wells `colors.inset`; lines `colors.divider`.
- Text is `colors.text`; anything secondary (dates, hints, counts, labels) is `colors.textSecondary`.
- Green `colors.accent` (#6FCF97) is the only accent. Use it for: the primary action on a screen, selected chips/tabs, stars, progress, "current" states. Never for body text or decoration. One filled green button per screen at most.
- Red `colors.danger` only for destructive actions, sync failures and injuries. Use the `*Soft` / `*Border` tokens for tinted backgrounds and outlines.
- Dark mode only (app.json `userInterfaceStyle: "dark"`). No light theme.

Type (Inter, via `<Txt variant=…>`)
- Tab screen title: `title`. Pushed screen title: handled by StackScreen. Section headers: `section` or `SectionTitle`.
- Big numbers: `stat`. Body: `body`; dense rows `bodySm`; meta lines `caption`; small badges `micro`; eyebrow labels `overline`.
- Sentence case everywhere ("Log session", not "Log Session"). No exclamation marks. Short, plain labels.

Layout and spacing
- Horizontal screen margin is `space.screen` (20). Gap between cards `space.md` (12); between sections `space.xxl` (24); inside cards `space.lg` (16).
- Cards: `radius.lg` (16), no shadows. Use `bordered` only for form cards. Chips are pills (`radius.full`). Buttons are 52px tall, `radius.lg`.
- Top-level tabs use `TabScreen` (large title left, avatar right). Anything pushed uses `StackScreen` (back arrow + title, optional sticky footer for the main action).
- Bottom tab bar is the custom `TabBar` with the raised green Log button in the middle. Don't replace it.
- Leave `paddingBottom` room so content never hides under the tab bar (TabScreen already does this).

Icons and motion
- Icons: MaterialIcons through `<Icon>`; default 22px in `textSecondary`, 24px in tab bar and headers.
- Motion is subtle: fade for tab-level changes, slide from right for pushed screens, slide from bottom for the Log sheet. Pressed states dim (`opacity 0.8`) or use `cardPressed`; no bouncy springs.

Accessibility and Android polish
- Every Pressable that is only an icon gets an `accessibilityLabel`. Touch targets at least 44x44 (use `hitSlop`).
- Respect safe areas (use the screen wrappers; never hard-code status bar height).
- Text must survive the system font scale at 1.3x without clipping: avoid fixed heights on text containers.
- Empty states: one `textSecondary` sentence plus, where useful, one ghost or secondary Button. No illustrations yet.
- Loading: show the `bg` color, not a spinner, for anything under ~300ms; use a small `ActivityIndicator` in `accent` otherwise.

Placeholders for screens not designed yet
- Build them with `StackScreen` + existing components, real navigation and real data, but keep layout simple (a list of Cards). Put `// TODO(design): <screen name>` at the top of the file so they are easy to find and restyle later.
