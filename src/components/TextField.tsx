import { useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
} from 'react-native';

import { useKeyboardScroll } from '@/components/KeyboardScrollView';
import { Txt } from '@/components/ui';
import { colors, radius, size, space, type } from '@/theme/tokens';

type TextFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  // Smaller, centred input for table cells.
  compact?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
};

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  compact,
  keyboardType,
  returnKeyType,
  autoFocus,
  onSubmitEditing,
  onFocus,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const keyboardScroll = useKeyboardScroll();
  return (
    <View style={styles.root}>
      {label ? (
        <Txt variant="caption" color={focused ? 'accent' : 'textSecondary'}>
          {label}
        </Txt>
      ) : null}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => {
          setFocused(true);
          keyboardScroll?.setFocused(inputRef.current);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          if (keyboardScroll) keyboardScroll.setFocused(null);
        }}
        // Text boxes grow as you type; keep the end of the text above the keyboard.
        onContentSizeChange={multiline ? () => keyboardScroll?.ensureVisible() : undefined}
        accessibilityLabel={label ?? placeholder}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        style={[
          styles.input,
          multiline && styles.multiline,
          compact && styles.compact,
          focused && styles.focused,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs },
  input: {
    ...type.body,
    color: colors.text,
    minHeight: size.input,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  multiline: { minHeight: size.inputMulti, textAlignVertical: 'top' },
  compact: {
    ...type.bodySm,
    color: colors.text,
    minHeight: size.touch,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    textAlign: 'center',
  },
  focused: { borderColor: colors.accent },
});
