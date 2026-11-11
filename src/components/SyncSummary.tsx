import { StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/store';
import { Button, Icon, Txt } from '@/components/ui';
import { useSyncCounts } from '@/features/sessions/queries';
import { formatTime } from '@/lib/dates';
import { useSyncStatus } from '@/sync/status';
import { syncNow } from '@/sync/worker';
import { colors, radius, size, space } from '@/theme/tokens';

// The sync row at the top of History: what is waiting or failed, when it last synced,
// and a button to sync by hand. Nothing shows when sync isn't set up or nobody is
// signed in.
export function SyncSummary() {
  const status = useAuth((s) => s.status);
  const { waiting, failed } = useSyncCounts();
  const state = useSyncStatus((s) => s.state);
  const lastError = useSyncStatus((s) => s.lastError);
  const lastSyncedAt = useSyncStatus((s) => s.lastSyncedAt);

  // Only shown when sign-in is set up and someone is signed in. It is always there
  // then, so there is always a way to sync by hand.
  if (status !== 'signedIn') return null;

  const plural = (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`;
  const hasFailures = failed > 0 || state === 'error';
  const syncing = state === 'syncing';

  let text: string;
  let detail: string | null = null;
  if (hasFailures) {
    text = failed > 0 ? `Couldn't sync ${plural(failed)}` : 'Sync ran into a problem';
    detail = lastError;
  } else if (syncing) {
    text = waiting > 0 ? `Syncing ${plural(waiting)}` : 'Syncing';
  } else if (state === 'offline') {
    text = waiting > 0 ? `Offline · ${plural(waiting)} waiting to sync` : 'Offline';
  } else if (waiting > 0) {
    text = `${plural(waiting)} waiting to sync`;
  } else {
    text = 'All sessions synced';
    detail = lastSyncedAt ? `Last synced ${formatTime(new Date(lastSyncedAt))}` : 'Not synced yet today';
  }
  const actionTitle = hasFailures ? 'Retry all' : 'Sync now';

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
        {detail ? (
          <Txt variant="caption" color="textSecondary">
            {detail}
          </Txt>
        ) : null}
      </View>
      {!syncing ? <Button title={actionTitle} variant="quiet" onPress={() => void syncNow()} /> : null}
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
