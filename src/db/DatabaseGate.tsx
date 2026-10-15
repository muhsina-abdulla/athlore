import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { seedDefaults } from '@/db/seed';
import { Txt } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

// Renders children only once the local database is migrated and seeded.
// Nothing reads the database before this.
export function DatabaseGate({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!success) return;
    seedDefaults()
      .then(() => setSeeded(true))
      .catch((e: Error) => setSeedError(e));
  }, [success]);

  const failure = error ?? seedError;
  if (failure) {
    return (
      <View style={styles.center}>
        <Txt variant="section">{"Couldn't open your training log"}</Txt>
        <Txt variant="bodySm" color="textSecondary" style={styles.message}>
          {failure.message}
        </Txt>
      </View>
    );
  }

  // Show the background colour rather than a spinner: this takes well under 300ms.
  if (!success || !seeded) return <View style={styles.blank} />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.screen,
    gap: space.md,
  },
  message: { textAlign: 'center' },
});
