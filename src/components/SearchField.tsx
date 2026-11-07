import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui';
import { colors, radius, size, space, type } from '@/theme/tokens';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

// A search box with a magnifier and a clear button.
export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  return (
    <View style={styles.root}>
      <Icon name="search" size={size.iconLg} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        autoCorrect={false}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        accessibilityLabel={placeholder}
        style={styles.input}
      />
      {value !== '' ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={space.md}
        >
          <Icon name="close" size={size.icon} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: size.input,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.inset,
  },
  input: { ...type.body, flex: 1, color: colors.text, paddingVertical: space.md },
});
