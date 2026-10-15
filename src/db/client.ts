import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from '@/db/schema';

// enableChangeListener lets useLiveQuery re-render screens when rows change.
const sqlite = openDatabaseSync('athlore.db', { enableChangeListener: true });

// WAL for speed; foreign keys are off by default in SQLite.
sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export type Db = typeof db;
