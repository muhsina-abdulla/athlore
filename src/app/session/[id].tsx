import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Button, Card, Chip, Icon, Stars, StackScreen, SyncBadge, Txt } from '@/components/ui';
import {
  canSave,
  formatDuration,
  MOODS,
  type ExerciseEntry,
  type SessionForm,
} from '@/features/sessions/formState';
import {
  sessionToForm,
  useSession,
  type SessionDetail,
} from '@/features/sessions/queries';
import { type DetailKey } from '@/features/sessions/detailSections';
import { DetailToolbar } from '@/features/sessions/DetailToolbar';
import { deleteSession, getDraft, saveSession } from '@/features/sessions/repo';
import { ExerciseTable } from '@/features/sessions/ExerciseTable';
import { SessionEditor } from '@/features/sessions/SessionEditor';
import { useDraftAutosave } from '@/features/sessions/useDraftAutosave';
import { formatLongDay, formatTime } from '@/lib/dates';
import { useKeyboardVisible } from '@/lib/useKeyboardVisible';
import { size, space } from '@/theme/tokens';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession(id);
  const [form, setForm] = useState<SessionForm | null>(null);
  const [baseline, setBaseline] = useState<SessionForm | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<DetailKey | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const keyboardVisible = useKeyboardVisible();

  const editing = form !== null;

  // An interrupted edit leaves a draft behind. Offer to continue it.
  useEffect(() => {
    let cancelled = false;
    void getDraft(id).then((draft) => {
      if (!cancelled) setHasDraft(draft !== null);
    });
    return () => {
      cancelled = true;
    };
  }, [id, editing]);

  const autosave = useDraftAutosave({
    sessionId: id,
    isEdit: true,
    form,
    baseline,
    enabled: editing && baseline !== null,
  });

  if (!session) {
    return (
      <StackScreen title="Session">
        <EmptyState message="This session can't be found. It may have been deleted." />
      </StackScreen>
    );
  }

  const startEditing = async () => {
    const original = sessionToForm(session);
    const draft = await getDraft(id);
    setBaseline(original);
    setForm(draft ? draft.form : original);
    setOpenSection(null);
    setError(null);
  };

  const save = async () => {
    if (!form || !canSave(form) || saving) return;
    setSaving(true);
    setError(null);
    autosave.stop();
    try {
      await saveSession(id, form);
      setForm(null);
      setBaseline(null);
    } catch {
      autosave.resume();
      setError("Couldn't save your changes. They're still on this phone.");
    } finally {
      setSaving(false);
    }
  };

  const performDelete = () => {
    setConfirmingDelete(false);
    autosave.stop();
    void deleteSession(id).then(() => router.back());
  };

  if (editing && form) {
    return (
      <StackScreen
        title="Edit session"
        closeIcon
        footer={
          keyboardVisible ? (
            openSection ? (
              <DetailToolbar openSection={openSection} onOpenSection={setOpenSection} />
            ) : null
          ) : (
            <View style={styles.footer}>
              {error ? (
                <Txt variant="caption" color="danger">
                  {error}
                </Txt>
              ) : null}
              <Button
                title="Save changes"
                disabled={!canSave(form)}
                loading={saving}
                onPress={save}
              />
              <Button
                title="Delete session"
                variant="danger"
                onPress={() => setConfirmingDelete(true)}
              />
            </View>
          )
        }
      >
        <SessionEditor
          form={form}
          onChange={(patch) => setForm({ ...form, ...patch })}
          openSection={openSection}
          onOpenSection={setOpenSection}
        />
        <ConfirmDialog
          visible={confirmingDelete}
          title="Delete this session?"
          message="You can't undo this."
          confirmLabel="Delete session"
          destructive
          onConfirm={performDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title="Session"
      headerRight={
        <Pressable
          onPress={startEditing}
          accessibilityRole="button"
          accessibilityLabel="Edit session"
          hitSlop={space.md}
        >
          <Icon name="edit" size={size.iconLg} color="text" />
        </Pressable>
      }
    >
      <SessionReadView session={session} />
      {hasDraft ? (
        <Card bordered onPress={startEditing} accessibilityLabel="Continue editing">
          <Txt variant="label">Continue editing</Txt>
          <Txt variant="caption" color="textSecondary">
            You have unsaved changes to this session on this phone.
          </Txt>
        </Card>
      ) : null}
    </StackScreen>
  );
}

function SessionReadView({ session }: { session: SessionDetail }) {
  const mood = MOODS.find((m) => m.value === session.moodScale);
  const meta = [session.categoryName, formatDuration(session.durationMinutes)].filter(Boolean);

  return (
    <View style={styles.read}>
      <View style={styles.block}>
        <Txt variant="title">{session.trainingFocus ?? session.categoryName ?? 'Session'}</Txt>
        <Txt variant="bodySm" color="textSecondary">
          {formatLongDay(session.trainingDate)}
        </Txt>
        {/* The recorded time is when the entry was made, not when training happened. */}
        <Txt variant="caption" color="textSecondary">
          Recorded at {formatTime(session.createdAt)}
        </Txt>
        <SyncBadge status={session.sync} />
      </View>

      {meta.length > 0 || session.sessionTypes.length > 0 ? (
        <View style={styles.chips}>
          {meta.map((m) => (
            <Chip key={m} label={m as string} selected />
          ))}
          {session.sessionTypes.map((t) => (
            <Chip key={t.id} label={t.name} />
          ))}
        </View>
      ) : null}

      <TextBlock title="Techniques learned" text={session.techniques} />
      <TextBlock title="Self-assessment" text={session.selfAssessment} />
      <TextBlock title="Coach feedback" text={session.coachFeedback} />
      <TextBlock title="Injury or discomfort" text={session.injuryNotes} danger />

      {session.rating !== null || mood || session.moodText ? (
        <Card>
          <Txt variant="label">Rating and mood</Txt>
          <View style={styles.rating}>
            {session.rating !== null ? (
              <>
                <Stars value={session.rating} />
                <Txt variant="bodySm" color="textSecondary">
                  {`${session.rating} out of 10`}
                </Txt>
              </>
            ) : null}
            {mood ? (
              <Txt variant="bodySm" color="textSecondary">
                {mood.label}
              </Txt>
            ) : null}
            {/* Legacy mood text is shown exactly as it was recorded. */}
            {session.moodText ? (
              <Txt variant="bodySm" color="textSecondary">
                {session.moodText}
              </Txt>
            ) : null}
          </View>
        </Card>
      ) : null}

      {session.exercises.length > 0 ? <ExercisesBlock exercises={session.exercises} /> : null}

      <TextBlock title="What I'm proud of" text={session.proudOf} />
      <TextBlock title="What to improve" text={session.toImprove} />
    </View>
  );
}

function ExercisesBlock({ exercises }: { exercises: ExerciseEntry[] }) {
  return (
    <Card>
      <Txt variant="label">Exercises</Txt>
      <View style={styles.exercises}>
        {exercises.map((exercise) => (
          <ExerciseTable key={exercise.id} exercise={exercise} />
        ))}
      </View>
    </Card>
  );
}

function TextBlock({ title, text, danger }: { title: string; text: string | null; danger?: boolean }) {
  if (!text) return null;
  return (
    <Card>
      <Txt variant="label" color={danger ? 'danger' : 'text'}>
        {title}
      </Txt>
      <Txt variant="body" color="textSecondary" style={styles.blockText}>
        {text}
      </Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  footer: { gap: space.sm },
  read: { gap: space.md },
  block: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  rating: { gap: space.sm, paddingTop: space.sm },
  blockText: { paddingTop: space.sm },
  exercises: { gap: space.lg, paddingTop: space.md },
});
