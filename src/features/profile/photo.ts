import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { create } from 'zustand';

import { useAuth } from '@/auth/store';

// The profile photo lives on this phone only: the picked picture is copied into the
// app's own storage and its path is remembered per person, so a different account on
// the same phone never sees someone else's photo. It is not synced.

// Without sign-in (phone-only mode) there is no account id.
export const LOCAL_OWNER = 'local';

const keyFor = (owner: string) => `athlore.profilePhoto.${owner}`;

function readSaved(owner: string): string | null {
  try {
    return localStorage.getItem(keyFor(owner));
  } catch {
    return null;
  }
}

function writeSaved(owner: string, uri: string | null) {
  try {
    if (uri === null) localStorage.removeItem(keyFor(owner));
    else localStorage.setItem(keyFor(owner), uri);
  } catch {
    // The photo still shows this time; it just won't be remembered next launch.
  }
}

function deleteFile(uri: string | null) {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // An old file that can't be removed is harmless.
  }
}

type PhotoStore = {
  owner: string | null;
  uri: string | null;
};

export const useProfilePhoto = create<PhotoStore>(() => ({ owner: null, uri: null }));

// Called when the signed-in person changes (and at startup).
export function loadProfilePhoto(owner: string) {
  const saved = readSaved(owner);
  let uri: string | null = null;
  try {
    uri = saved && new File(saved).exists ? saved : null;
  } catch {
    uri = null;
  }
  useProfilePhoto.setState({ owner, uri });
}

export type PhotoResult = { ok: true } | { ok: false; message: string } | { ok: 'cancelled' };

// Opens the photo library, lets the person crop a square, and keeps the result.
export async function chooseProfilePhoto(owner: string): Promise<PhotoResult> {
  try {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (picked.canceled || !picked.assets?.[0]) return { ok: 'cancelled' };

    // A new file name each time, so the picture refreshes instead of showing the old one.
    const target = new File(Paths.document, `profile-photo-${Date.now()}.jpg`);
    await new File(picked.assets[0].uri).copy(target);

    const previous = useProfilePhoto.getState().uri;
    writeSaved(owner, target.uri);
    useProfilePhoto.setState({ owner, uri: target.uri });
    deleteFile(previous);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not use that picture.' };
  }
}

export function removeProfilePhoto(owner: string) {
  const previous = useProfilePhoto.getState().uri;
  writeSaved(owner, null);
  useProfilePhoto.setState({ owner, uri: null });
  deleteFile(previous);
}

// What the avatar should show: their own photo, else their Google picture, else null
// (the avatar then shows initials).
export function useAvatarUri(): string | null {
  const user = useAuth((s) => s.user);
  const photo = useProfilePhoto((s) => s.uri);
  const owner = useProfilePhoto((s) => s.owner);
  const wanted = user?.id ?? LOCAL_OWNER;
  return (owner === wanted ? photo : null) ?? user?.avatarUrl ?? null;
}
