DROP INDEX IF EXISTS "flags_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ratings_long_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ratings_short_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "user_flags_flagId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "user_flags_userId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "users_email_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "users_ratingID_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "users_discord_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "users_active_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "events_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "events_start_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "events_end_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "news_authorID_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "news_date_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "news_title_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "positions_callsign_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "positions_frequency_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "positions_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sessions_userId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sessions_positionId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sessions_logonTime_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "auth_sessions_userId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "auth_sessions_expiresAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ticket_messages_ticketId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ticket_messages_authorId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ticket_messages_createdAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "ticket_types_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tickets_authorId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tickets_typeId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tickets_status_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "tickets_createdAt_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "resources_name_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "resources_category_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "resources_public_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "resources_type_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "controller_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "roster_controllerId_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "roster_position_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "roster_status_idx";--> statement-breakpoint
ALTER TABLE `ticket_messages` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1750215492811;--> statement-breakpoint
CREATE INDEX `flags_name_idx` ON `flags` (`name`);--> statement-breakpoint
CREATE INDEX `ratings_long_idx` ON `ratings` (`long`);--> statement-breakpoint
CREATE INDEX `ratings_short_idx` ON `ratings` (`short`);--> statement-breakpoint
CREATE INDEX `user_flags_flagId_idx` ON `user_flags` (`flag_id`);--> statement-breakpoint
CREATE INDEX `user_flags_userId_idx` ON `user_flags` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_ratingID_idx` ON `users` (`ratingID`);--> statement-breakpoint
CREATE INDEX `users_discord_id_idx` ON `users` (`discord_id`);--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`active`);--> statement-breakpoint
CREATE INDEX `events_name_idx` ON `events` (`name`);--> statement-breakpoint
CREATE INDEX `events_start_idx` ON `events` (`start`);--> statement-breakpoint
CREATE INDEX `events_end_idx` ON `events` (`end`);--> statement-breakpoint
CREATE INDEX `news_authorID_idx` ON `news` (`author_id`);--> statement-breakpoint
CREATE INDEX `news_date_idx` ON `news` (`date`);--> statement-breakpoint
CREATE INDEX `news_title_idx` ON `news` (`title`);--> statement-breakpoint
CREATE UNIQUE INDEX `positions_callsign_unique` ON `positions` (`callsign`);--> statement-breakpoint
CREATE INDEX `positions_frequency_idx` ON `positions` (`frequency`);--> statement-breakpoint
CREATE INDEX `positions_name_idx` ON `positions` (`name`);--> statement-breakpoint
CREATE INDEX `sessions_userId_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_positionId_idx` ON `sessions` (`positionId`);--> statement-breakpoint
CREATE INDEX `sessions_logonTime_idx` ON `sessions` (`logonTime`);--> statement-breakpoint
CREATE INDEX `auth_sessions_userId_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiresAt_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `ticket_messages_ticketId_idx` ON `ticket_messages` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `ticket_messages_authorId_idx` ON `ticket_messages` (`author_id`);--> statement-breakpoint
CREATE INDEX `ticket_messages_createdAt_idx` ON `ticket_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `ticket_types_name_idx` ON `ticket_types` (`name`);--> statement-breakpoint
CREATE INDEX `tickets_authorId_idx` ON `tickets` (`author_id`);--> statement-breakpoint
CREATE INDEX `tickets_typeId_idx` ON `tickets` (`type_id`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_createdAt_idx` ON `tickets` (`created_at`);--> statement-breakpoint
CREATE INDEX `resources_name_idx` ON `resources` (`name`);--> statement-breakpoint
CREATE INDEX `resources_category_idx` ON `resources` (`category`);--> statement-breakpoint
CREATE INDEX `resources_public_idx` ON `resources` (`public`);--> statement-breakpoint
CREATE INDEX `resources_type_idx` ON `resources` (`type`);--> statement-breakpoint
CREATE INDEX `controller_id_idx` ON `solo_endorsements` (`controller_id`);--> statement-breakpoint
CREATE INDEX `roster_controllerId_idx` ON `roster` (`controller_id`);--> statement-breakpoint
CREATE INDEX `roster_position_idx` ON `roster` (`position`);--> statement-breakpoint
CREATE INDEX `roster_status_idx` ON `roster` (`status`);--> statement-breakpoint
ALTER TABLE `tickets` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT 1750215492811;--> statement-breakpoint
ALTER TABLE `solo_endorsements` ALTER COLUMN "expires_at" TO "expires_at" integer NOT NULL DEFAULT '"2025-07-18T02:58:12.760Z"';