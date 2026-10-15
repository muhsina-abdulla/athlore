import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Txt } from '@/components/ui';
import { colors, radius, size, space } from '@/theme/tokens';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  // False for a message that only needs "OK".
  showCancel?: boolean;
  // Destructive actions use the red button; the green one is for the primary action.
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// A centred confirmation in the app's own style, instead of the system alert.
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  showCancel = true,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      onRequestClose={onCancel}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel={cancelLabel} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <Txt variant="section">{title}</Txt>
          <Txt variant="body" color="textSecondary">
            {message}
          </Txt>
          <View style={styles.buttons}>
            {showCancel ? (
              <Button title={cancelLabel} variant="secondary" onPress={onCancel} style={styles.button} />
            ) : null}
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.screen },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  dialog: {
    width: '100%',
    maxWidth: size.dialogMax,
    gap: space.md,
    padding: space.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  buttons: { flexDirection: 'row', gap: space.md, paddingTop: space.md },
  button: { flex: 1, paddingHorizontal: space.md },
});
