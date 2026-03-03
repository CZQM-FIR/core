CREATE TABLE `jobs` (
	`id` text PRIMARY KEY,
	`type` text NOT NULL,
	`scheduledTime` integer NOT NULL,
	`executedTime` integer NOT NULL
);
