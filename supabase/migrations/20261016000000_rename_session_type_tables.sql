-- Renames two tables, keeping every row:
--   session_types          -> user_session_types
--   session_session_types  -> session_type_assignments
-- The indexes, constraints, triggers and policies are renamed to match.
--
-- How to apply: Supabase dashboard > SQL Editor > New query > paste > Run.
-- Run it before 20261016000100_update_defaults.sql.

-- ---------------------------------------------------------------------------
-- session_types -> user_session_types
-- ---------------------------------------------------------------------------
alter table public.session_types rename to user_session_types;

alter index public.session_types_name_unique rename to user_session_types_name_unique;
alter table public.user_session_types rename constraint session_types_pkey to user_session_types_pkey;
alter table public.user_session_types rename constraint session_types_user_id_fkey to user_session_types_user_id_fkey;

alter trigger session_types_updated_at on public.user_session_types rename to user_session_types_updated_at;

alter policy "session_types read" on public.user_session_types rename to "user_session_types read";
alter policy "session_types insert" on public.user_session_types rename to "user_session_types insert";
alter policy "session_types update" on public.user_session_types rename to "user_session_types update";

-- ---------------------------------------------------------------------------
-- session_session_types -> session_type_assignments
-- ---------------------------------------------------------------------------
alter table public.session_session_types rename to session_type_assignments;

alter table public.session_type_assignments rename constraint session_session_types_pkey to session_type_assignments_pkey;
alter table public.session_type_assignments rename constraint session_session_types_session_id_fkey to session_type_assignments_session_id_fkey;
alter table public.session_type_assignments rename constraint session_session_types_session_type_id_fkey to session_type_assignments_session_type_id_fkey;
alter table public.session_type_assignments rename constraint session_session_types_user_id_fkey to session_type_assignments_user_id_fkey;

alter trigger session_session_types_updated_at on public.session_type_assignments rename to session_type_assignments_updated_at;

alter policy "session_session_types own" on public.session_type_assignments rename to "session_type_assignments own";
