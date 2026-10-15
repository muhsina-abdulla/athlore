import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Icon, Txt } from '@/components/ui';
import { colors, size, space } from '@/theme/tokens';

type DetailSectionProps = {
  title: string;
  // Shown under the title when closed: a preview of what was entered, or "Add".
  preview: string | null;
  // Shown under the title while open.
  hint?: string;
  tone?: 'default' | 'danger';
  open: boolean;
  // Another section is open: show this one as a single compact line.
  compact: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function DetailSection({
  title,
  preview,
  hint,
  tone = 'default',
  open,
  compact,
  onToggle,
  children,
}: DetailSectionProps) {
  const previewColor = preview && tone === 'danger' ? 'danger' : 'textSecondary';

  if (open) {
    return (
      <Card style={styles.open}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: true }}
          accessibilityLabel={title}
          style={styles.header}
        >
          <View style={styles.flex}>
            <Txt variant="label" color="accent">
              {title}
            </Txt>
            {hint ? (
              <Txt variant="caption" color="textSecondary">
                {hint}
              </Txt>
            ) : null}
          </View>
          <Icon name="expand-less" size={size.iconLg} color="accent" />
        </Pressable>
        <View style={styles.body}>{children}</View>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card bordered style={styles.compactCard}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: false }}
          accessibilityLabel={title}
          style={styles.header}
        >
          <Txt variant="bodySm" color="textSecondary">
            {title}
          </Txt>
          <Txt variant="bodySm" color={previewColor} numberOfLines={1} style={styles.compactValue}>
            {preview ?? 'Add'}
          </Txt>
          <Icon name="expand-more" size={size.iconLg} />
        </Pressable>
      </Card>
    );
  }

  return (
    <Card bordered>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        accessibilityLabel={title}
        style={styles.header}
      >
        <View style={styles.flex}>
          <Txt variant="label">{title}</Txt>
          <Txt variant="caption" color={previewColor} numberOfLines={1}>
            {preview ?? 'Add'}
          </Txt>
        </View>
        <Icon name="expand-more" size={size.iconLg} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: size.touch,
  },
  open: { borderWidth: 1, borderColor: colors.accentBorder },
  compactCard: { paddingVertical: space.sm },
  compactValue: { flex: 1, textAlign: 'right' },
  body: { paddingTop: space.md, gap: space.md },
});
