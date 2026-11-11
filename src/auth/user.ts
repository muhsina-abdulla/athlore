// The signed-in person, as the app needs to show them.

export type AppUser = {
  id: string;
  email: string | null;
  name: string | null;
  // The picture on their Google account, if there is one. Shown until they choose their own.
  avatarUrl: string | null;
};

// Two capital letters for the avatar: first and last name when there is a name,
// otherwise taken from the email ("muhsina.abdulla@..." gives MA). Undefined when
// there is nothing to go on, so the avatar falls back to its icon.
export function initialsOf(name: string | null, email: string | null): string | undefined {
  const fromName = (name ?? '').trim();
  const fromEmail = (email ?? '').split('@')[0].replace(/[._+-]+/g, ' ').trim();
  const source = fromName !== '' ? fromName : fromEmail;
  if (source === '') return undefined;

  const words = source.split(/\s+/).filter(Boolean);
  const letters =
    words.length >= 2 ? words[0].charAt(0) + words[words.length - 1].charAt(0) : source.slice(0, 2);
  return letters.toUpperCase();
}
