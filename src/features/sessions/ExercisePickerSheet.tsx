import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { TextField } from '@/components/TextField';
import { Button, Chip, Icon, Txt } from '@/components/ui';
import { MUSCLE_GROUPS } from '@/db/defaultExercises';
import type { SetKind } from '@/db/schema';
import { useExercises, useRecentExerciseIds } from '@/features/sessions/queries';
import { createExercise } from '@/features/sessions/repo';
import { colors, size, space } from '@/theme/tokens';

export type PickedExercise = { id: string; name: string; defaultKind: SetKind };

type ExercisePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: PickedExercise) => void;
};

// Pick from the master list (and the athlete's own exercises), or add a custom one.
export function ExercisePickerSheet({ visible, onClose, onPick }: ExercisePickerSheetProps) {
  const all = useExercises();
  const recentIds = useRecentExerciseIds();
  const [query, setQuery] = useState('');
  const [customGroup, setCustomGroup] = useState<string | null>(null);

  const search = query.trim().toLowerCase();
  const matches = useMemo(
    () => (search ? all.filter((e) => e.name.toLowerCase().includes(search)) : all),
    [all, search],
  );
  const exactMatch = all.some((e) => e.name.toLowerCase() === search);

  const recent = useMemo(
    () =>
      recentIds
        .map((id) => all.find((e) => e.id === id))
        .filter((e): e is (typeof all)[number] => e !== undefined),
    [recentIds, all],
  );

  // Master list grouped by muscle group; the athlete's own exercises without a
  // group go under "Other".
  const groups = useMemo(() => {
    const names: string[] = [...MUSCLE_GROUPS, 'Other'];
    return names
      .map((name) => ({
        name,
        items: matches.filter((e) =>
          name === 'Other'
            ? !e.muscleGroup || !MUSCLE_GROUPS.some((g) => g === e.muscleGroup)
            : e.muscleGroup === name,
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [matches]);

  const close = () => {
    setQuery('');
    setCustomGroup(null);
    onClose();
  };

  const pick = (exercise: PickedExercise) => {
    onPick(exercise);
    close();
  };

  const addCustom = async () => {
    const name = query.trim();
    if (name === '') return;
    const id = await createExercise(name, customGroup, 'reps_weight');
    // createExercise returns the existing exercise if the name was already taken,
    // so use what is stored rather than assuming the new one.
    const stored = all.find((e) => e.id === id);
    pick({ id, name: stored?.name ?? name, defaultKind: stored?.defaultKind ?? 'reps_weight' });
  };

  return (
    <BottomSheet visible={visible} onClose={close} title="Add exercise">
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder="Search exercises"
        returnKeyType="search"
      />

      {search !== '' && !exactMatch ? (
        <View style={styles.custom}>
          <Txt variant="label">{`Add "${query.trim()}" as a custom exercise`}</Txt>
          <Txt variant="caption" color="textSecondary">
            Muscle group (optional)
          </Txt>
          <View style={styles.chips}>
            {MUSCLE_GROUPS.map((g) => (
              <Chip
                key={g}
                label={g}
                selected={customGroup === g}
                onPress={() => setCustomGroup(customGroup === g ? null : g)}
              />
            ))}
          </View>
          <Button title="Add custom exercise" onPress={addCustom} />
        </View>
      ) : null}

      {search === '' && recent.length > 0 ? (
        <View style={styles.group}>
          <Txt variant="overline" color="textSecondary">
            Recently used
          </Txt>
          {recent.map((e) => (
            <ExerciseRow key={`recent-${e.id}`} name={e.name} onPress={() => pick(e)} />
          ))}
        </View>
      ) : null}

      {groups.map((group) => (
        <View key={group.name} style={styles.group}>
          <Txt variant="overline" color="textSecondary">
            {group.name}
          </Txt>
          {group.items.map((e) => (
            <ExerciseRow
              key={e.id}
              name={e.name}
              custom={e.isCustom}
              onPress={() => pick(e)}
            />
          ))}
        </View>
      ))}

    </BottomSheet>
  );
}

function ExerciseRow({
  name,
  custom,
  onPress,
}: {
  name: string;
  custom?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Add ${name}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Txt variant="body" style={styles.rowName}>
        {name}
      </Txt>
      {custom ? (
        <Txt variant="micro" color="textSecondary">
          Custom
        </Txt>
      ) : null}
      <Icon name="add" size={size.iconLg} color="accent" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  custom: { gap: space.md, paddingVertical: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  group: { gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.touch,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowPressed: { backgroundColor: colors.cardPressed },
  rowName: { flex: 1 },
});
