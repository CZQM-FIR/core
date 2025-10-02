PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_online_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`positionId` integer NOT NULL,
	`start` integer DEFAULT '"1970-01-01T00:00:00.000Z"'
);
--> statement-breakpoint
INSERT INTO `__new_online_sessions`("id", "userId", "positionId", "start") SELECT "id", "userId", "positionId", "start" FROM `online_sessions`;--> statement-breakpoint
DROP TABLE `online_sessions`;--> statement-breakpoint
ALTER TABLE `__new_online_sessions` RENAME TO `online_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `users` ADD `hoursLastUpdated` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `ratingId` integer REFERENCES ratings(id);--> statement-breakpoint
ALTER TABLE `sessions` ADD `aircraftTracked` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `aircraftSeen` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `flightsAmended` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `handoffsInitiated` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `handoffsReceived` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `handoffsRefused` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `squawksAssigned` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `cruiseAltsModified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `tempAltsModified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `scratchpadMods` integer DEFAULT 0 NOT NULL;