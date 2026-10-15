import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, StackScreen, Txt } from '@/components/ui';
import { type DetailKey } from '@/features/sessions/detailSections';
import { DetailToolbar } from '@/features/sessions/DetailToolbar';
import { canSave, emptyForm, type SessionForm } from '@/features/sessions/formState';
import { getDraft, saveSession } from '@/features/sessions/repo';
import { SessionEditor } from '@/features/sessions/SessionEditor';
import { useDraftAutosave } from '@/features/sessions/useDraftAutosave';
import { todayKey } from '@/lib/dates';
import { newId } from '@/lib/id';
import { useKeyboardVisible } from '@/lib/useKeyboardVisible';
import { colors, size, space } from '@/theme/tokens';

const NOTICE_MS = 3000;

export default function LogSessionScreen() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();

  // The id is the session's id for life: the draft, the saved session and every
  // retried push all share it, which is what makes a retry safe.
  const [sessionId, setSessionId] = useState(() => draftId ?? newId());
  const [form, setForm] = useState<SessionForm>(() => emptyForm(todayKey()));
  const [ready, setReady] = useState(!draftId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<DetailKey | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardVisible = useKeyboardVisible();

  useEffect(() => {
    if (!draftId) return;
    let cancelled = false;
    void getDraft(draftId).then((draft) => {
      if (cancelled) return;
      if (draft) setForm(draft.form);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const autosave = useDraftAutosave({
    sessionId,
    isEdit: false,
    form,
    baseline: null,
    enabled: ready,
  });

  const onChange = (patch: Partial<SessionForm>) => setForm((f) => ({ ...f, ...patch }));

  const save = async (addAnother: boolean) => {
    if (!canSave(form) || saving) return;
    setSaving(true);
    setError(null);
    autosave.stop();
    try {
      await saveSession(sessionId, form);
      if (addAnother) {
        setSessionId(newId());
        setForm(emptyForm(form.trainingDate));
        setOpenSection(null);
        autosave.resume();
        setNotice('Session saved. Ready for the next one.');
        noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
      } else {
        router.back();
      }
    } catch {
      // The save is all-or-nothing, so the draft is untouched and still recoverable.
      autosave.resume();
      setError("Couldn't save this session. Your draft is still on this phone.");
    } finally {
      setSaving(false);
    }
  };

  const draftSaved = autosave.savedAt !== null;

  // While typing, the keyboard owns the bottom of the screen. If a detail section
  // is open it gets the Next / Done bar; otherwise no footer.
  let footer = null;
  if (keyboardVisible) {
    footer = openSection ? (
      <DetailToolbar openSection={openSection} onOpenSection={setOpenSection} />
    ) : null;
  } else {
    footer = (
      <View style={styles.footer}>
        {error ? (
          <Txt variant="caption" color="danger">
            {error}
          </Txt>
        ) : notice ? (
          <Txt variant="caption" color="textSecondary">
            {notice}
          </Txt>
        ) : !canSave(form) ? (
          <Txt variant="caption" color="textSecondary">
            Choose a category to save.
          </Txt>
        ) : null}
        <Button
          title="Save session"
          disabled={!canSave(form)}
          loading={saving}
          onPress={() => save(false)}
        />
        <Button
          title="+ Add another session today"
          variant="quiet"
          disabled={!canSave(form) || saving}
          onPress={() => save(true)}
        />
      </View>
    );
  }

  return (
    <StackScreen
      title="Log session"
      headerRight={
        draftSaved ? (
          <View style={styles.saved}>
            <View style={styles.savedDot} />
            <Txt variant="caption" color="textSecondary">
              Draft saved
            </Txt>
          </View>
        ) : null
      }
      footer={footer}
    >
      {ready ? (
        <SessionEditor
          form={form}
          onChange={onChange}
          openSection={openSection}
          onOpenSection={setOpenSection}
        />
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  saved: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  savedDot: {
    width: size.dot - space.xxs * 2,
    height: size.dot - space.xxs * 2,
    borderRadius: size.dot,
    backgroundColor: colors.accent,
  },
  footer: { gap: space.xs },
});
