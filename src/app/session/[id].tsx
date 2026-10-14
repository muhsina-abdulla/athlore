import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/EmptyState';
import { StackScreen } from '@/components/ui';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: read view and edit mode once sessions are stored locally.
  return (
    <StackScreen title="Session">
      <EmptyState message={`Session ${id} not found.`} />
    </StackScreen>
  );
}
