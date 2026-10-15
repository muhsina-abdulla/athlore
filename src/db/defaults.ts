// Default categories and session types. They use fixed ids so every device (and
// the server) shares the same rows. Otherwise each install would create its own
// "Boxing" and sync would duplicate them. Custom ones are added in the app.
//
// Shown in this order, followed by any custom entries.

export const DEFAULT_CATEGORIES = [
  { id: '86f338a0-ee73-4138-a9f6-e4dffc716a88', name: 'Grappling' },
  { id: 'f76b41ec-59b7-4c79-a6fe-37a14724f212', name: 'Kickboxing' },
  { id: '1e3afa87-bf0f-47f7-98ac-dafdd28c37b4', name: 'Boxing' },
  // Was "Strength". Same id, renamed in place.
  { id: 'e26b8f26-769e-4bfd-9c8c-e6e1043945c1', name: 'Weight Training' },
] as const;

export const DEFAULT_SESSION_TYPES = [
  // Was "Technique". Same id, renamed in place.
  { id: 'c4010b5f-bc90-4105-98c3-3cd7513e3ec5', name: 'Technique Drill' },
  { id: 'df48c63d-e199-4d6d-ac10-2e6e95ce7a38', name: 'Sparring' },
  { id: '42db6733-d23e-43b5-a541-d210750bd20a', name: 'Rolling' },
  { id: '7a86a184-412b-4d52-be13-c29c507d184d', name: 'Cardio/Games' },
  // Was "Competition prep". Same id, renamed in place.
  { id: '18a9cf26-1b32-4405-a0bf-f1a9fabbe216', name: 'Competition Prep' },
] as const;

// Defaults from earlier versions that are no longer offered. Each is hidden only
// if no session uses it, so history never loses a label.
export const RETIRED_CATEGORY_IDS = [
  'abef534a-a95b-42eb-b518-e4a69936b6f8', // MMA
  'de6b6216-0ea8-4fc5-93f2-bf222adb3ed5', // Striking
] as const;

export const RETIRED_SESSION_TYPE_IDS = [
  '907afa5a-59bf-498f-bd6d-8dbdb9aa3780', // Drilling
  'aaf8336d-8ed7-444e-9095-6a3a4b0c9551', // Conditioning
  '98aab049-7f0e-4a31-bb7c-bbac536361a7', // Pad work
] as const;
