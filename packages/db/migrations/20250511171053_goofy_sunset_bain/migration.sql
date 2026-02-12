PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_auth_sessions`("id", "user_id", "expires_at") SELECT "id", "user_id", "expires_at" FROM `auth_sessions`;--> statement-breakpoint
DROP TABLE `auth_sessions`;--> statement-breakpoint
ALTER TABLE `__new_auth_sessions` RENAME TO `auth_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "positions_callsign_unique";--> statement-breakpoint
ALTER TABLE `ticket_messages` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1746983453249;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `positions_callsign_unique` ON `positions` (`callsign`);--> statement-breakpoint
ALTER TABLE `tickets` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1746983453249;--> statement-breakpoint
ALTER TABLE `solo_endorsements` ALTER COLUMN "expires_at" TO "expires_at" integer NOT NULL DEFAULT '"2025-06-10T17:10:53.151Z"';