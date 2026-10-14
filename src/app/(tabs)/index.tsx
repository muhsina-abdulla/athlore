import { router } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { TabScreen } from '@/components/ui';

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
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // TODO: drafts banner, this week, last session and next milestone once the
  // local database exists.
  return (
    <TabScreen title={greeting(now)} subtitle={today} initials={PLACEHOLDER_INITIALS}>
      <EmptyState
        icon="sports-martial-arts"
        title="Log your first session"
        message="Your training history will build up here."
        action={{ label: 'Log a session', primary: true, onPress: () => router.push('/log') }}
      />
    </TabScreen>
  );
}
