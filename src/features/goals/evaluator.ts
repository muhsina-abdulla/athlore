import { useEffect } from 'react';

import { progressOf } from '@/features/goals/criteria';
import { useMilestones, useSessionFacts } from '@/features/goals/queries';
import { completeAutomatically } from '@/features/goals/repo';

// Measurable milestones complete by themselves. This runs whenever sessions or
// milestones change, so a saved (or edited, or deleted) session is always counted
// without any button. A milestone that is already complete stays complete.
export function useMilestoneEvaluator() {
  const facts = useSessionFacts();
  const items = useMilestones();

  useEffect(() => {
    const met = items
      .filter((m) => m.kind === 'measurable' && m.criteria && !m.completedAt)
      .filter((m) => progressOf(m.criteria!, facts).met)
      .map((m) => m.id);
    completeAutomatically(met);
  }, [facts, items]);
}
