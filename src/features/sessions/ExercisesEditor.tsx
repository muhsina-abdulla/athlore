import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { Button, Card, Chip, Icon, Txt } from '@/components/ui';
import type { SetKind } from '@/db/schema';
import {
  ExercisePickerSheet,
  type PickedExercise,
} from '@/features/sessions/ExercisePickerSheet';
import {
  KIND_META,
  MAX_SET_REPEAT,
  labelSets,
  SET_KIND_ORDER,
  newSetEntry,
  type ExerciseEntry,
  type SetEntry,
} from '@/features/sessions/formState';
import { newId } from '@/lib/id';
import { colors, radius, size, space } from '@/theme/tokens';

type ExercisesEditorProps = {
  exercises: ExerciseEntry[];
  onChange: (exercises: ExerciseEntry[]) => void;
};

// Optional exercise log for a session: pick exercises from the master list (or add
// your own), then fill in each set. Nothing here is required.
export function ExercisesEditor({ exercises, onChange }: ExercisesEditorProps) {
  const [picking, setPicking] = useState(false);

  const addExercise = (exercise: PickedExercise) => {
    onChange([
      ...exercises,
      {
        id: newId(),
        exerciseId: exercise.id,
        name: exercise.name,
        kind: exercise.defaultKind,
        notes: '',
        sets: [newSetEntry(newId())],
      },
    ]);
  };

  const update = (id: string, patch: Partial<ExerciseEntry>) =>
    onChange(exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const remove = (id: string) => onChange(exercises.filter((e) => e.id !== id));

  return (
    <View style={styles.root}>
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          onChange={(patch) => update(exercise.id, patch)}
          onRemove={() => remove(exercise.id)}
        />
      ))}
      <Button
        title={exercises.length === 0 ? 'Add an exercise' : 'Add another exercise'}
        variant="secondary"
        icon="add"
        onPress={() => setPicking(true)}
      />
      <ExercisePickerSheet
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={addExercise}
      />
    </View>
  );
}

type ExerciseCardProps = {
  exercise: ExerciseEntry;
  onChange: (patch: Partial<ExerciseEntry>) => void;
  onRemove: () => void;
};

