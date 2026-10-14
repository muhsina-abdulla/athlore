import { EmptyState } from '@/components/EmptyState';
import { TabScreen } from '@/components/ui';

export default function HistoryScreen() {
  // TODO: search, filters and day-grouped session list once the local database exists.
  return (
    <TabScreen title="History">
      <EmptyState message="Your sessions will appear here, grouped by training day." />
    </TabScreen>
  );
}
