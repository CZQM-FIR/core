CREATE TABLE `waiting_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cid` integer NOT NULL,
	`waitlist_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`waitlist_id`) REFERENCES `waitlist`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
