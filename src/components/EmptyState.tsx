import { StyleSheet, View } from 'react-native';

import { Button, Icon, Txt, type IconName } from '@/components/ui';
import { colors, radius, size, space } from '@/theme/tokens';

type EmptyStateProps = {
  message: string;
  title?: string;
  icon?: IconName;
  action?: { label: string; onPress: () => void; primary?: boolean };
};

export function EmptyState({ message, title, icon, action }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      {icon ? (
        <View style={styles.tile}>
          <Icon name={icon} size={size.iconXl} color="accent" />
        </View>
      ) : null}
      <View style={styles.text}>
        {title ? (
          <Txt variant="section" style={styles.center}>
            {title}
          </Txt>
        ) : null}
        <Txt variant="body" color="textSecondary" style={styles.center}>
          {message}
        </Txt>
      </View>
      {action ? (
        <Button
          title={action.label}
          variant={action.primary ? 'primary' : 'secondary'}
          onPress={action.onPress}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: space.xxxl, gap: space.xl, alignItems: 'center' },
  tile: {
    width: size.emptyTile,
    height: size.emptyTile,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { gap: space.sm, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch' },
});
