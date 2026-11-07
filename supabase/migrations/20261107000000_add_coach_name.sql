-- Adds an optional coach name to sessions: which coach gave the feedback.
-- Free text, so several coaches can be named. Existing sessions are untouched.
--
-- How to apply: Supabase dashboard > SQL Editor > New query > paste > Run.
-- Safe to run twice.

alter table public.sessions add column if not exists coach_name text;
