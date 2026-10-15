-- Athlore: initial Supabase schema.
-- Mirrors the local SQLite schema in src/db/schema.ts (see docs/architecture.md).
--
-- How to apply: Supabase dashboard > SQL Editor > New query > paste this file > Run.
-- Then do the same with 20261014000100_seed_defaults.sql.
--
-- Conventions
--   * ids are uuids generated on the phone, so a retried push upserts the same row
--     instead of creating a duplicate.
--   * user_id defaults to the signed-in user. Rows with user_id = null are shared
--     defaults (categories, session types and exercises that ship with the app).
--   * updated_at is always set by the server clock, so pulling "changes since" never
--     depends on the phone's clock.
--   * deleted_at is a soft delete so deletions can sync.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index categories_name_unique
  on public.categories (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table public.session_types (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index session_types_name_unique
  on public.session_types (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create table public.exercises (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  is_custom boolean not null default false,
  muscle_group text,
  default_kind text not null default 'reps_weight'
    check (default_kind in ('reps_weight', 'added_load', 'bodyweight', 'time', 'distance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index exercises_name_unique
  on public.exercises (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------

create table public.sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),

  -- The day the training happened. All history, sorting and analytics use this,
  -- never created_at or submitted_at.
  training_date date not null,

  -- Required for app sessions. Null only for migrated legacy rows.
  category_id uuid references public.categories (id),
  training_focus text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  -- Legacy duration text, kept verbatim next to the parsed value.
  duration_raw text,
  techniques text,
  self_assessment text,
  coach_feedback text,
  injury_notes text,
  proud_of text,
  to_improve text,

  -- 1-10. The app shows it as 5 stars with half-stars.
  rating integer check (rating is null or rating between 1 and 10),
  -- 1-5: Rough, Low, Okay, Good, Great (emotional mood). Legacy mood text goes in mood_text.
  mood_scale integer check (mood_scale is null or mood_scale between 1 and 5),
  mood_text text,

  source text not null default 'app' check (source in ('app', 'legacy')),

  -- Set by the server the first time it receives the session. Null never reaches
  -- here, but a session is only "submitted" once this exists.
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint sessions_category_required check (source = 'legacy' or category_id is not null)
);
create index sessions_training_date_idx on public.sessions (user_id, training_date);
create index sessions_updated_at_idx on public.sessions (user_id, updated_at);

create table public.session_session_types (
  session_id uuid not null references public.sessions (id) on delete cascade,
  session_type_id uuid not null references public.session_types (id),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (session_id, session_type_id)
);

create table public.session_exercises (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_exercises_session_idx on public.session_exercises (session_id);

create table public.exercise_sets (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  position integer not null,
  kind text not null check (kind in ('reps_weight', 'added_load', 'bodyweight', 'time', 'distance')),
  is_top boolean not null default false,
  reps integer,
  weight numeric,
  weight_unit text check (weight_unit is null or weight_unit in ('kg', 'lb')),
  added_load numeric,
  duration_seconds integer,
  distance_m numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercise_sets_session_exercise_idx on public.exercise_sets (session_exercise_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Server clock owns updated_at on every table.
create trigger categories_updated_at before insert or update on public.categories
  for each row execute function public.set_updated_at();
create trigger session_types_updated_at before insert or update on public.session_types
  for each row execute function public.set_updated_at();
create trigger exercises_updated_at before insert or update on public.exercises
  for each row execute function public.set_updated_at();
create trigger sessions_updated_at before insert or update on public.sessions
  for each row execute function public.set_updated_at();
create trigger session_session_types_updated_at before insert or update on public.session_session_types
  for each row execute function public.set_updated_at();
create trigger session_exercises_updated_at before insert or update on public.session_exercises
  for each row execute function public.set_updated_at();
create trigger exercise_sets_updated_at before insert or update on public.exercise_sets
  for each row execute function public.set_updated_at();

-- A session becomes "submitted" the first time the server stores it, and stays so
-- on later edits.
create or replace function public.set_submitted_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- The app never sends submitted_at. The one-off legacy migration does, so
    -- old entries keep the time they were really submitted.
    new.submitted_at = coalesce(new.submitted_at, now());
  else
    new.submitted_at = coalesce(old.submitted_at, now());
  end if;
  return new;
end;
$$;

create trigger sessions_submitted_at before insert or update on public.sessions
  for each row execute function public.set_submitted_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: each user sees and changes only their own rows.
-- Shared defaults (user_id is null) are readable by everyone signed in, but never
-- writable from the app.
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.session_types enable row level security;
alter table public.exercises enable row level security;
alter table public.sessions enable row level security;
alter table public.session_session_types enable row level security;
alter table public.session_exercises enable row level security;
alter table public.exercise_sets enable row level security;

-- Lookup tables: read own + shared, write own.
create policy "categories read" on public.categories
  for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "categories insert" on public.categories
  for insert to authenticated with check (user_id = auth.uid());
create policy "categories update" on public.categories
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "session_types read" on public.session_types
  for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "session_types insert" on public.session_types
  for insert to authenticated with check (user_id = auth.uid());
create policy "session_types update" on public.session_types
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "exercises read" on public.exercises
  for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "exercises insert" on public.exercises
  for insert to authenticated with check (user_id = auth.uid());
create policy "exercises update" on public.exercises
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Session data: own rows only.
create policy "sessions own" on public.sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "session_session_types own" on public.session_session_types
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "session_exercises own" on public.session_exercises
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "exercise_sets own" on public.exercise_sets
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
