import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Txt, type IconName } from '@/components/ui';
import { colors, opacity, radius, size, space } from '@/theme/tokens';

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'home' },
  history: { label: 'History', icon: 'history' },
  progress: { label: 'Progress', icon: 'trending-up' },
  insights: { label: 'Insights', icon: 'auto-awesome' },
};

// Home · History · [Log] · Progress · Insights. Log isn't a tab: it opens the
// log screen, which slides up over the tabs.
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const tabs = state.routes.map((route, index) => {
    const meta = TAB_META[route.name];
    if (!meta) return null;
    const focused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
      >
        <Icon name={meta.icon} size={size.iconLg} color={focused ? 'accent' : 'textSecondary'} />
        <Txt variant="micro" color={focused ? 'accent' : 'textSecondary'}>
          {meta.label}
        </Txt>
      </Pressable>
    );
  });

  const middle = Math.ceil(tabs.length / 2);

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {tabs.slice(0, middle)}
      <View style={styles.tab}>
        <Pressable
          onPress={() => router.push('/log')}
          accessibilityRole="button"
          accessibilityLabel="Log session"
          style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}
        >
          <Icon name="add" size={size.iconLg + space.xs} color="onAccent" />
        </Pressable>
        <Txt variant="micro" color="textSecondary">
          Log
        </Txt>
      </View>
      {tabs.slice(middle)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  tab: {
    flex: 1,
    minHeight: size.tabBar,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
  },
  logButton: {
    width: size.logButton,
    height: size.logButton,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -size.logButtonLift,
    marginBottom: space.xxs,
    borderWidth: space.xs,
    borderColor: colors.bg,
  },
  pressed: { opacity: opacity.pressed },
});
