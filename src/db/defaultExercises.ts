// The master exercise list. Fixed ids, so every device and the server seed share
// the same rows. The athlete adds their own on top (custom exercises).
//
// Edit names freely before they are used in sessions; once sessions reference an
// id, keep the id.

import type { SetKind } from '@/db/schema';

export const MUSCLE_GROUPS = ['Legs', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Core', 'Full body'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const DEFAULT_EXERCISES: readonly {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  defaultKind: SetKind;
}[] = [
  { id: 'c343137e-db95-41da-a0e3-03e2a9e4312f', name: 'Squat (weighted)', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: 'f47f83b0-a6f9-4766-9fd9-ee74deaea38f', name: 'Free squat', muscleGroup: 'Legs', defaultKind: 'bodyweight' },
  { id: 'ea7d399b-c770-4ec9-aa91-e3a78873aee7', name: 'Bulgarian split squat', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: '0765c964-87d9-48bd-a3e8-252b14795ed7', name: 'Split squat', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: 'd20c7180-0e5f-4acb-8558-0c37171dd444', name: 'Lunge', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: '567b4f62-3e59-424c-b102-e52c07fbcf53', name: 'Leg press', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: '21c9fb94-bcad-4484-9aa0-4fda5b7b9f7e', name: 'Leg extension', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: 'c0588baf-e1a2-4f61-a57e-5258fb56a99f', name: 'Leg curl', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: '14542d76-51e6-4670-b5e0-b45e9c07ced3', name: 'Romanian deadlift', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: '1e116fcb-518d-415f-8538-487fb997f656', name: 'Hip thrust', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: '5e6fd2b5-1a62-4963-a0ad-39f381ef796d', name: 'Calf raise', muscleGroup: 'Legs', defaultKind: 'reps_weight' },
  { id: '7ef36801-26be-48d3-907e-f5ef9217a66e', name: 'Chest press', muscleGroup: 'Chest', defaultKind: 'reps_weight' },
  { id: 'c257a5f0-bd7e-4d59-a7bb-ba3a40d58b59', name: 'Incline chest press', muscleGroup: 'Chest', defaultKind: 'reps_weight' },
  { id: '00ba5039-5d22-431f-a8a2-bc7e57f29ec7', name: 'Decline chest press', muscleGroup: 'Chest', defaultKind: 'reps_weight' },
  { id: '0749f71b-f3c9-45e7-adf3-334f3707345f', name: 'Chest fly', muscleGroup: 'Chest', defaultKind: 'reps_weight' },
  { id: 'ab49ef3b-31a9-4e66-ace6-10fac08693f8', name: 'Push-up', muscleGroup: 'Chest', defaultKind: 'bodyweight' },
  { id: '9c9602d7-6757-4cbe-9068-d74e4db1cfb7', name: 'Bent-over row', muscleGroup: 'Back', defaultKind: 'reps_weight' },
  { id: 'd7036235-d22e-4e07-9452-293500950241', name: 'Pull-up', muscleGroup: 'Back', defaultKind: 'bodyweight' },
  { id: 'c4e05784-7a51-43f3-ad76-dcf69a13b179', name: 'Lat pulldown', muscleGroup: 'Back', defaultKind: 'reps_weight' },
  { id: '03c8def8-ce10-4461-ac18-55db64533d9b', name: 'Seated row', muscleGroup: 'Back', defaultKind: 'reps_weight' },
  { id: 'd8f57631-0e16-49fa-ab58-74065b828f3e', name: 'Deadlift', muscleGroup: 'Back', defaultKind: 'reps_weight' },
  { id: '5d63e17e-4512-47d9-9f75-ad3bfb66024c', name: 'Shoulder press', muscleGroup: 'Shoulders', defaultKind: 'reps_weight' },
  { id: 'a5b1e44a-eab7-44b5-ba3f-60739223295f', name: 'Lateral raise', muscleGroup: 'Shoulders', defaultKind: 'reps_weight' },
  { id: '0a8b6486-d64f-4293-a12a-b8f454817d3e', name: 'Front raise', muscleGroup: 'Shoulders', defaultKind: 'reps_weight' },
  { id: 'fa0b19d7-938a-44fd-941f-2c4a2d095b8c', name: 'Rear delt fly', muscleGroup: 'Shoulders', defaultKind: 'reps_weight' },
  { id: 'aa57731e-b5b2-4a31-9e44-500b19a5de54', name: 'Face pull', muscleGroup: 'Shoulders', defaultKind: 'reps_weight' },
  { id: '8afcbb6c-8efb-43fb-ac4b-6989d0268315', name: 'Shrug', muscleGroup: 'Shoulders', defaultKind: 'reps_weight' },
  { id: '77f14d69-791b-41b1-94d9-7470e1574cb3', name: 'Bicep curl', muscleGroup: 'Biceps', defaultKind: 'reps_weight' },
  { id: 'dd33cdb3-3ddd-4757-a693-3e1440fa43c9', name: 'Hammer curl', muscleGroup: 'Biceps', defaultKind: 'reps_weight' },
  { id: 'c6e2d574-4cb1-4bcd-b511-ebf126a10ad4', name: 'Preacher curl', muscleGroup: 'Biceps', defaultKind: 'reps_weight' },
  { id: 'be2253fc-9d9f-4481-985b-e87a7c92255f', name: 'Dips', muscleGroup: 'Triceps', defaultKind: 'bodyweight' },
  { id: 'e0646cc9-f183-4c2f-87e4-36a217cae6b1', name: 'Behind-the-back triceps extension', muscleGroup: 'Triceps', defaultKind: 'reps_weight' },
  { id: '04d3f113-9c6a-428b-97be-81781ce455e3', name: 'Triceps pushdown', muscleGroup: 'Triceps', defaultKind: 'reps_weight' },
  { id: 'dc989b0a-32b8-4384-9c30-cd7b4643d8b4', name: 'Overhead triceps extension', muscleGroup: 'Triceps', defaultKind: 'reps_weight' },
  { id: 'aa4f5cda-0297-4250-ba5b-7e6c99a3228e', name: 'Plank', muscleGroup: 'Core', defaultKind: 'time' },
  { id: '60608712-1c6c-45aa-b895-2c932f7c7436', name: 'Crunch', muscleGroup: 'Core', defaultKind: 'bodyweight' },
  { id: 'b2546831-1237-492f-abfe-cb7a4623cc10', name: 'Hanging leg raise', muscleGroup: 'Core', defaultKind: 'bodyweight' },
  { id: 'ec7ec4db-8fce-4917-a937-8a6c011a1a11', name: 'Russian twist', muscleGroup: 'Core', defaultKind: 'bodyweight' },
  { id: '261109c8-080b-4354-8aca-2a1d2d539751', name: 'Ab wheel rollout', muscleGroup: 'Core', defaultKind: 'bodyweight' },
  { id: 'e0eda3ba-82a0-4664-910e-7a8e8664c1a3', name: 'Burpee', muscleGroup: 'Full body', defaultKind: 'bodyweight' },
  { id: 'e4bc3479-60ea-4eaf-8235-db1e50152b1c', name: 'Kettlebell swing', muscleGroup: 'Full body', defaultKind: 'reps_weight' },
  { id: 'a2956742-e796-4966-a843-858571e85417', name: 'Farmer’s carry', muscleGroup: 'Full body', defaultKind: 'distance' },
  { id: '5b342479-390a-4811-a711-a5a47335ac64', name: 'Sled push', muscleGroup: 'Full body', defaultKind: 'distance' },
  { id: 'b70f4eac-1b86-4eff-ac3d-be66d0c62702', name: 'Battle ropes', muscleGroup: 'Full body', defaultKind: 'time' },
];
