import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button, Icon, ProgressBar, Txt } from '@/components/ui';
import { describeCriteria, describeProgress } from '@/features/goals/criteria';
import {
  milestoneProgress,
  useLinkedSessions,
  type MilestoneItem,
} from '@/features/goals/queries';
import { deleteMilestone, setSkillCompleted } from '@/features/goals/repo';
import type { SessionFact } from '@/features/goals/criteria';
import { formatDateRow, toDateKey } from '@/lib/dates';
import { size, space } from '@/theme/tokens';

type Props = {
  milestone: MilestoneItem | null;
  facts: SessionFact[];
  categoryNames: Map<string, string>;
  onClose: () => void;
  onEdit: (milestone: MilestoneItem) => void;
  onLink: (milestone: MilestoneItem) => void;
};

export function MilestoneDetailSheet({ milestone, facts, categoryNames, onClose, onEdit, onLink }: Props) {
  const linked = useLinkedSessions(milestone?.id ?? null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const m = milestone;
  const progress = m ? milestoneProgress(m, facts) : null;
  const done = !!m?.completedAt;

  return (
    <BottomSheet visible={m !== null} onClose={onClose} title={m?.title ?? 'Milestone'}>
      {m ? (
        <View style={styles.body}>
          <View style={styles.status}>
            <Icon
              name={done ? 'check-circle' : m.kind === 'skill' ? 'military-tech' : 'show-chart'}
              size={size.iconLg}
              color={done ? 'accent' : 'textSecondary'}
            />
            <View style={styles.statusText}>
              <Txt variant="label">
                {done ? 'Completed' : m.kind === 'skill' ? 'Skill milestone' : 'Automatic milestone'}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                {done && m.completedAt
                  ? `${formatDateRow(toDateKey(m.completedAt), 'short')} · ${m.completedBy === 'auto' ? 'completed automatically' : 'marked done by you'}`
                  : m.kind === 'skill'
                    ? 'Mark it done when you have it.'
                    : m.criteria
                      ? `Reach ${describeCriteria(m.criteria, m.criteria.categoryId ? categoryNames.get(m.criteria.categoryId) ?? null : null)}${m.criteria.since ? ` from ${formatDateRow(m.criteria.since, 'short')}` : ''}.`
                      : 'No target set. Edit it to add one.'}
              </Txt>
            </View>
          </View>

          {m.kind === 'measurable' && m.criteria && progress ? (
            <View style={styles.progress}>
              <ProgressBar value={progress.fraction} />
              <Txt variant="caption" color="textSecondary">
                {describeProgress(m.criteria, progress)}
              </Txt>
            </View>
          ) : null}

          {m.kind === 'skill' ? (
            <Button
              title={done ? 'Reopen milestone' : 'Mark as complete'}
              variant={done ? 'secondary' : 'primary'}
              icon={done ? 'undo' : 'check'}
              onPress={() => void setSkillCompleted(m.id, !done)}
            />
          ) : null}

          <View style={styles.linked}>
            <Txt variant="label">Linked sessions</Txt>
            {linked.length === 0 ? (
              <Txt variant="bodySm" color="textSecondary">
                None yet. Link the sessions that got you here.
              </Txt>
            ) : (
              linked.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/session/[id]', params: { id: s.id } });
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.link, pressed && styles.pressed]}
                >
                  <View style={styles.statusText}>
                    <Txt variant="bodySm" numberOfLines={1}>
                      {s.trainingFocus ?? s.categoryName ?? 'Session'}
                    </Txt>
                    <Txt variant="caption" color="textSecondary">
                      {formatDateRow(s.trainingDate, 'short')}
                    </Txt>
                  </View>
                  <Icon name="chevron-right" />
                </Pressable>
              ))
            )}
            <Button title="Link sessions" variant="secondary" icon="link" onPress={() => onLink(m)} />
          </View>

          <View style={styles.actions}>
            <Button title="Edit milestone" variant="secondary" icon="edit" onPress={() => onEdit(m)} />
            <Button title="Delete milestone" variant="danger" onPress={() => setConfirmingDelete(true)} />
          </View>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this milestone?"
        message="It will be removed from the path. Your sessions stay as they are."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          if (m) void deleteMilestone(m.id);
          onClose();
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.xxl, paddingBottom: space.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  statusText: { flex: 1, gap: space.xxs },
  progress: { gap: space.sm },
  linked: { gap: space.md },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  pressed: { opacity: 0.8 },
  actions: { gap: space.md },
});
