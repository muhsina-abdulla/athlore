import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import type { Week } from '@/features/analytics/stats';
import { fromDateKey } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

// Sessions per week, oldest on the left. The label is the Monday of that week.
export function WeekBars({ weeks }: { weeks: Week[] }) {
  const most = Math.max(1, ...weeks.map((w) => w.sessions));
  return (
    <View style={styles.root}>
      {weeks.map((w) => {
        const height = w.sessions === 0 ? space.xs : Math.max(size.dot, (w.sessions / most) * size.barMax);
        return (
          <View
            key={w.weekStart}
            style={styles.column}
            accessible
            accessibilityLabel={`Week of ${w.weekStart}: ${w.sessions} sessions on ${w.trainingDays} days`}
          >
            <Txt variant="micro" color={w.sessions > 0 ? 'text' : 'textTertiary'}>
              {w.sessions}
            </Txt>
            <View style={[styles.bar, w.sessions > 0 && styles.barOn, { height }]} />
            <Txt variant="micro" color="textTertiary">
              {fromDateKey(w.weekStart).getDate()}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  column: { flex: 1, maxWidth: size.barColumn, alignItems: 'center', gap: space.xs },
  bar: { width: space.lg, borderRadius: radius.sm, backgroundColor: colors.divider },
  barOn: { backgroundColor: colors.accent },
});
