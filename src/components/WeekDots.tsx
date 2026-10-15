import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { colors, radius, size, space } from '@/theme/tokens';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type WeekDotsProps = {
  // One entry per weekday, Monday first: true when at least one session was logged.
  trained: boolean[];
  // Index (0 = Monday) of today, or -1 when today is not in this week.
  todayIndex: number;
};

export function WeekDots({ trained, todayIndex }: WeekDotsProps) {
  return (
    <View style={styles.row}>
      {DAY_LETTERS.map((letter, i) => (
        <View key={i} style={styles.day}>
          <View
            style={[
              styles.dot,
              trained[i] && styles.dotTrained,
              i === todayIndex && !trained[i] && styles.dotToday,
            ]}
          />
          <Txt variant="micro" color={i === todayIndex ? 'text' : 'textSecondary'}>
            {letter}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: space.xs, minWidth: size.weekDay },
  dot: {
    width: size.dot * 2,
    height: size.dot * 2,
    borderRadius: radius.full,
    backgroundColor: colors.inset,
  },
  dotTrained: { backgroundColor: colors.accent },
  dotToday: { borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.bg },
});
