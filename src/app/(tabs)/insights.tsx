// TODO(design): Insights
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Card, Chip, SectionTitle, TabScreen, Txt } from '@/components/ui';
import { useStatFacts } from '@/features/analytics/queries';
import { ShareRows } from '@/features/analytics/ShareRows';
import {
  computeStats,
  formatHours,
  monthLabel,
  RANGE_LABEL,
  type RangeKey,
} from '@/features/analytics/stats';
import { WeekBars } from '@/features/analytics/WeekBars';
import { todayKey } from '@/lib/dates';
import { space } from '@/theme/tokens';

const RANGES: RangeKey[] = ['4w', '12w', 'all'];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Txt variant="stat">{value}</Txt>
      <Txt variant="caption" color="textSecondary">
        {label}
      </Txt>
    </View>
  );
}

// Everything on this screen is analysis: numbers worked out from the sessions you have
// logged. Nothing is generated, and nothing here needs AI.
export default function InsightsScreen() {
  const facts = useStatFacts();
  const [range, setRange] = useState<RangeKey>('12w');
  const today = todayKey();
  const stats = useMemo(() => computeStats(facts, range, today), [facts, range, today]);

  return (
    <TabScreen title="Insights">
      {facts.length === 0 ? (
        <EmptyState message="Insights will appear once you have logged a few sessions." />
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.chips}>
              {RANGES.map((r) => (
                <Chip key={r} label={RANGE_LABEL[r]} selected={range === r} onPress={() => setRange(r)} />
              ))}
            </View>
            <Txt variant="overline" color="textSecondary">
              ANALYSIS
            </Txt>
            <Txt variant="caption" color="textSecondary">
              Worked out from the sessions you logged, by training date.
            </Txt>
          </View>

          {stats.sessions === 0 ? (
            <Card>
              <Txt variant="bodySm" color="textSecondary">
                No sessions in this period. Try a longer range.
              </Txt>
            </Card>
          ) : (
            <>
              <Card>
                <View style={styles.stats}>
                  <Stat value={String(stats.sessions)} label={stats.sessions === 1 ? 'session' : 'sessions'} />
                  <Stat
                    value={String(stats.trainingDays)}
                    label={stats.trainingDays === 1 ? 'training day' : 'training days'}
                  />
                  <Stat value={stats.withDuration > 0 ? formatHours(stats.totalMinutes) : '–'} label="hours" />
                </View>
                {stats.withDuration < stats.sessions ? (
                  <Txt variant="caption" color="textTertiary" style={styles.note}>
                    {stats.withDuration === 0
                      ? 'No session here has a duration yet.'
                      : `Hours count the ${stats.withDuration} of ${stats.sessions} sessions that have a duration.`}
                  </Txt>
                ) : null}
              </Card>

              <View>
                <SectionTitle title="Consistency" />
                <Card>
                  <View style={styles.stats}>
                    <Stat value={`${stats.activeWeeks}/${stats.weeks.length}`} label="weeks trained" />
                    <Stat value={String(stats.streakWeeks)} label={stats.streakWeeks === 1 ? 'week in a row' : 'weeks in a row'} />
                    <Stat value={String(stats.daysPerWeek)} label="days a week" />
                  </View>
                  <WeekBars weeks={stats.weeks} />
                  <Txt variant="caption" color="textTertiary" style={styles.note}>
                    Sessions per week. The number under each bar is the Monday of that week.
                  </Txt>
                </Card>
              </View>

              {stats.byCategory.length > 0 ? (
                <View>
                  <SectionTitle title="By category" />
                  <Card>
                    <ShareRows rows={stats.byCategory} />
                  </Card>
                </View>
              ) : null}

              {stats.byType.length > 0 ? (
                <View>
                  <SectionTitle title="By session type" />
                  <Card>
                    <ShareRows rows={stats.byType} />
                    <Txt variant="caption" color="textTertiary" style={styles.note}>
                      A session with several types counts under each of them.
                    </Txt>
                  </Card>
                </View>
              ) : null}

              <View>
                <SectionTitle title="Self-rating" />
                <Card>
                  {stats.averageRating === null ? (
                    <Txt variant="bodySm" color="textSecondary">
                      No rated sessions in this period.
                    </Txt>
                  ) : (
                    <>
                      <View style={styles.stats}>
                        <Stat value={`${stats.averageRating}/10`} label="average rating" />
                        <Stat value={String(stats.rated)} label={stats.rated === 1 ? 'rated session' : 'rated sessions'} />
                      </View>
                      {stats.ratingByMonth.length > 1 ? (
                        <View style={styles.months}>
                          {stats.ratingByMonth.map((m) => (
                            <View key={m.month} style={styles.month}>
                              <Txt variant="bodySm" color="textSecondary">
                                {monthLabel(m.month)}
                              </Txt>
                              <Txt variant="bodySm">{`${m.average}/10 · ${m.rated} rated`}</Txt>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      <Txt variant="caption" color="textTertiary" style={styles.note}>
                        Ratings from your older logs keep their original numbers.
                      </Txt>
                    </>
                  )}
                </Card>
              </View>
            </>
          )}
        </>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingBottom: space.sm },
  stats: { flexDirection: 'row', gap: space.xxl, marginBottom: space.lg },
  stat: { gap: space.xxs },
  note: { paddingTop: space.md },
  months: { gap: space.sm, paddingTop: space.xs },
  month: { flexDirection: 'row', justifyContent: 'space-between' },
});
