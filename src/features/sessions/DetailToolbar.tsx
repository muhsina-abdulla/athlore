import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/ui';
import { nextSection, type DetailKey } from '@/features/sessions/detailSections';
import { space } from '@/theme/tokens';

type DetailToolbarProps = {
  openSection: DetailKey;
  onOpenSection: (key: DetailKey | null) => void;
};

// Sits above the keyboard while a detail section is open: jump to the next
// section, or finish.
export function DetailToolbar({ openSection, onOpenSection }: DetailToolbarProps) {
  const next = nextSection(openSection);
  return (
    <View style={styles.row}>
      {next ? (
        <Pressable
          onPress={() => onOpenSection(next.key)}
          accessibilityRole="button"
          accessibilityLabel={`Next: ${next.title}`}
          hitSlop={space.md}
          style={styles.flex}
        >
          <Txt variant="bodySm" color="textSecondary">
            {`Next: ${next.title} ›`}
          </Txt>
        </Pressable>
      ) : (
        <View style={styles.flex} />
      )}
      <Pressable
        onPress={() => {
          Keyboard.dismiss();
          onOpenSection(null);
        }}
        accessibilityRole="button"
        accessibilityLabel="Done"
        hitSlop={space.md}
      >
        <Txt variant="label" color="accent">
          Done
        </Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
