// After Google sign-in the browser comes back to the app at a web address that
// carries the result. Depending on how Supabase is set up it arrives as a one-time
// code in the query (?code=...), as tokens after the # (#access_token=...), or as
// an error. This reads all three without relying on a URL parser, because app
// addresses like exp://... and athlore://... are parsed differently by platform.

export type AuthRedirect = {
  code: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
};

export function parseAuthRedirect(url: string): AuthRedirect {
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const fragment = hashAt === -1 ? '' : url.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);

  const fromQuery = new URLSearchParams(query);
  const fromFragment = new URLSearchParams(fragment);
  const get = (key: string): string | null => fromQuery.get(key) ?? fromFragment.get(key);

  return {
    code: get('code'),
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    error: get('error_description') ?? get('error'),
  };
}
