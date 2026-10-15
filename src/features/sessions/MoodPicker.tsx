import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Txt } from '@/components/ui';
import { MOODS } from '@/features/sessions/formState';
import { colors, radius, size, space } from '@/theme/tokens';

type MoodPickerProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

// Five faces for how the athlete felt emotionally after training.
// Tapping the selected one again clears it.
export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <View style={styles.row}>
      {MOODS.map((mood) => {
        const selected = value === mood.value;
        return (
          <Pressable
            key={mood.value}
            onPress={() => onChange(selected ? null : mood.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Mood: ${mood.label}`}
            style={[styles.item, selected && styles.itemSelected]}
          >
            <View style={[styles.circle, selected && styles.circleSelected]}>
              <Icon
                name={mood.icon}
                size={size.iconLg}
                color={selected ? 'onAccent' : 'textSecondary'}
              />
            </View>
            <Txt variant="micro" color={selected ? 'accent' : 'textSecondary'}>
              {mood.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemSelected: { borderColor: colors.accentBorder },
  circle: {
    width: size.moodCircle,
    height: size.moodCircle,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleSelected: { backgroundColor: colors.accent },
});
