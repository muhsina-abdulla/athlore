import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Chip, Icon, Txt } from '@/components/ui';
import { addDays, fromDateKey, monthDays, todayKey } from '@/lib/dates';
import { colors, radius, size, space } from '@/theme/tokens';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type DatePickerSheetProps = {
  visible: boolean;
  // The selected training date, as 'YYYY-MM-DD'.
  value: string;
  onClose: () => void;
  onPick: (dateKey: string) => void;
};

// A calendar in the app's own style. Training can't be logged in the future, so
// later days are disabled. Weeks start on Monday.
export function DatePickerSheet({ visible, value, onClose, onPick }: DatePickerSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Training date">
      <Calendar value={value} onClose={onClose} onPick={onPick} />
    </BottomSheet>
  );
}

type CalendarProps = Pick<DatePickerSheetProps, 'value' | 'onClose' | 'onPick'>;

function Calendar({ value, onClose, onPick }: CalendarProps) {
  const today = todayKey();
  const todayDate = fromDateKey(today);
  const selected = fromDateKey(value);

  const [view, setView] = useState({ year: selected.getFullYear(), month: selected.getMonth() });

  const atLatestMonth =
    view.year === todayDate.getFullYear() && view.month === todayDate.getMonth();

  const shiftMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const title = new Date(view.year, view.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const pick = (key: string) => {
    onPick(key);
    onClose();
  };

  return (
    <>
      <View style={styles.monthRow}>
        <Pressable
          onPress={() => shiftMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={space.md}
        >
          <Icon name="chevron-left" size={size.iconLg} color="text" />
        </Pressable>
        <Txt variant="label" style={styles.monthTitle}>
          {title}
        </Txt>
        <Pressable
          onPress={() => shiftMonth(1)}
          disabled={atLatestMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={space.md}
          style={atLatestMonth && styles.dimmed}
        >
          <Icon name="chevron-right" size={size.iconLg} color="text" />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {WEEKDAYS.map((letter, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <Txt variant="micro" color="textSecondary">
              {letter}
            </Txt>
          </View>
        ))}
        {monthDays(view.year, view.month).map((key, i) => {
          if (key === null) return <View key={`b${i}`} style={styles.cell} />;
          const future = key > today;
          const isSelected = key === value;
          const isToday = key === today;
          return (
            <Pressable
              key={key}
              onPress={() => pick(key)}
              disabled={future}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: future }}
              accessibilityLabel={fromDateKey(key).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              style={styles.cell}
            >
              <View
                style={[
                  styles.day,
                  isToday && !isSelected && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                <Txt
                  variant="bodySm"
                  color={isSelected ? 'onAccent' : future ? 'textTertiary' : 'text'}
                >
                  {fromDateKey(key).getDate()}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.quick}>
        <Chip label="Today" selected={value === today} onPress={() => pick(today)} />
        <Chip
          label="Yesterday"
          selected={value === addDays(today, -1)}
          onPress={() => pick(addDays(today, -1))}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: { flex: 1, textAlign: 'center' },
  dimmed: { opacity: 0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Seven equal columns.
  cell: {
    width: `${100 / 7}%`,
    height: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    width: size.touch - space.xs,
    height: size.touch - space.xs,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { borderWidth: 1, borderColor: colors.accent },
  daySelected: { backgroundColor: colors.accent },
  quick: { flexDirection: 'row', gap: space.sm, paddingTop: space.sm },
});
