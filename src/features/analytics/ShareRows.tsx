import { StyleSheet, View } from 'react-native';

import { ProgressBar, Txt } from '@/components/ui';
import { formatHours, type Share } from '@/features/analytics/stats';
import { space } from '@/theme/tokens';

// One row per category or session type: its name, how much, and a bar relative to the
// biggest one.
export function ShareRows({ rows }: { rows: Share[] }) {
  const most = Math.max(1, ...rows.map((r) => r.sessions));
  return (
    <View style={styles.root}>
      {rows.map((r) => (
        <View key={r.name} style={styles.row}>
          <View style={styles.top}>
            <Txt variant="bodySm" style={styles.name} numberOfLines={1}>
              {r.name}
            </Txt>
            <Txt variant="bodySm">{r.sessions}</Txt>
          </View>
          <ProgressBar value={r.sessions / most} />
          <Txt variant="caption" color="textSecondary">
            {`${r.trainingDays} ${r.trainingDays === 1 ? 'training day' : 'training days'}${r.minutes > 0 ? ` · ${formatHours(r.minutes)} h` : ''}`}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xl },
  row: { gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  name: { flex: 1 },
});
