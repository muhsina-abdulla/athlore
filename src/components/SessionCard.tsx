import { StyleSheet, View } from 'react-native';

import { Card, Icon, SyncBadge, Txt } from '@/components/ui';
import { formatDuration } from '@/features/sessions/formState';
import type { SessionRow } from '@/features/sessions/queries';
import { size, space } from '@/theme/tokens';

// One session in a list. Used by History and by the Home screen's last session.
export function SessionCard({ session, onPress }: { session: SessionRow; onPress: () => void }) {
  const title = session.trainingFocus ?? session.categoryName ?? 'Session';
  const meta = [
    session.trainingFocus ? session.categoryName : null,
    formatDuration(session.durationMinutes) || null,
  ].filter(Boolean);

  return (
    <Card onPress={onPress} accessibilityLabel={`Open session: ${title}`}>
      <View style={styles.top}>
        <Txt variant="label" style={styles.title} numberOfLines={2}>
          {title}
        </Txt>
        {session.rating !== null ? (
          <View style={styles.rating}>
            <Icon name="star" size={size.iconSm} color="accent" />
            <Txt variant="bodySm">{`${session.rating}/10`}</Txt>
          </View>
        ) : null}
      </View>
      {meta.length > 0 ? (
        <Txt variant="caption" color="textSecondary">
          {meta.join(' · ')}
        </Txt>
      ) : null}
      {session.sync !== 'synced' ? (
        <View style={styles.sync}>
          <SyncBadge status={session.sync} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  title: { flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  sync: { alignSelf: 'flex-start', paddingTop: space.sm },
});
