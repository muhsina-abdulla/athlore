import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SessionCard } from '@/components/SessionCard';
import { Card, SectionTitle, TabScreen, Txt } from '@/components/ui';
import { formatDuration } from '@/features/sessions/formState';
import {
  useCategories,
  useDrafts,
  useSessionRows,
  type SessionRow,
} from '@/features/sessions/queries';
import { resumeDraft } from '@/features/sessions/resume';
import { formatDay } from '@/lib/dates';
import { space } from '@/theme/tokens';

type DayGroup = { date: string; sessions: SessionRow[] };

// Rows arrive sorted by training date, so a single pass groups them by day.
function groupByDay(rows: SessionRow[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.trainingDate) last.sessions.push(row);
    else groups.push({ date: row.trainingDate, sessions: [row] });
  }
  return groups;
}

export default function HistoryScreen() {
  const rows = useSessionRows();
  const drafts = useDrafts();
  const categories = useCategories();
  const groups = groupByDay(rows);

  // TODO: search, category filter and date range once the list works end to end.
  return (
    <TabScreen title="History">
      {drafts.length > 0 ? (
        <View>
          <SectionTitle title="Drafts" />
          <View style={styles.list}>
            {drafts.map((draft) => {
              const category = categories.find((c) => c.id === draft.form.categoryId)?.name;
              const title = draft.form.trainingFocus.trim() || category || 'Untitled draft';
              const meta = [
                draft.isEdit ? 'Unsaved changes' : null,
                category,
                formatDuration(draft.form.durationMinutes) || null,
              ].filter(Boolean);
              return (
                <Card
                  key={draft.sessionId}
                  bordered
                  onPress={() => resumeDraft(draft)}
                  accessibilityLabel={`Resume draft: ${title}`}
                >
                  <View style={styles.draftRow}>
                    <View style={styles.flex}>
                      <Txt variant="label" numberOfLines={1}>
                        {title}
                      </Txt>
                      <Txt variant="caption" color="textSecondary">
                        {[formatDay(draft.form.trainingDate), ...meta].join(' · ')}
                      </Txt>
                    </View>
                    <Txt variant="bodySm" color="accent">
                      Resume
                    </Txt>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      ) : null}

      {groups.length === 0 && drafts.length === 0 ? (
        <EmptyState
          message="Your sessions will appear here, grouped by training day."
          action={{ label: 'Log a session', onPress: () => router.push('/log') }}
        />
      ) : null}

      {groups.map((group) => (
        <View key={group.date}>
          <View style={styles.dayHeader}>
            <Txt variant="section">{formatDay(group.date)}</Txt>
            <Txt variant="caption" color="textSecondary">
              {group.sessions.length} {group.sessions.length === 1 ? 'session' : 'sessions'}
            </Txt>
          </View>
          <View style={styles.list}>
            {group.sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onPress={() => router.push({ pathname: '/session/[id]', params: { id: s.id } })}
              />
            ))}
          </View>
        </View>
      ))}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: space.md },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
