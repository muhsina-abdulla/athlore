import { MaterialIcons, type MaterialIconsIconName } from '@react-native-vector-icons/material-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  opacity,
  radius,
  size,
  space,
  type,
  type ColorName,
  type TypeVariant,
} from '@/theme/tokens';

// ---------- Text ----------

type TxtProps = TextProps & {
  variant?: TypeVariant;
  color?: ColorName;
};

export function Txt({ variant = 'body', color = 'text', style, ...rest }: TxtProps) {
  return <Text {...rest} style={[type[variant], { color: colors[color] }, style]} />;
}

// ---------- Icon ----------

export type IconName = MaterialIconsIconName;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorName;
};

export function Icon({ name, size: iconSize = size.icon, color = 'textSecondary' }: IconProps) {
  return <MaterialIcons name={name} size={iconSize} color={colors[color]} />;
}

// ---------- Card ----------

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, bordered, style, accessibilityLabel }: CardProps) {
  const base = [styles.card, bordered && styles.cardBordered, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && styles.cardPressed]}
    >
      {children}
    </Pressable>
  );
}

// ---------- Chip ----------

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
};

export function Chip({ label, selected, onPress, icon }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={(size.touch - size.chip) / 2}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={size.iconSm} color={selected ? 'onAccent' : 'textSecondary'} />
      ) : null}
      <Txt variant="bodySm" color={selected ? 'onAccent' : 'text'}>
        {label}
      </Txt>
    </Pressable>
  );
}

// ---------- Button ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const buttonText: Record<ButtonVariant, ColorName> = {
  primary: 'onAccent',
  secondary: 'text',
  ghost: 'accent',
  danger: 'danger',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
}: ButtonProps) {
  const textColor = buttonText[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[textColor]} />
      ) : (
        <>
          {icon ? <Icon name={icon} color={textColor} /> : null}
          <Txt variant="label" color={textColor}>
            {title}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

// ---------- Stars ----------

// Ratings are stored 1–10 and shown as 5 stars with half-stars.
// Tapping a star sets a whole-star value: 2, 4, … 10.
type StarsProps = {
  value: number | null;
  onChange?: (value: number) => void;
  starSize?: number;
};

export function Stars({ value, onChange, starSize = size.star }: StarsProps) {
  const rating = value ?? 0;
  return (
    <View style={styles.row} accessibilityLabel={`Rating ${rating / 2} of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const full = rating >= star * 2;
        const half = !full && rating === star * 2 - 1;
        const name: IconName = full ? 'star' : half ? 'star-half' : 'star-border';
        const filled = full || half;
        const icon = <Icon name={name} size={starSize} color={filled ? 'accent' : 'textTertiary'} />;
        if (!onChange) return <View key={star}>{icon}</View>;
        return (
          <Pressable
            key={star}
            onPress={() => onChange(star * 2)}
            accessibilityRole="button"
            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
            hitSlop={space.sm}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- ProgressBar ----------

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

// ---------- Avatar ----------

export function Avatar({ initials, onPress }: { initials?: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      hitSlop={(size.touch - size.avatar) / 2}
      style={styles.avatar}
    >
      {initials ? (
        <Txt variant="label" color="onAccent">
          {initials}
        </Txt>
      ) : (
        <Icon name="person" size={size.iconSm} color="onAccent" />
      )}
    </Pressable>
  );
}

// ---------- SectionTitle ----------

type SectionTitleProps = {
  title: string;
  action?: { label: string; onPress: () => void };
};

export function SectionTitle({ title, action }: SectionTitleProps) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="section">{title}</Txt>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={space.md} accessibilityRole="button">
          <Txt variant="bodySm" color="accent">
            {action.label}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- SyncBadge ----------

export type SyncStatus = 'pending' | 'failed' | 'synced';

export function SyncBadge({ status, onRetry }: { status: SyncStatus; onRetry?: () => void }) {
  if (status === 'synced') return null;
  if (status === 'pending') {
    return (
      <View style={styles.row}>
        <Icon name="sync" size={size.iconSm} />
        <Txt variant="micro" color="textSecondary">
          Waiting to sync
        </Txt>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel="Couldn't sync. Retry"
      hitSlop={space.md}
      style={[styles.row, styles.badgeFailed]}
    >
      <Icon name="error-outline" size={size.iconSm} color="danger" />
      <Txt variant="micro" color="danger">
        {"Couldn't sync · Retry"}
      </Txt>
    </Pressable>
  );
}

// ---------- Screen wrappers ----------

type TabScreenProps = {
  title: string;
  subtitle?: string;
  initials?: string;
  children: ReactNode;
};

export function TabScreen({ title, subtitle, initials, children }: TabScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.tabContent}>
        <View style={styles.tabHeader}>
          <View style={styles.flex}>
            {subtitle ? (
              <Txt variant="caption" color="textSecondary">
                {subtitle}
              </Txt>
            ) : null}
            <Txt variant="title">{title}</Txt>
          </View>
          <Avatar initials={initials} />
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type StackScreenProps = {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
  closeIcon?: boolean;
};

export function StackScreen({ title, children, footer, headerRight, closeIcon }: StackScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.stackHeader}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={closeIcon ? 'Close' : 'Back'}
          hitSlop={(size.touch - size.iconLg) / 2}
        >
          <Icon name={closeIcon ? 'close' : 'arrow-back'} size={size.iconLg} color="text" />
        </Pressable>
        <Txt variant="section" style={styles.flex} numberOfLines={1}>
          {title}
        </Txt>
        {headerRight}
      </View>
      <ScrollView contentContainerStyle={styles.stackContent} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  cardBordered: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
  cardPressed: { backgroundColor: colors.cardPressed },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: size.chip,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    backgroundColor: colors.inset,
  },
  chipSelected: { backgroundColor: colors.accent },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: size.button,
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
  },
  button_primary: { backgroundColor: colors.accent },
  button_secondary: { backgroundColor: colors.card },
  button_ghost: { backgroundColor: 'transparent' },
  button_danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.dangerBorder,
  },

  progressTrack: {
    height: size.progress,
    borderRadius: radius.full,
    backgroundColor: colors.inset,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.accent },

  avatar: {
    width: size.avatar,
    height: size.avatar,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },

  badgeFailed: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.full,
    backgroundColor: colors.dangerSoft,
  },

  screen: { flex: 1, backgroundColor: colors.bg },
  tabContent: {
    paddingHorizontal: space.screen,
    paddingBottom: space.xxxl + size.logButtonLift,
    gap: space.xxl,
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.lg,
  },
  stackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.screen,
    paddingVertical: space.md,
  },
  stackContent: {
    paddingHorizontal: space.screen,
    paddingBottom: space.xxl,
    gap: space.xxl,
  },
  footer: {
    paddingHorizontal: space.screen,
    paddingTop: space.md,
    paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
});
