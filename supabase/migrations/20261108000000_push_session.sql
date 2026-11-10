-- push_session: saves one whole session (the session, its session types, exercises
-- and sets) in a single all-or-nothing step.
--
-- Why a function: saving a session touches four tables. As separate requests, a
-- dropped connection halfway would leave a session with missing sets. Here the whole
-- thing runs as one statement, so it either all happens or none of it does.
--
-- It is idempotent, so a retried push can never duplicate anything: the session is
-- upserted by its id, and its children are replaced as a whole (the phone always
-- sends the complete list).
--
-- It runs as the signed-in user ("security invoker"), so Row Level Security still
-- applies: nobody can write over another user's session.
--
-- How to apply: Supabase dashboard > SQL Editor > New query > paste > Run.

create or replace function public.push_session(p jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := (p -> 'session' ->> 'id')::uuid;
begin
  if v_id is null then
    raise exception 'push_session: the session needs an id';
  end if;

  -- user_id is left out on purpose: it defaults to the signed-in user.
  -- submitted_at is left out too: the server sets it the first time it sees the
  -- session. created_at, source and user_id are never changed by a later push.
  insert into public.sessions (
    id, training_date, category_id, training_focus, duration_minutes, duration_raw,
    techniques, self_assessment, coach_feedback, coach_name, injury_notes, proud_of,
    to_improve, rating, mood_scale, mood_text, source, created_at, deleted_at
  )
  select
    r.id, r.training_date, r.category_id, r.training_focus, r.duration_minutes, r.duration_raw,
    r.techniques, r.self_assessment, r.coach_feedback, r.coach_name, r.injury_notes, r.proud_of,
    r.to_improve, r.rating, r.mood_scale, r.mood_text, coalesce(r.source, 'app'),
    coalesce(r.created_at, now()), r.deleted_at
  from jsonb_populate_record(null::public.sessions, p -> 'session') as r
  on conflict (id) do update set
    training_date = excluded.training_date,
    category_id = excluded.category_id,
    training_focus = excluded.training_focus,
    duration_minutes = excluded.duration_minutes,
    duration_raw = excluded.duration_raw,
    techniques = excluded.techniques,
    self_assessment = excluded.self_assessment,
    coach_feedback = excluded.coach_feedback,
    coach_name = excluded.coach_name,
    injury_notes = excluded.injury_notes,
    proud_of = excluded.proud_of,
    to_improve = excluded.to_improve,
    rating = excluded.rating,
    mood_scale = excluded.mood_scale,
    mood_text = excluded.mood_text,
    deleted_at = excluded.deleted_at;

  -- Children are replaced as a whole.
  delete from public.session_type_assignments where session_id = v_id;
  insert into public.session_type_assignments (session_id, session_type_id)
  select v_id, t::uuid
  from jsonb_array_elements_text(coalesce(p -> 'session_type_ids', '[]'::jsonb)) as t;

  -- Deleting a session exercise removes its sets with it (cascade).
  delete from public.session_exercises where session_id = v_id;
  insert into public.session_exercises (id, session_id, exercise_id, position, notes, created_at)
  select e.id, v_id, e.exercise_id, e.position, e.notes, coalesce(e.created_at, now())
  from jsonb_populate_recordset(null::public.session_exercises, coalesce(p -> 'exercises', '[]'::jsonb)) as e;

  insert into public.exercise_sets (
    id, session_exercise_id, position, kind, is_top, reps, weight, weight_unit,
    added_load, duration_seconds, distance_m, created_at
  )
  select
    s.id, s.session_exercise_id, s.position, s.kind, coalesce(s.is_top, false), s.reps, s.weight,
    s.weight_unit, s.added_load, s.duration_seconds, s.distance_m, coalesce(s.created_at, now())
  from jsonb_populate_recordset(null::public.exercise_sets, coalesce(p -> 'sets', '[]'::jsonb)) as s;

  -- What the phone needs back: when the server first accepted the session.
  return (
    select jsonb_build_object('submitted_at', submitted_at, 'updated_at', updated_at)
    from public.sessions
    where id = v_id
  );
end;
$$;

revoke all on function public.push_session(jsonb) from public, anon;
grant execute on function public.push_session(jsonb) to authenticated;
