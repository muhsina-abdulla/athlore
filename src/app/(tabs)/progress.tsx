// TODO(design): Progress
import { EmptyState } from '@/components/EmptyState';
import { TabScreen } from '@/components/ui';

export default function ProgressScreen() {
  return (
    <TabScreen title="Progress">
      <EmptyState message="Goals and milestones will appear here." />
    </TabScreen>
  );
}