function ExerciseCard({ exercise, onChange, onRemove }: ExerciseCardProps) {
  const meta = KIND_META[exercise.kind];

  const changeKind = (kind: SetKind) => {
    if (kind === exercise.kind) return;
    // The main number means something different (kg, seconds, metres), so it is
    // cleared when the unit changes. Reps carry over.
    const sameUnit = KIND_META[kind].amountLabel === meta.amountLabel;
    onChange({
      kind,
      sets: exercise.sets.map((s) => ({ ...s, amount: sameUnit ? s.amount : '' })),
    });
  };

  const updateSet = (id: string, patch: Partial<SetEntry>) =>
    onChange({ sets: exercise.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) });

  // One top set per exercise: marking one clears the others.
  const toggleTop = (id: string) =>
    onChange({
      sets: exercise.sets.map((s) => ({ ...s, isTop: s.id === id ? !s.isTop : false })),
    });

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    // A new set starts from the previous one, since sets of an exercise are
    // usually alike. Both values stay visible and editable.
    onChange({
      sets: [
        ...exercise.sets,
        { ...newSetEntry(newId()), reps: last?.reps ?? '', amount: last?.amount ?? '' },
      ],
    });
  };

  const removeSet = (id: string) => onChange({ sets: exercise.sets.filter((s) => s.id !== id) });

  const amountHeader =
    meta.amountLabel === null ? null : `${meta.amountPrefix ?? ''}${meta.amountLabel}`;

  const rows = labelSets(exercise.sets);

  const changeCount = (id: string, text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    const n = digits === '' ? null : Math.min(parseInt(digits, 10), MAX_SET_REPEAT);
    // A top set is a single set, so repeating a row clears its top marker.
    updateSet(id, n !== null && n > 1 ? { count: n, isTop: false } : { count: n });
  };

  return (
    <Card bordered style={styles.card}>
      <View style={styles.cardHeader}>
        <Txt variant="label" style={styles.flex}>
          {exercise.name}
        </Txt>
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${exercise.name}`}
          hitSlop={space.md}
        >
          <Icon name="delete" size={size.iconLg} />
        </Pressable>
      </View>

      <View style={styles.kinds}>
        {SET_KIND_ORDER.map((kind) => (
          <Chip
            key={kind}
            label={KIND_META[kind].label}
            selected={exercise.kind === kind}
            onPress={() => changeKind(kind)}
          />
        ))}
      </View>

      <View style={styles.table}>
        <View style={styles.tableRow}>
          <Txt variant="micro" color="textSecondary" style={styles.setCol}>
            Set
          </Txt>
          {meta.showReps ? (
            <Txt variant="micro" color="textSecondary" style={styles.cell}>
              Reps
            </Txt>
          ) : null}
          {amountHeader ? (
            <Txt variant="micro" color="textSecondary" style={styles.cell}>
              {amountHeader}
            </Txt>
          ) : null}
          <Txt variant="micro" color="textSecondary" style={styles.countCol}>
            ×
          </Txt>
          <Txt variant="micro" color="textSecondary" style={styles.topCol}>
            Top
          </Txt>
          <View style={styles.removeCol} />
        </View>

        {rows.map(({ set, label, repeated }, index) => (
          <View key={set.id} style={styles.tableRow}>
            <Txt variant="bodySm" color="textSecondary" style={styles.setCol}>
              {label}
            </Txt>
            {meta.showReps ? (
              <View style={styles.cell}>
                <TextField
                  compact
                  value={set.reps}
                  onChangeText={(reps) => updateSet(set.id, { reps: reps.replace(/[^0-9]/g, '') })}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            ) : null}
            {amountHeader ? (
              <View style={styles.cell}>
                <TextField
                  compact
                  value={set.amount}
                  onChangeText={(amount) =>
                    updateSet(set.id, { amount: amount.replace(/[^0-9.,]/g, '') })
                  }
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            ) : null}
            <View style={styles.countCol}>
              <TextField
                compact
                value={set.count == null ? '' : String(set.count)}
                onChangeText={(text) => changeCount(set.id, text)}
                placeholder="1"
                keyboardType="number-pad"
              />
            </View>
            <Pressable
              onPress={() => toggleTop(set.id)}
              disabled={repeated}
              accessibilityRole="button"
              accessibilityState={{ selected: set.isTop, disabled: repeated }}
              accessibilityLabel={`Top set, set ${index + 1}`}
              style={[
                styles.topCol,
                styles.topButton,
                set.isTop && styles.topButtonOn,
                repeated && styles.topButtonOff,
              ]}
            >
              <Icon
                name={set.isTop ? 'star' : 'star-border'}
                size={size.iconSm}
                color={set.isTop ? 'onAccent' : 'textSecondary'}
              />
            </Pressable>
            <Pressable
              onPress={() => removeSet(set.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove set ${index + 1}`}
              hitSlop={space.sm}
              style={styles.removeCol}
            >
              <Icon name="close" size={size.iconSm} />
            </Pressable>
          </View>
        ))}
      </View>

      <Button title="+ Add set" variant="quiet" onPress={addSet} />

      <TextField
        label="Notes"
        value={exercise.notes}
        onChangeText={(notes) => onChange({ notes })}
        placeholder="Optional"
        multiline
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { gap: space.md },
  card: { gap: space.md, backgroundColor: colors.bg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  table: { gap: space.sm },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  setCol: { width: size.iconLg + space.sm, textAlign: 'center' },
  countCol: { width: size.touch - space.xs, textAlign: 'center' },
  cell: { flex: 1, textAlign: 'center' },
  topCol: { width: size.touch - space.xs, textAlign: 'center' },
  topButton: {
    height: size.touch,
    borderRadius: radius.md,
    backgroundColor: colors.inset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topButtonOn: { backgroundColor: colors.accent },
  topButtonOff: { opacity: 0.4 },
  removeCol: { width: size.iconLg, alignItems: 'center' },
});
