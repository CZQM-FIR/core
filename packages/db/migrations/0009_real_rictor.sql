DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "positions_callsign_unique";--> statement-breakpoint
ALTER TABLE `ticket_messages` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1749510091818;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `positions_callsign_unique` ON `positions` (`callsign`);--> statement-breakpoint
ALTER TABLE `tickets` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1749510091818;--> statement-breakpoint
ALTER TABLE `resources` ALTER COLUMN "public" TO "public" integer NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `solo_endorsements` ALTER COLUMN "expires_at" TO "expires_at" integer NOT NULL DEFAULT '"2025-07-09T23:01:31.777Z"';--> statement-breakpoint
ALTER TABLE `events` ADD `recurring` integer DEFAULT false NOT NULL;