import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SessionCard } from '@/components/SessionCard';
import { WeekDots } from '@/components/WeekDots';
import { Card, Icon, ProgressBar, SectionTitle, TabScreen, Txt } from '@/components/ui';
import {
  fractionOf,
  summarizeGoal,
  useGoals,
  useMilestones,
  useSessionFacts,
} from '@/features/goals/queries';
import { useDrafts, useSessionRows, useTrainingDates } from '@/features/sessions/queries';
import { resumeDraft } from '@/features/sessions/resume';
import { addDays, todayKey, weekStartKey } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const now = new Date();
  const today = todayKey();
  const weekStart = weekStartKey(today);
  const weekEnd = addDays(weekStart, 6);

  const rows = useSessionRows();
  const drafts = useDrafts();
  const weekDates = useTrainingDates(weekStart, weekEnd);
  const goals = useGoals();
  const milestones = useMilestones();
  const facts = useSessionFacts();

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Sessions and training days are different numbers: two sessions on one day
  // are two sessions but one training day.
  const trainingDays = new Set(weekDates);
  const trained = Array.from({ length: 7 }, (_, i) => trainingDays.has(addDays(weekStart, i)));
  const todayIndex = (now.getDay() + 6) % 7;

  const lastSession = rows[0];
  const latestDraft = drafts[0];
  const isEmpty = rows.length === 0 && drafts.length === 0;

  // The first step not yet done, on the first goal that has one.
  const next = goals
    .map((g) => ({ goal: g, step: summarizeGoal(milestones.filter((m) => m.goalId === g.id)).next }))
    .find((entry) => entry.step !== null);

  return (
    <TabScreen title={greeting(now)} subtitle={dateLabel}>
      {latestDraft ? (
        <Pressable
          onPress={() => resumeDraft(latestDraft)}
          accessibilityRole="button"
          accessibilityLabel="Resume draft"
          style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
        >
          <Icon name="edit-note" size={size.iconLg} color="accent" />
          <Txt variant="bodySm" style={styles.bannerText}>
            {drafts.length === 1 ? '1 draft' : `${drafts.length} drafts`} saved on this phone
          </Txt>
          <Txt variant="bodySm" color="accent">
            Resume
          </Txt>
        </Pressable>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon="sports-martial-arts"
          title="Log your first session"
          message="Your training history will build up here."
          action={{ label: 'Log a session', primary: true, onPress: () => router.push('/log') }}
        />
      ) : null}

      {rows.length > 0 ? (
        <View>
          <SectionTitle title="This week" />
          <Card>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Txt variant="stat">{weekDates.length}</Txt>
                <Txt variant="caption" color="textSecondary">
                  {weekDates.length === 1 ? 'session' : 'sessions'}
                </Txt>
              </View>
              <View style={styles.stat}>
                <Txt variant="stat">{trainingDays.size}</Txt>
                <Txt variant="caption" color="textSecondary">
                  {trainingDays.size === 1 ? 'training day' : 'training days'}
                </Txt>
              </View>
            </View>
            <WeekDots trained={trained} todayIndex={todayIndex} />
          </Card>
        </View>
      ) : null}

      {next?.step ? (
        <View>
          <SectionTitle
            title="Next milestone"
            action={{ label: 'Progress', onPress: () => router.navigate('/progress') }}
          />
          <Card onPress={() => router.navigate('/progress')} accessibilityLabel="Open progress">
            <Txt variant="caption" color="textSecondary">
              {next.goal.title}
            </Txt>
            <View style={styles.milestoneTop}>
              <Txt variant="label" style={styles.milestoneTitle} numberOfLines={2}>
                {next.step.title}
              </Txt>
              {next.step.kind === 'measurable' ? (
                <Txt variant="label" color="accent">
                  {`${Math.round(fractionOf(next.step, facts) * 100)}%`}
                </Txt>
              ) : null}
            </View>
            {next.step.kind === 'measurable' ? (
              <ProgressBar value={fractionOf(next.step, facts)} />
            ) : (
              <Txt variant="caption" color="textSecondary">
                Skill milestone. Mark it done when you have it.
              </Txt>
            )}
          </Card>
        </View>
      ) : null}

      {lastSession ? (
        <View>
          <SectionTitle
            title="Last session"
            action={{ label: 'See all', onPress: () => router.navigate('/history') }}
          />
          <SessionCard
            session={lastSession}
            onPress={() =>
              router.push({ pathname: '/session/[id]', params: { id: lastSession.id } })
            }
          />
        </View>
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
  },
  bannerText: { flex: 1 },
  pressed: { opacity: 0.8 },
  stats: { flexDirection: 'row', gap: space.xxxl, marginBottom: space.lg },
  stat: { gap: space.xxs },
  milestoneTop: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  milestoneTitle: { flex: 1 },
});
