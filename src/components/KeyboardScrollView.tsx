import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInput,
  type ViewStyle,
} from 'react-native';

import { space } from '@/theme/tokens';

type KeyboardScroll = {
  // The input that has focus, so it can be kept above the keyboard.
  setFocused: (input: TextInput | null) => void;
  // Scroll so the focused input's bottom edge sits above the keyboard.
  ensureVisible: () => void;
};

const KeyboardScrollContext = createContext<KeyboardScroll | null>(null);

// Null outside a KeyboardScrollView (for example inside a modal sheet), where
// inputs simply don't scroll anything.
export function useKeyboardScroll(): KeyboardScroll | null {
  return useContext(KeyboardScrollContext);
}

type KeyboardScrollViewProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

// A ScrollView that keeps the field being typed in above the keyboard. Tall text
// boxes grow as you type, so it re-checks on every size change, not just on focus.
export function KeyboardScrollView({ children, contentContainerStyle }: KeyboardScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const focused = useRef<TextInput | null>(null);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const ensureVisible = useCallback(() => {
    const input = focused.current;
    const top = keyboardTop.current;
    if (!input || top === null) return;
    input.measureInWindow((_x, y, _w, h) => {
      const hiddenBy = y + h + space.lg - top;
      if (hiddenBy > 0) {
        scrollRef.current?.scrollTo({ y: scrollY.current + hiddenBy, animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
      // Let the layout settle around the keyboard before measuring.
      setTimeout(ensureVisible, 50);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  const api = useMemo<KeyboardScroll>(
    () => ({
      setFocused: (input) => {
        focused.current = input;
        if (input) ensureVisible();
      },
      ensureVisible,
    }),
    [ensureVisible],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  };

  return (
    <KeyboardScrollContext.Provider value={api}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        // Room to scroll the last field clear of the keyboard, whether or not the
        // window itself resizes for it.
        contentContainerStyle={[
          contentContainerStyle,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + space.xxl },
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardScrollContext.Provider>
  );
}
