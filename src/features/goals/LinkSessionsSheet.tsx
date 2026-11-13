import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button, Icon, Txt } from '@/components/ui';
import { getLinkedSessionIds, setLinkedSessions } from '@/features/goals/repo';
import { useSessionRows } from '@/features/sessions/queries';
import { formatDateRow } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  milestoneId: string | null;
};

// Pick the sessions that belong to a milestone. Optional: a milestone is complete
// whether or not it has any.
export function LinkSessionsSheet({ visible, onClose, milestoneId }: Props) {
  const rows = useSessionRows();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!visible || !milestoneId) return;
    void getLinkedSessionIds(milestoneId).then(setSelected);
  }, [visible, milestoneId]);

  const toggle = (id: string) =>
    setSelected((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));

  const save = () => {
    if (milestoneId) setLinkedSessions(milestoneId, selected);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Link sessions"
      footer={<Button title={`Save (${selected.length})`} onPress={save} />}
    >
      {rows.length === 0 ? (
        <Txt variant="bodySm" color="textSecondary">
          Log a session first, then link it here.
        </Txt>
      ) : (
        rows.map((s) => {
          const on = selected.includes(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => toggle(s.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.box, on && styles.boxOn]}>
                {on ? <Icon name="check" size={size.iconSm} color="onAccent" /> : null}
              </View>
              <View style={styles.text}>
                <Txt variant="bodySm" numberOfLines={1}>
                  {s.trainingFocus ?? s.categoryName ?? 'Session'}
                </Txt>
                <Txt variant="caption" color="textSecondary">
                  {formatDateRow(s.trainingDate, 'short')}
                  {s.categoryName && s.trainingFocus ? ` · ${s.categoryName}` : ''}
                </Txt>
              </View>
            </Pressable>
          );
        })
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
  },
  pressed: { opacity: 0.8 },
  box: {
    width: size.iconLg,
    height: size.iconLg,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.inset,
  },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { flex: 1, gap: space.xxs },
});
