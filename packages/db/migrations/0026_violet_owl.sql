ALTER TABLE `waitlist` RENAME TO `waitlists`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_waiting_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cid` integer NOT NULL,
	`waitlist_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waitlist_id`) REFERENCES `waitlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_waiting_users`("id", "cid", "waitlist_id", "position") SELECT "id", "cid", "waitlist_id", "position" FROM `waiting_users`;--> statement-breakpoint
DROP TABLE `waiting_users`;--> statement-breakpoint
ALTER TABLE `__new_waiting_users` RENAME TO `waiting_users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;