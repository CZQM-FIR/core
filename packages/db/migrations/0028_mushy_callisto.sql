CREATE TABLE `moodle_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cid` integer NOT NULL,
	`cohort_id` text NOT NULL,
	`timestamp` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `waiting_users_cid_idx` ON `waiting_users` (`cid`);--> statement-breakpoint
CREATE INDEX `waiting_users_waitlistId_idx` ON `waiting_users` (`waitlist_id`);--> statement-breakpoint
CREATE INDEX `waiting_users_position_idx` ON `waiting_users` (`position`);--> statement-breakpoint
CREATE INDEX `waiting_users_waitingSince_idx` ON `waiting_users` (`waiting_since`);