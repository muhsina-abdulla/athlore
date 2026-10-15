import { randomUUID } from 'expo-crypto';

// Client-generated ids are what make a retried push idempotent.
export function newId(): string {
  return randomUUID();
}
