DROP INDEX `enrolled_users_hidden_idx`;--> statement-breakpoint
ALTER TABLE `enrolled_users` ADD `hidden_at` integer;--> statement-breakpoint
CREATE INDEX `enrolled_users_hidden_at_idx` ON `enrolled_users` (`hidden_at`);--> statement-breakpoint
ALTER TABLE `enrolled_users` DROP COLUMN `hidden`;