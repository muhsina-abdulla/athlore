// TODO(design): Profile
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { initialsOf } from '@/auth/user';
import { useAuth } from '@/auth/store';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Avatar, Button, Icon, StackScreen, Txt } from '@/components/ui';
import { useSyncCounts } from '@/features/sessions/queries';
import {
  chooseProfilePhoto,
  LOCAL_OWNER,
  removeProfilePhoto,
  useAvatarUri,
  useProfilePhoto,
} from '@/features/profile/photo';
import { colors, radius, size, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const authError = useAuth((s) => s.error);
  const { waiting, failed } = useSyncCounts();
  const avatarUri = useAvatarUri();
  const ownPhoto = useProfilePhoto((s) => s.uri);

  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const owner = user?.id ?? LOCAL_OWNER;
  const signedIn = status === 'signedIn';
  const unsent = waiting + failed;
  const hasOwnPhoto = ownPhoto !== null;

  const pickPhoto = async () => {
    setPhotoError(null);
    const result = await chooseProfilePhoto(owner);
    if (result.ok === false) setPhotoError(result.message);
  };

  const signOutMessage =
    unsent > 0
      ? `${unsent} ${unsent === 1 ? 'session hasn’t' : 'sessions haven’t'} synced yet. ${unsent === 1 ? 'It stays' : 'They stay'} on this phone and will sync when you sign in again.`
      : 'Your sessions stay on this phone. Sign in again to keep them backed up.';

  return (
    <StackScreen
      title="Profile"
      footer={
        signedIn ? (
          <Button title="Sign out" variant="danger" icon="logout" onPress={() => setConfirmingSignOut(true)} />
        ) : null
      }
    >
      <View style={styles.root}>
        <View style={styles.hero}>
          <View>
            <Avatar
              initials={initialsOf(user?.name ?? null, user?.email ?? null)}
              uri={avatarUri}
              dimension={size.avatarLarge}
              onPress={pickPhoto}
              accessibilityLabel="Change profile photo"
            />
            <Pressable
              onPress={pickPhoto}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              hitSlop={(size.touch - size.avatarBadge) / 2}
              style={styles.badge}
            >
              <Icon name="photo-camera" size={size.iconSm} color="text" />
            </Pressable>
          </View>
          <View style={styles.names}>
            <Txt variant="title" style={styles.centered}>
              {user?.name ?? (signedIn ? 'Your profile' : 'Athlore')}
            </Txt>
            {user?.email ? (
              <Txt variant="caption" color="textSecondary" style={styles.centered}>
                {user.email}
              </Txt>
            ) : null}
          </View>
          <View style={styles.photoActions}>
            <Pressable
              onPress={pickPhoto}
              accessibilityRole="button"
              hitSlop={space.sm}
              style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}
            >
              <Txt variant="bodySm" color="textSecondary">
                {hasOwnPhoto ? 'Change photo' : 'Add photo'}
              </Txt>
            </Pressable>
            {hasOwnPhoto ? (
              <Pressable
                onPress={() => removeProfilePhoto(owner)}
                accessibilityRole="button"
                hitSlop={space.sm}
                style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}
              >
                <Txt variant="bodySm" color="textSecondary">
                  Remove
                </Txt>
              </Pressable>
            ) : null}
          </View>
          {photoError ? (
            <Txt variant="caption" color="danger" style={styles.centered}>
              {photoError}
            </Txt>
          ) : null}
        </View>

        {authError ? (
          <Txt variant="caption" color="danger">
            {authError}
          </Txt>
        ) : null}
      </View>

      <ConfirmDialog
        visible={confirmingSignOut}
        title="Sign out?"
        message={signOutMessage}
        confirmLabel="Sign out"
        destructive
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          void signOut();
        }}
      />
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xxl },
  hero: { alignItems: 'center', gap: space.lg },
  names: { alignItems: 'center', gap: space.xs },
  centered: { textAlign: 'center' },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: size.avatarBadge,
    height: size.avatarBadge,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  photoActions: { flexDirection: 'row', gap: space.xl },
  photoAction: { paddingVertical: space.sm },
  pressed: { opacity: 0.8 },
});
