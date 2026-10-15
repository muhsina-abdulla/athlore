import { router } from 'expo-router';

import type { DraftRow } from '@/features/sessions/queries';

// A draft of a new session resumes in the log form. A draft of unsaved edits to
// an existing session resumes on that session's screen.
export function resumeDraft(draft: Pick<DraftRow, 'sessionId' | 'isEdit'>) {
  if (draft.isEdit) {
    router.push({ pathname: '/session/[id]', params: { id: draft.sessionId } });
  } else {
    router.push({ pathname: '/log', params: { draftId: draft.sessionId } });
  }
}
