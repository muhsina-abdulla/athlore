import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { hasContent, type SessionForm } from '@/features/sessions/formState';
import { deleteDraft, saveDraft } from '@/features/sessions/repo';

const DEBOUNCE_MS = 500;

type Options = {
  sessionId: string;
  isEdit: boolean;
  // Null while an edit has not started.
  form: SessionForm | null;
  // For edits: the saved version. A draft is only kept when the form differs
  // from it. For new sessions: null, and a draft is kept once anything is entered.
  baseline: SessionForm | null;
  // False while the form is still loading, so a half-loaded form is never saved.
  enabled: boolean;
};

// Autosaves the form to the local database while the user types.
// - writes ~500ms after the last change
// - writes immediately when the app goes to the background
// - writes on unmount, so closing the screen never drops the last keystrokes
// Call stop() before saving the session (so a late autosave cannot recreate the
// draft) and resume() if the save fails.
export function useDraftAutosave({ sessionId, isEdit, form, baseline, enabled }: Options) {
  const latest = useRef({ sessionId, isEdit, form, baseline });
  // Kept current in a layout effect (not during render), so the debounced and
  // unmount writes below always see the latest committed values.
  useLayoutEffect(() => {
    latest.current = { sessionId, isEdit, form, baseline };
  });

  const dirty = useRef(false);
  const stopped = useRef(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const write = useCallback(async () => {
    if (stopped.current) return;
    const { sessionId: id, isEdit: edit, form: current, baseline: base } = latest.current;
    if (!current) return;
    const worthKeeping = base
      ? JSON.stringify(current) !== JSON.stringify(base)
      : hasContent(current);
    if (worthKeeping) {
      await saveDraft(id, edit, current);
      setSavedAt(Date.now());
    } else {
      await deleteDraft(id);
      setSavedAt(null);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    dirty.current = true;
    const timer = setTimeout(() => {
      dirty.current = false;
      void write();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [form, enabled, write]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && dirty.current) {
        dirty.current = false;
        void write();
      }
    });
    return () => sub.remove();
  }, [write]);

  useEffect(
    () => () => {
      if (dirty.current) {
        dirty.current = false;
        void write();
      }
    },
    [write],
  );

  const stop = useCallback(() => {
    stopped.current = true;
    dirty.current = false;
  }, []);

  const resume = useCallback(() => {
    stopped.current = false;
  }, []);

  return { savedAt, stop, resume };
}
