// TODO(design): Insights
import { EmptyState } from '@/components/EmptyState';
import { TabScreen } from '@/components/ui';

export default function InsightsScreen() {
  return (
    <TabScreen title="Insights">
      <EmptyState message="Insights will appear once you have logged a few sessions." />
    </TabScreen>
  );
}
