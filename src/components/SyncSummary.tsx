import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/store';
import { Button, Icon, Txt } from '@/components/ui';
import { useSyncCounts } from '@/features/sessions/queries';
import { useSyncStatus } from '@/sync/status';
import { syncNow } from '@/sync/worker';
import { colors, radius, size, space } from '@/theme/tokens';

// One line at the top of History about sessions that haven't reached the server.
// Nothing shows when everything is synced, or when sync isn't set up at all.
export function SyncSummary() {
  const status = useAuth((s) => s.status);
  const { waiting, failed } = useSyncCounts();
  const state = useSyncStatus((s) => s.state);
  const lastError = useSyncStatus((s) => s.lastError);

  const syncError = state === 'error';
  if (status !== 'signedIn' || (waiting === 0 && failed === 0 && !syncError)) return null;

  const plural = (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`;
  const hasFailures = failed > 0 || syncError;
  const text = hasFailures
    ? failed > 0
      ? `Couldn't sync ${plural(failed)}`
      : `Sync ran into a problem`
    : state === 'syncing'
      ? `Syncing ${plural(waiting)}`
      : state === 'offline'
        ? `Offline · ${plural(waiting)} waiting to sync`
        : `${plural(waiting)} waiting to sync`;

  return (
    <View style={[styles.root, hasFailures && styles.failed]}>
      <Icon
        name={hasFailures ? 'error-outline' : 'sync'}
        size={size.iconLg}
        color={hasFailures ? 'danger' : 'textSecondary'}
      />
      <View style={styles.text}>
        <Txt variant="bodySm" color={hasFailures ? 'danger' : 'textSecondary'}>
          {text}
        </Txt>
        {hasFailures && lastError ? (
          <Txt variant="caption" color="textSecondary">
            {lastError}
          </Txt>
        ) : null}
      </View>
      {state !== 'syncing' ? (
        <Button title="Retry all" variant="quiet" onPress={() => void syncNow()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    paddingRight: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  failed: {
    backgroundColor: colors.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dangerBorder,
  },
  text: { flex: 1 },
});
