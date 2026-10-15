ALTER TABLE `exercises` ADD `muscle_group` text;--> statement-breakpoint
ALTER TABLE `exercises` ADD `default_kind` text DEFAULT 'reps_weight' NOT NULL;