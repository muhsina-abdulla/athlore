import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TextField } from '@/components/TextField';
import { Button, Txt } from '@/components/ui';
import { createGoal, deleteGoal, renameGoal } from '@/features/goals/repo';
import { space } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  // Set when editing an existing goal.
  goal: { id: string; title: string } | null;
  onCreated: (id: string) => void;
  onDeleted: () => void;
};

export function GoalSheet({ visible, onClose, goal, onCreated, onDeleted }: Props) {
  const [title, setTitle] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Start from the goal's current title each time the sheet opens.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setTitle(goal?.title ?? '');
  }

  const save = async () => {
    if (title.trim() === '') return;
    if (goal) {
      await renameGoal(goal.id, title);
    } else {
      const id = await createGoal(title);
      if (id) onCreated(id);
    }
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      footer={<Button title={goal ? 'Save goal' : 'Create goal'} onPress={save} disabled={title.trim() === ''} />}
    >
      <View style={styles.body}>
        <TextField
          label="Goal"
          value={title}
          onChangeText={setTitle}
          placeholder="Win my first amateur fight"
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {goal ? (
          <View style={styles.danger}>
            <Txt variant="caption" color="textSecondary">
              Deleting a goal hides it and its milestones. Your sessions are not touched.
            </Txt>
            <Button title="Delete goal" variant="danger" onPress={() => setConfirmingDelete(true)} />
          </View>
        ) : null}
      </View>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete this goal?"
        message="The goal and its milestones will be removed. Your sessions stay as they are."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          if (goal) deleteGoal(goal.id);
          onClose();
          onDeleted();
        }}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.xxl },
  danger: { gap: space.md },
});
