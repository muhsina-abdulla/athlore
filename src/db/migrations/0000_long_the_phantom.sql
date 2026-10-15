CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (lower("name"));--> statement-breakpoint
CREATE TABLE `drafts` (
	`session_id` text PRIMARY KEY NOT NULL,
	`is_edit` integer DEFAULT false NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`is_top` integer DEFAULT false NOT NULL,
	`reps` integer,
	`weight` real,
	`weight_unit` text,
	`added_load` real,
	`duration_seconds` integer,
	`distance_m` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `session_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercise_sets_session_exercise_idx` ON `exercise_sets` (`session_exercise_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercises_name_unique` ON `exercises` (lower("name"));--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `outbox_entity_unique` ON `outbox` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `session_exercises_session_idx` ON `session_exercises` (`session_id`);--> statement-breakpoint
CREATE TABLE `session_session_types` (
	`session_id` text NOT NULL,
	`session_type_id` text NOT NULL,
	PRIMARY KEY(`session_id`, `session_type_id`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_type_id`) REFERENCES `session_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_types_name_unique` ON `session_types` (lower("name"));--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`training_date` text NOT NULL,
	`category_id` text,
	`training_focus` text,
	`duration_minutes` integer,
	`duration_raw` text,
	`techniques` text,
	`self_assessment` text,
	`coach_feedback` text,
	`injury_notes` text,
	`proud_of` text,
	`to_improve` text,
	`rating` integer,
	`mood_scale` integer,
	`mood_text` text,
	`source` text DEFAULT 'app' NOT NULL,
	`submitted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sessions_category_required" CHECK("sessions"."source" = 'legacy' OR "sessions"."category_id" IS NOT NULL),
	CONSTRAINT "sessions_rating_range" CHECK("sessions"."rating" IS NULL OR ("sessions"."rating" BETWEEN 1 AND 10)),
	CONSTRAINT "sessions_mood_range" CHECK("sessions"."mood_scale" IS NULL OR ("sessions"."mood_scale" BETWEEN 1 AND 5))
);
--> statement-breakpoint
CREATE INDEX `sessions_training_date_idx` ON `sessions` (`training_date`);--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
