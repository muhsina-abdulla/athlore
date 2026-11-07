import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { DatePickerSheet } from '@/components/DatePickerSheet';
import { Button, Chip, Icon, Txt } from '@/components/ui';
import { DATE_PRESETS, matchingPreset, presetRange } from '@/features/sessions/historyFilter';
import { formatDateRow, todayKey } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

type DateRangeSheetProps = {
  visible: boolean;
  onClose: () => void;
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
};

// Narrow History to a training-date range: a quick preset, or your own start and
// end picked on the calendar. Either end can be left open.
export function DateRangeSheet({ visible, onClose, from, to, onChange }: DateRangeSheetProps) {
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const today = todayKey();
  const activePreset = matchingPreset(from, to, today);

  const pickFrom = (key: string) => onChange(key, to !== null && to < key ? key : to);
  const pickTo = (key: string) => onChange(from !== null && from > key ? key : from, key);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Date range"
      footer={
        <View style={styles.footer}>
          <Button
            title="Clear"
            variant="secondary"
            disabled={from === null && to === null}
            onPress={() => onChange(null, null)}
            style={styles.button}
          />
          <Button title="Done" onPress={onClose} style={styles.button} />
        </View>
      }
    >
      <View style={styles.chips}>
        {DATE_PRESETS.map((preset) => (
          <Chip
            key={preset.id}
            label={preset.label}
            selected={activePreset === preset.id}
            onPress={() => {
              const range = presetRange(preset.id, today);
              onChange(range.from, range.to);
            }}
          />
        ))}
      </View>

      <Txt variant="caption" color="textSecondary">
        Or choose your own dates
      </Txt>
      <DateRow label="From" value={from} onPress={() => setPicking('from')} />
      <DateRow label="To" value={to} onPress={() => setPicking('to')} />

      <DatePickerSheet
        visible={picking !== null}
        value={(picking === 'to' ? to : from) ?? today}
        onClose={() => setPicking(null)}
        onPick={(key) => (picking === 'to' ? pickTo(key) : pickFrom(key))}
      />
    </BottomSheet>
  );
}

function DateRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} date: ${value ? formatDateRow(value) : 'any'}. Change`}
      style={styles.dateRow}
    >
      <Txt variant="bodySm" color="textSecondary" style={styles.dateLabel}>
        {label}
      </Txt>
      <Txt variant="body" style={styles.dateValue}>
        {value ? formatDateRow(value) : 'Any'}
      </Txt>
      <Icon name="event" size={size.iconLg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.input,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.inset,
  },
  dateLabel: { width: size.touch + space.md },
  dateValue: { flex: 1 },
  footer: { flexDirection: 'row', gap: space.md },
  button: { flex: 1 },
});
