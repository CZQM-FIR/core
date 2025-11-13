PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_enrolled_users` (
	`id` text PRIMARY KEY NOT NULL,
	`cid` integer NOT NULL,
	`waitlist_id` integer NOT NULL,
	`enrolled_at` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waitlist_id`) REFERENCES `waitlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_enrolled_users`("id", "cid", "waitlist_id", "enrolled_at") SELECT "id", "cid", "waitlist_id", "enrolled_at" FROM `enrolled_users`;--> statement-breakpoint
DROP TABLE `enrolled_users`;--> statement-breakpoint
ALTER TABLE `__new_enrolled_users` RENAME TO `enrolled_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_waiting_users` (
	`id` text PRIMARY KEY NOT NULL,
	`cid` integer NOT NULL,
	`waitlist_id` integer NOT NULL,
	`position` integer NOT NULL,
	`waiting_since` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waitlist_id`) REFERENCES `waitlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_waiting_users`("id", "cid", "waitlist_id", "position", "waiting_since") SELECT "id", "cid", "waitlist_id", "position", "waiting_since" FROM `waiting_users`;--> statement-breakpoint
DROP TABLE `waiting_users`;--> statement-breakpoint
ALTER TABLE `__new_waiting_users` RENAME TO `waiting_users`;--> statement-breakpoint
CREATE INDEX `waiting_users_cid_idx` ON `waiting_users` (`cid`);--> statement-breakpoint
CREATE INDEX `waiting_users_waitlistId_idx` ON `waiting_users` (`waitlist_id`);--> statement-breakpoint
CREATE INDEX `waiting_users_position_idx` ON `waiting_users` (`position`);--> statement-breakpoint
CREATE INDEX `waiting_users_waitingSince_idx` ON `waiting_users` (`waiting_since`);--> statement-breakpoint
CREATE TABLE `__new_waitlists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`wait_time` text,
	`waitlist_cohort` text,
	`enrolled_cohort` text
);
--> statement-breakpoint
INSERT INTO `__new_waitlists`("id", "name", "wait_time", "waitlist_cohort", "enrolled_cohort") SELECT "id", "name", "wait_time", "waitlist_cohort", "enrolled_cohort" FROM `waitlists`;--> statement-breakpoint
DROP TABLE `waitlists`;--> statement-breakpoint
ALTER TABLE `__new_waitlists` RENAME TO `waitlists`;