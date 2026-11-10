-- Adds "Assisted pull-up" to the shared master exercise list (see
-- src/db/defaultExercises.ts). The phone adds it by itself on launch; the server needs
-- it too, because sessions point at exercises by id.
--
-- Safe to run twice: an existing row is left alone.
insert into public.exercises (id, user_id, name, is_custom, muscle_group, default_kind) values
  ('9e6dcbc2-02b6-46ed-bff7-c9d271679a61', null, 'Assisted pull-up', false, 'Back', 'reps_weight')
on conflict (id) do nothing;
