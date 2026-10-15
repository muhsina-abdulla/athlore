import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { SessionCard } from '@/components/SessionCard';
import { WeekDots } from '@/components/WeekDots';
import { Card, Icon, SectionTitle, TabScreen, Txt } from '@/components/ui';
import { useDrafts, useSessionRows, useTrainingDates } from '@/features/sessions/queries';
import { resumeDraft } from '@/features/sessions/resume';
import { addDays, todayKey, weekStartKey } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

// TODO: replace with initials from the signed-in Google profile once auth exists.
const PLACEHOLDER_INITIALS = 'AL';

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

  // TODO: next milestone card once goals and milestones exist (phase 3).
  return (
    <TabScreen title={greeting(now)} subtitle={dateLabel} initials={PLACEHOLDER_INITIALS}>
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
});
