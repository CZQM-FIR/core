DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "positions_callsign_unique";--> statement-breakpoint
ALTER TABLE `ticket_messages` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1749931918851;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `positions_callsign_unique` ON `positions` (`callsign`);--> statement-breakpoint
ALTER TABLE `tickets` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1749931918851;--> statement-breakpoint
ALTER TABLE `solo_endorsements` ALTER COLUMN "expires_at" TO "expires_at" integer NOT NULL DEFAULT '"2025-07-14T20:11:58.790Z"';--> statement-breakpoint
ALTER TABLE `users` ADD `active` integer DEFAULT 1 NOT NULL;