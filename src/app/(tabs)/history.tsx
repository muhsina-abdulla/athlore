import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SearchField } from '@/components/SearchField';
import { SessionCard } from '@/components/SessionCard';
import { SyncSummary } from '@/components/SyncSummary';
import { Button, Card, Chip, Icon, SectionTitle, TabScreen, Txt } from '@/components/ui';
import { CategoryFilterSheet } from '@/features/sessions/CategoryFilterSheet';
import { DateRangeSheet } from '@/features/sessions/DateRangeSheet';
import { formatDuration } from '@/features/sessions/formState';
import {
  formatRange,
  hasActiveFilters,
  NO_FILTERS,
  type HistoryFilters,
} from '@/features/sessions/historyFilter';
import {
  useCategories,
  useDeletedSessions,
  useDrafts,
  useSessionRows,
  type SessionRow,
} from '@/features/sessions/queries';
import { resumeDraft } from '@/features/sessions/resume';
import { formatDay } from '@/lib/dates';
import { syncNow } from '@/sync/worker';
import { size, space } from '@/theme/tokens';

const SEARCH_DELAY_MS = 250;

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
  // What is typed, and what the list is actually filtered by. The list waits a
  // moment after the last keystroke so it isn't rebuilt on every letter.
  const [text, setText] = useState('');
  const [filters, setFilters] = useState<HistoryFilters>(NO_FILTERS);
  const [categorySheet, setCategorySheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.query === text ? f : { ...f, query: text }));
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const rows = useSessionRows(filters);
  const drafts = useDrafts();
  const deletedCount = useDeletedSessions().length;
  const categories = useCategories();
  const groups = groupByDay(rows);

  const filtering = hasActiveFilters(filters);
  const categoryLabel =
    filters.categoryIds.length === 0
      ? 'Category'
      : filters.categoryIds.length === 1
        ? (categories.find((c) => c.id === filters.categoryIds[0])?.name ?? 'Category')
        : `Category · ${filters.categoryIds.length}`;
  const dateActive = filters.from !== null || filters.to !== null;

  const clearAll = () => {
    setText('');
    setFilters(NO_FILTERS);
  };

  // Drafts aren't sessions yet, so they only show when nothing is being filtered.
  const showDrafts = drafts.length > 0 && !filtering && text.trim() === '';

  return (
    <TabScreen title="History">
      <SyncSummary />
      <View style={styles.controls}>
        <SearchField
          value={text}
          onChangeText={setText}
          placeholder="Search sessions, techniques, feedback"
        />
        <View style={styles.chips}>
          <Chip
            label={categoryLabel}
            selected={filters.categoryIds.length > 0}
            onPress={() => setCategorySheet(true)}
          />
          <Chip
            label={dateActive ? formatRange(filters.from, filters.to) : 'Date'}
            selected={dateActive}
            onPress={() => setDateSheet(true)}
          />
          {filtering || text.trim() !== '' ? (
            <Button title="Clear all" variant="quiet" onPress={clearAll} />
          ) : null}
        </View>
        {filtering ? (
          <Txt variant="caption" color="textSecondary">
            {`${rows.length} ${rows.length === 1 ? 'session' : 'sessions'} found`}
          </Txt>
        ) : null}
      </View>

      {showDrafts ? (
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

      {groups.length === 0 && filtering ? (
        <EmptyState
          message="No sessions match these filters."
          action={{ label: 'Clear filters', onPress: clearAll }}
        />
      ) : null}

      {groups.length === 0 && !filtering && !showDrafts ? (
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
                onRetry={() => void syncNow()}
              />
            ))}
          </View>
        </View>
      ))}

      {deletedCount > 0 && !filtering ? (
        <Card onPress={() => router.push('/deleted')} accessibilityLabel="Open recently deleted sessions">
          <View style={styles.deletedRow}>
            <Txt variant="bodySm" color="textSecondary" style={styles.flex}>
              {`Recently deleted · ${deletedCount}`}
            </Txt>
            <Icon name="chevron-right" size={size.iconLg} />
          </View>
        </Card>
      ) : null}

      <CategoryFilterSheet
        visible={categorySheet}
        onClose={() => setCategorySheet(false)}
        selectedIds={filters.categoryIds}
        onChange={(categoryIds) => setFilters((f) => ({ ...f, categoryIds }))}
      />
      <DateRangeSheet
        visible={dateSheet}
        onClose={() => setDateSheet(false)}
        from={filters.from}
        to={filters.to}
        onChange={(from, to) => setFilters((f) => ({ ...f, from, to }))}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  list: { gap: space.md },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  deletedRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
