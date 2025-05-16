CREATE TABLE `solo_endorsements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`controller_id` integer NOT NULL,
	`expires_at` integer DEFAULT 1744840846758 NOT NULL,
	`position_id` integer NOT NULL,
	FOREIGN KEY (`controller_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roster` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`controller_id` integer NOT NULL,
	`position` text NOT NULL,
	`status` integer NOT NULL,
	FOREIGN KEY (`controller_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "positions_callsign_unique";--> statement-breakpoint
ALTER TABLE `ticket_messages` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1742248846854;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `positions_callsign_unique` ON `positions` (`callsign`);--> statement-breakpoint
ALTER TABLE `tickets` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1742248846854;