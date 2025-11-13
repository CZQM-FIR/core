ALTER TABLE `enrolled_users` ADD `hidden` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `enrolled_users_cid_idx` ON `enrolled_users` (`cid`);--> statement-breakpoint
CREATE INDEX `enrolled_users_waitlistId_idx` ON `enrolled_users` (`waitlist_id`);--> statement-breakpoint
CREATE INDEX `enrolled_users_enrolledAt_idx` ON `enrolled_users` (`enrolled_at`);--> statement-breakpoint
CREATE INDEX `enrolled_users_hidden_idx` ON `enrolled_users` (`hidden`);