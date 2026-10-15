-- Renames, keeping every row. SQLite rewrites foreign keys that point at a renamed
-- table, so sessions keep their types.
ALTER TABLE `session_types` RENAME TO `user_session_types`;--> statement-breakpoint
DROP INDEX `session_types_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `user_session_types_name_unique` ON `user_session_types` (lower("name"));--> statement-breakpoint
ALTER TABLE `session_session_types` RENAME TO `session_type_assignments`;
