import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TextField } from '@/components/TextField';
import { Button, Icon, Txt } from '@/components/ui';
import type { RemoveResult } from '@/features/sessions/repo';
import { colors, size, space } from '@/theme/tokens';

type Item = { id: string; name: string };

type OtherOptionsSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  // "category" or "session type", used in the empty state and messages.
  noun: string;
  // The entries beyond the defaults shown as chips.
  items: Item[];
  selectedIds: string[];
  // Several entries can be selected (session types) or just one (category).
  multi: boolean;
  onSelect: (id: string) => void;
  onAdd: (name: string) => Promise<void>;
  onRemove: (id: string) => Promise<RemoveResult>;
};

// Everything beyond the default chips lives here, so the form stays tidy however
// many entries pile up: pick one, add a new one, or remove one that is no longer
// wanted. An entry that sessions still use can't be removed.
export function OtherOptionsSheet({
  visible,
  onClose,
  title,
  noun,
  items,
  selectedIds,
  multi,
  onSelect,
  onAdd,
  onRemove,
}: OtherOptionsSheetProps) {
  const [name, setName] = useState('');
  const [removing, setRemoving] = useState<Item | null>(null);
  const [blocked, setBlocked] = useState<{ item: Item; usedBy: number } | null>(null);

  const add = async () => {
    if (name.trim() === '') return;
    await onAdd(name);
    setName('');
  };

  const confirmRemove = async () => {
    const item = removing;
    setRemoving(null);
    if (!item) return;
    const result = await onRemove(item.id);
    if (!result.ok) setBlocked({ item, usedBy: result.usedBy });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.addRow}>
        <View style={styles.flex}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder={`New ${noun}`}
            returnKeyType="done"
            onSubmitEditing={add}
          />
        </View>
        <Button title="Add" variant="secondary" onPress={add} />
      </View>

      {items.length === 0 ? (
        <Txt variant="bodySm" color="textSecondary">
          {`No other ${noun}s yet. Add one above.`}
        </Txt>
      ) : (
        items.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <View key={item.id} style={styles.row}>
              <Pressable
                onPress={() => onSelect(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.name}
                style={styles.pick}
              >
                <Icon
                  name={
                    multi
                      ? selected
                        ? 'check-box'
                        : 'check-box-outline-blank'
                      : selected
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                  }
                  size={size.iconLg}
                  color={selected ? 'accent' : 'textSecondary'}
                />
                <Txt variant="body" style={styles.flex}>
                  {item.name}
                </Txt>
              </Pressable>
              <Pressable
                onPress={() => setRemoving(item)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}
                hitSlop={space.sm}
                style={styles.remove}
              >
                <Icon name="delete-outline" size={size.iconLg} />
              </Pressable>
            </View>
          );
        })
      )}

      <ConfirmDialog
        visible={removing !== null}
        title={`Remove "${removing?.name ?? ''}"?`}
        message={`It will no longer be offered. Sessions you've already logged aren't affected.`}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
      <ConfirmDialog
        visible={blocked !== null}
        title={`Can't remove "${blocked?.item.name ?? ''}"`}
        message={`It's used by ${blocked?.usedBy ?? 0} ${blocked?.usedBy === 1 ? 'session' : 'sessions'}. Delete or edit ${blocked?.usedBy === 1 ? 'that session' : 'those sessions'} first.`}
        confirmLabel="OK"
        showCancel={false}
        onConfirm={() => setBlocked(null)}
        onCancel={() => setBlocked(null)}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: size.touch,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pick: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: size.touch },
  remove: { minWidth: size.touch, minHeight: size.touch, alignItems: 'center', justifyContent: 'center' },
});
