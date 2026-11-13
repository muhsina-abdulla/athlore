// TODO(design): Progress
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Button, Card, Chip, ProgressBar, SectionTitle, TabScreen, Txt } from '@/components/ui';
import { GoalPath } from '@/features/goals/GoalPath';
import { GoalSheet } from '@/features/goals/GoalSheet';
import { LinkSessionsSheet } from '@/features/goals/LinkSessionsSheet';
import { MilestoneDetailSheet } from '@/features/goals/MilestoneDetailSheet';
import { MilestoneSheet } from '@/features/goals/MilestoneSheet';
import {
  summarizeGoal,
  useCategoryNames,
  useGoals,
  useMilestones,
  useSessionFacts,
  type MilestoneItem,
} from '@/features/goals/queries';
import { space } from '@/theme/tokens';

export default function ProgressScreen() {
  const goals = useGoals();
  const allMilestones = useMilestones();
  const facts = useSessionFacts();
  const categoryNames = useCategoryNames();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [goalSheet, setGoalSheet] = useState<'new' | 'edit' | null>(null);
  const [milestoneSheet, setMilestoneSheet] = useState<'new' | 'edit' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // The chosen goal, or the first one when nothing is chosen (or it was deleted).
  const goal = goals.find((g) => g.id === selectedId) ?? goals[0] ?? null;
  const path = useMemo(
    () => (goal ? allMilestones.filter((m) => m.goalId === goal.id) : []),
    [allMilestones, goal],
  );
  const summary = summarizeGoal(path);

  // Sheets look their milestone up in the live list, so they reflect changes at once.
  const opened = allMilestones.find((m) => m.id === openId) ?? null;
  const editing = allMilestones.find((m) => m.id === editingId) ?? null;

  const openMilestone = (m: MilestoneItem) => setOpenId(m.id);

  return (
    <TabScreen title="Progress">
      {goals.length === 0 || !goal ? (
        <EmptyState
          icon="flag"
          title="Set your first goal"
          message="Break it into milestones and follow your path, one step at a time."
          action={{ label: 'Create a goal', primary: true, onPress: () => setGoalSheet('new') }}
        />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {goals.map((g) => (
              <Chip key={g.id} label={g.title} selected={g.id === goal.id} onPress={() => setSelectedId(g.id)} />
            ))}
            <Chip label="New goal" icon="add" onPress={() => setGoalSheet('new')} />
          </ScrollView>

          <Card>
            <View style={styles.goalTop}>
              <Txt variant="section" style={styles.flex}>
                {goal.title}
              </Txt>
              <Button title="Edit" variant="quiet" onPress={() => setGoalSheet('edit')} />
            </View>
            <Txt variant="caption" color="textSecondary" style={styles.count}>
              {summary.total === 0
                ? 'No milestones yet'
                : `${summary.done} of ${summary.total} milestones`}
            </Txt>
            {summary.total > 0 ? <ProgressBar value={summary.done / summary.total} /> : null}
          </Card>

          <View>
            <SectionTitle title="Path" />
            {path.length === 0 ? (
              <Card>
                <Txt variant="bodySm" color="textSecondary">
                  No milestones yet. Add the first step on this path.
                </Txt>
              </Card>
            ) : (
              <GoalPath path={path} facts={facts} categoryNames={categoryNames} onPress={openMilestone} />
            )}
          </View>

          <Button
            title="Add milestone"
            variant={path.length === 0 ? 'primary' : 'secondary'}
            icon="add"
            onPress={() => {
              setEditingId(null);
              setMilestoneSheet('new');
            }}
          />
        </>
      )}

      <GoalSheet
        visible={goalSheet !== null}
        onClose={() => setGoalSheet(null)}
        goal={goalSheet === 'edit' && goal ? { id: goal.id, title: goal.title } : null}
        onCreated={setSelectedId}
        onDeleted={() => setSelectedId(null)}
      />

      <MilestoneDetailSheet
        milestone={opened}
        facts={facts}
        categoryNames={categoryNames}
        onClose={() => setOpenId(null)}
        onEdit={(m) => {
          setOpenId(null);
          setEditingId(m.id);
          setMilestoneSheet('edit');
        }}
        onLink={(m) => setLinkingId(m.id)}
      />

      <MilestoneSheet
        visible={milestoneSheet !== null && goal !== null}
        onClose={() => setMilestoneSheet(null)}
        goalId={goal?.id ?? ''}
        milestone={milestoneSheet === 'edit' ? editing : null}
      />

      <LinkSessionsSheet
        visible={linkingId !== null}
        onClose={() => setLinkingId(null)}
        milestoneId={linkingId}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { gap: space.sm },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  count: { paddingBottom: space.sm },
});
