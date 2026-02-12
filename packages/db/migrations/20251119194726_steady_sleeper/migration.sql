CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`timestamp` integer NOT NULL,
	`userId` integer NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_timestamp_idx` ON `notifications` (`timestamp`);--> statement-breakpoint
CREATE INDEX `notifications_user_timestamp_idx` ON `notifications` (`userId`,`timestamp`);