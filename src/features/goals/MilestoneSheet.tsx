import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { TextField } from '@/components/TextField';
import { Button, Chip, Txt } from '@/components/ui';
import { METRIC_LABEL, METRICS, type Metric } from '@/features/goals/criteria';
import type { MilestoneItem } from '@/features/goals/queries';
import { addMilestone, updateMilestone } from '@/features/goals/repo';
import { useCategories } from '@/features/sessions/queries';
import { formatDay, todayKey } from '@/lib/dates';
import type { MilestoneKind } from '@/db/schema';
import { space } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  goalId: string;
  // Set when editing an existing milestone.
  milestone: MilestoneItem | null;
};

export function MilestoneSheet({ visible, onClose, goalId, milestone }: Props) {
  const categories = useCategories();

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<MilestoneKind>('measurable');
  const [metric, setMetric] = useState<Metric>('sessions');
  const [target, setTarget] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sinceDate, setSinceDate] = useState<string>(todayKey());
  const [countAll, setCountAll] = useState(true);

  // Start from the milestone's current values each time the sheet opens.
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setTitle(milestone?.title ?? '');
      setKind(milestone?.kind ?? 'measurable');
      setMetric(milestone?.criteria?.metric ?? 'sessions');
      setTarget(milestone?.criteria ? String(milestone.criteria.target) : '');
      setCategoryId(milestone?.criteria?.categoryId ?? null);
      setSinceDate(milestone?.criteria?.since ?? todayKey());
      setCountAll(milestone?.criteria ? milestone.criteria.since === null : true);
    }
  }

  const targetNumber = parseFloat(target.replace(',', '.'));
  const valid =
    title.trim() !== '' && (kind === 'skill' || (Number.isFinite(targetNumber) && targetNumber > 0));

  const save = async () => {
    if (!valid) return;
    const input = {
      title,
      kind,
      criteria:
        kind === 'measurable'
          ? { metric, target: targetNumber, categoryId, since: countAll ? null : sinceDate }
          : null,
    };
    if (milestone) await updateMilestone(milestone.id, input);
    else await addMilestone(goalId, input);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={milestone ? 'Edit milestone' : 'New milestone'}
      footer={<Button title={milestone ? 'Save milestone' : 'Add milestone'} onPress={save} disabled={!valid} />}
    >
      <View style={styles.body}>
        <TextField
          label="Milestone"
          value={title}
          onChangeText={setTitle}
          placeholder={kind === 'skill' ? 'Hit a clean double leg takedown' : 'Train 30 sessions'}
        />

        <View style={styles.group}>
          <Txt variant="caption" color="textSecondary">
            How it completes
          </Txt>
          <View style={styles.chips}>
            <Chip label="Automatic" selected={kind === 'measurable'} onPress={() => setKind('measurable')} />
            <Chip label="I mark it done" selected={kind === 'skill'} onPress={() => setKind('skill')} />
          </View>
          <Txt variant="caption" color="textTertiary">
            {kind === 'measurable'
              ? 'Completes by itself when your training history reaches the target.'
              : 'A skill you complete yourself, when you feel you have it.'}
          </Txt>
        </View>

        {kind === 'measurable' ? (
          <>
            <View style={styles.group}>
              <Txt variant="caption" color="textSecondary">
                Count
              </Txt>
              <View style={styles.chips}>
                {METRICS.map((m) => (
                  <Chip key={m} label={METRIC_LABEL[m]} selected={metric === m} onPress={() => setMetric(m)} />
                ))}
              </View>
            </View>

            <TextField
              label="Target"
              value={target}
              onChangeText={setTarget}
              placeholder={metric === 'hours' ? '50' : '30'}
              keyboardType="numeric"
            />

            <View style={styles.group}>
              <Txt variant="caption" color="textSecondary">
                Category
              </Txt>
              <View style={styles.chips}>
                <Chip label="Any" selected={categoryId === null} onPress={() => setCategoryId(null)} />
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={categoryId === c.id}
                    onPress={() => setCategoryId(c.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <Txt variant="caption" color="textSecondary">
                Start counting
              </Txt>
              <View style={styles.chips}>
                <Chip label="All my history" selected={countAll} onPress={() => setCountAll(true)} />
                <Chip
                  label={`From ${formatDay(sinceDate).toLowerCase()}`}
                  selected={!countAll}
                  onPress={() => setCountAll(false)}
                />
              </View>
            </View>
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.xxl, paddingBottom: space.md },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
