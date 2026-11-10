// What the sync engine needs from the server. The real implementation talks to
// Supabase; tests use a pretend server. The engine only sees this interface.

export type RemoteRow = Record<string, unknown>;

export type PullTable = 'categories' | 'user_session_types' | 'exercises' | 'sessions';
export type LookupTable = Exclude<PullTable, 'sessions'>;

// A whole session in the shape the server's push_session function takes.
export type SessionPayload = {
  session: RemoteRow;
  session_type_ids: string[];
  exercises: RemoteRow[];
  sets: RemoteRow[];
};

// Why a call failed, so the engine can react properly:
// - network: offline or unreachable. Stop, keep everything queued, try again later.
// - auth: not signed in or the sign-in expired. Stop and ask for a sign-in.
// - server: the server refused this one item. Mark it failed and carry on.
export type RemoteErrorKind = 'network' | 'auth' | 'server';

export class RemoteError extends Error {
  readonly kind: RemoteErrorKind;

  constructor(kind: RemoteErrorKind, message: string) {
    super(message);
    this.name = 'RemoteError';
    this.kind = kind;
  }
}

export interface RemoteApi {
  upsertLookup(table: LookupTable, row: RemoteRow): Promise<void>;

  // Saves a whole session in one all-or-nothing step. Returns when the server
  // first accepted it (submittedAt), which the phone stores.
  pushSession(payload: SessionPayload): Promise<{ submittedAt: string | null }>;

  // Rows changed at or after `since` (ISO time), oldest change first. Null means
  // everything.
  pullRows(table: PullTable, since: string | null, limit: number): Promise<RemoteRow[]>;

  // The children of these sessions, for replacing them locally.
  pullSessionChildren(sessionIds: string[]): Promise<{
    assignments: RemoteRow[];
    exercises: RemoteRow[];
    sets: RemoteRow[];
  }>;
}
