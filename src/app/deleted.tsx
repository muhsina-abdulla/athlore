import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Button, Card, StackScreen, Txt } from '@/components/ui';
import { useDeletedSessions } from '@/features/sessions/queries';
import { restoreSession } from '@/features/sessions/repo';
import { formatDay, toDateKey } from '@/lib/dates';
import { space } from '@/theme/tokens';

// Deleted sessions are kept, not erased. Restoring one brings it back exactly as it
// was, with its exercises, sets and notes.
export default function DeletedSessionsScreen() {
  const sessions = useDeletedSessions();

  return (
    <StackScreen title="Recently deleted">
      <Txt variant="bodySm" color="textSecondary">
        Deleted sessions are kept here. Restore one to bring it back exactly as it was.
      </Txt>

      {sessions.length === 0 ? (
        <EmptyState message="Nothing has been deleted." />
      ) : (
        <View style={styles.list}>
          {sessions.map((session) => {
            const title = session.trainingFocus ?? session.categoryName ?? 'Session';
            const meta = [
              formatDay(session.trainingDate),
              session.trainingFocus ? session.categoryName : null,
            ].filter(Boolean);
            return (
              <Card key={session.id}>
                <Txt variant="label" numberOfLines={2}>
                  {title}
                </Txt>
                <Txt variant="caption" color="textSecondary">
                  {meta.join(' · ')}
                </Txt>
                <Txt variant="caption" color="textSecondary">
                  {`Deleted ${formatDay(toDateKey(session.deletedAt)).toLowerCase()}`}
                </Txt>
                <View style={styles.action}>
                  <Button
                    title="Restore"
                    variant="secondary"
                    onPress={() => void restoreSession(session.id)}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  action: { paddingTop: space.md },
});
