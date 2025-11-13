CREATE TABLE `enrolled_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cid` integer NOT NULL,
	`waitlist_id` integer NOT NULL,
	`enrolled_at` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL,
	`hidden_at` integer,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waitlist_id`) REFERENCES `waitlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `enrolled_users_cid_idx` ON `enrolled_users` (`cid`);--> statement-breakpoint
CREATE INDEX `enrolled_users_waitlistId_idx` ON `enrolled_users` (`waitlist_id`);--> statement-breakpoint
CREATE INDEX `enrolled_users_enrolledAt_idx` ON `enrolled_users` (`enrolled_at`);--> statement-breakpoint
CREATE INDEX `enrolled_users_hidden_at_idx` ON `enrolled_users` (`hidden_at`);--> statement-breakpoint
CREATE TABLE `waiting_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cid` integer NOT NULL,
	`waitlist_id` integer NOT NULL,
	`position` integer NOT NULL,
	`waiting_since` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waitlist_id`) REFERENCES `waitlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `waiting_users_cid_idx` ON `waiting_users` (`cid`);--> statement-breakpoint
CREATE INDEX `waiting_users_waitlistId_idx` ON `waiting_users` (`waitlist_id`);--> statement-breakpoint
CREATE INDEX `waiting_users_position_idx` ON `waiting_users` (`position`);--> statement-breakpoint
CREATE INDEX `waiting_users_waitingSince_idx` ON `waiting_users` (`waiting_since`);--> statement-breakpoint
CREATE TABLE `waitlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`wait_time` text,
	`waitlist_cohort` text,
	`enrolled_cohort` text
);
--> statement-breakpoint
CREATE TABLE `moodle_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cid` integer NOT NULL,
	`cohort_id` text NOT NULL,
	`timestamp` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL,
	`add` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade
);
