ALTER TABLE `dms_groups` ADD `slug` text NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_integrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`type` integer NOT NULL,
	`integration_user_id` text NOT NULL,
	`cid` integer NOT NULL,
	`integration_user_name` text,
	`last_synced_at` integer,
	CONSTRAINT `integrations_cid_users_cid_fk` FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON DELETE CASCADE,
	CONSTRAINT `integrations_cid_type_unique` UNIQUE(`cid`,`type`)
);
--> statement-breakpoint
INSERT INTO `__new_integrations`(`id`, `type`, `integration_user_id`, `cid`, `integration_user_name`, `last_synced_at`) SELECT `id`, `type`, `integration_user_id`, `cid`, `integration_user_name`, `last_synced_at` FROM `integrations`;--> statement-breakpoint
DROP TABLE `integrations`;--> statement-breakpoint
ALTER TABLE `__new_integrations` RENAME TO `integrations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`cid` integer NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	CONSTRAINT `preferences_cid_users_cid_fk` FOREIGN KEY (`cid`) REFERENCES `users`(`cid`) ON DELETE CASCADE,
	CONSTRAINT `preferences_cid_key_unique` UNIQUE(`cid`,`key`)
);
--> statement-breakpoint
INSERT INTO `__new_preferences`(`id`, `cid`, `key`, `value`) SELECT `id`, `cid`, `key`, `value` FROM `preferences`;--> statement-breakpoint
DROP TABLE `preferences`;--> statement-breakpoint
ALTER TABLE `__new_preferences` RENAME TO `preferences`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`cid` integer PRIMARY KEY,
	`name_first` text NOT NULL,
	`name_last` text NOT NULL,
	`name_full` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`ratingID` integer NOT NULL,
	`division` text,
	`region` text,
	`subdivision` text,
	`bio` text,
	`discord_id` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`hoursLastUpdated` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `users_ratingID_ratings_id_fk` FOREIGN KEY (`ratingID`) REFERENCES `ratings`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_users`(`cid`, `name_first`, `name_last`, `name_full`, `email`, `ratingID`, `division`, `region`, `subdivision`, `bio`, `discord_id`, `active`, `hoursLastUpdated`) SELECT `cid`, `name_first`, `name_last`, `name_full`, `email`, `ratingID`, `division`, `region`, `subdivision`, `bio`, `discord_id`, `active`, `hoursLastUpdated` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`callsign` text NOT NULL UNIQUE,
	`frequency` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_positions`(`id`, `callsign`, `frequency`, `name`) SELECT `id`, `callsign`, `frequency`, `name` FROM `positions`;--> statement-breakpoint
DROP TABLE `positions`;--> statement-breakpoint
ALTER TABLE `__new_positions` RENAME TO `positions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `users_email_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `positions_callsign_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `integrations_cid_type_unique`;--> statement-breakpoint
DROP INDEX IF EXISTS `preferences_cid_key_unique`;--> statement-breakpoint
CREATE INDEX `integrations_cid_idx` ON `integrations` (`cid`);--> statement-breakpoint
CREATE INDEX `integrations_type_idx` ON `integrations` (`type`);--> statement-breakpoint
CREATE INDEX `integrations_integrationUserId_idx` ON `integrations` (`integration_user_id`);--> statement-breakpoint
CREATE INDEX `preferences_cid_idx` ON `preferences` (`cid`);--> statement-breakpoint
CREATE INDEX `preferences_key_idx` ON `preferences` (`key`);--> statement-breakpoint
CREATE INDEX `users_ratingID_idx` ON `users` (`ratingID`);--> statement-breakpoint
CREATE INDEX `users_discord_id_idx` ON `users` (`discord_id`);--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`active`);--> statement-breakpoint
CREATE INDEX `positions_frequency_idx` ON `positions` (`frequency`);--> statement-breakpoint
CREATE INDEX `positions_name_idx` ON `positions` (`name`);