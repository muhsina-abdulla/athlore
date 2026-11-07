import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button, Icon, Txt } from '@/components/ui';
import { useCategories } from '@/features/sessions/queries';
import { colors, size, space } from '@/theme/tokens';

type CategoryFilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

// Pick any number of categories to narrow History to. None selected means all.
export function CategoryFilterSheet({
  visible,
  onClose,
  selectedIds,
  onChange,
}: CategoryFilterSheetProps) {
  const categories = useCategories();

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Category"
      footer={
        <View style={styles.footer}>
          <Button
            title="Clear"
            variant="secondary"
            disabled={selectedIds.length === 0}
            onPress={() => onChange([])}
            style={styles.button}
          />
          <Button title="Done" onPress={onClose} style={styles.button} />
        </View>
      }
    >
      {categories.map((category) => {
        const selected = selectedIds.includes(category.id);
        return (
          <Pressable
            key={category.id}
            onPress={() => toggle(category.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={category.name}
            style={styles.row}
          >
            <Icon
              name={selected ? 'check-box' : 'check-box-outline-blank'}
              size={size.iconLg}
              color={selected ? 'accent' : 'textSecondary'}
            />
            <Txt variant="body">{category.name}</Txt>
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.touch,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  footer: { flexDirection: 'row', gap: space.md },
  button: { flex: 1 },
});
