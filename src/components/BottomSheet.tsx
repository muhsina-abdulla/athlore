import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Txt } from '@/components/ui';
import { colors, radius, size, space } from '@/theme/tokens';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function BottomSheet({ visible, onClose, title, children, footer }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<View>(null);
  // How far the sheet is lifted so the keyboard doesn't cover it. A modal gets no
  // help from the screen behind it, so it measures how much the keyboard covers
  // and rises by exactly that (nothing if the window already made room).
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setLift(0);
      // Let the layout settle without the lift, then measure the overlap.
      setTimeout(() => {
        sheetRef.current?.measureInWindow((_x, y, _w, h) => {
          const covered = y + h - e.endCoordinates.screenY;
          setLift(covered > 0 ? covered : 0);
        });
      }, 100);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={[styles.root, { paddingBottom: lift }]}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close sheet" />
        <View
          ref={sheetRef}
          style={[styles.sheet, { paddingBottom: (lift > 0 ? 0 : insets.bottom) + space.lg }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Txt variant="section" style={styles.flex}>
              {title}
            </Txt>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={(size.touch - size.iconLg) / 2}
            >
              <Icon name="close" size={size.iconLg} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    alignSelf: 'center',
    width: size.sheetHandleWidth,
    height: size.sheetHandle,
    borderRadius: radius.full,
    backgroundColor: colors.divider,
    marginTop: space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingVertical: space.md,
  },
  content: { paddingHorizontal: space.screen, gap: space.md },
  footer: { paddingHorizontal: space.screen, paddingTop: space.lg },
});
