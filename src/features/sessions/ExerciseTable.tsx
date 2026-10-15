import { StyleSheet, View } from 'react-native';

import { Icon, Txt } from '@/components/ui';
import {
  AMOUNT_COLUMN,
  KIND_META,
  formatAmount,
  setCount,
  type ExerciseEntry,
} from '@/features/sessions/formState';
import { colors, size, space } from '@/theme/tokens';

// One exercise as a small table. The column headers say what each number is, so
// the rows need no explaining. The Sets column is how many identical sets a row
// stands for; a star marks the top set.
export function ExerciseTable({ exercise }: { exercise: ExerciseEntry }) {
  const meta = KIND_META[exercise.kind];
  const amountTitle = AMOUNT_COLUMN[exercise.kind];

  return (
    <View style={styles.root}>
      <Txt variant="body">{exercise.name}</Txt>

      {exercise.sets.length === 0 ? (
        <Txt variant="caption" color="textSecondary">
          No sets recorded
        </Txt>
      ) : (
        <View style={styles.table}>
          <View style={[styles.row, styles.header]}>
            <Txt variant="micro" color="textSecondary" style={styles.sets}>
              Sets
            </Txt>
            {meta.showReps ? (
              <Txt variant="micro" color="textSecondary" style={styles.reps}>
                Reps
              </Txt>
            ) : null}
            {amountTitle ? (
              <Txt variant="micro" color="textSecondary" style={styles.amount}>
                {amountTitle}
              </Txt>
            ) : (
              <View style={styles.amount} />
            )}
            <View style={styles.top} />
          </View>

          {exercise.sets.map((set) => (
            <View key={set.id} style={styles.row}>
              <Txt variant="bodySm" color="textSecondary" style={styles.sets}>
                {setCount(set)}
              </Txt>
              {meta.showReps ? (
                <Txt variant="bodySm" style={styles.reps}>
                  {set.reps.trim() || '–'}
                </Txt>
              ) : null}
              {amountTitle ? (
                <Txt variant="bodySm" style={styles.amount}>
                  {formatAmount(exercise.kind, set.amount) || '–'}
                </Txt>
              ) : (
                <View style={styles.amount} />
              )}
              <View style={styles.top}>
                {set.isTop ? (
                  <View accessible accessibilityLabel="Top set">
                    <Icon name="star" size={size.iconSm} color="accent" />
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      {exercise.notes.trim() !== '' ? (
        <Txt variant="caption" color="textSecondary">
          {`Note: ${exercise.notes.trim()}`}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  table: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: size.iconLg },
  header: {
    paddingBottom: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sets: { width: size.touch },
  reps: { width: size.touch + space.md },
  amount: { flex: 1 },
  top: { width: size.iconLg, alignItems: 'flex-end' },
});
