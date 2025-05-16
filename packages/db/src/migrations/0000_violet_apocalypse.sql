CREATE TABLE `flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ratings` (
	`id` integer PRIMARY KEY NOT NULL,
	`long` text NOT NULL,
	`short` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_flags` (
	`flag_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `flag_id`),
	FOREIGN KEY (`flag_id`) REFERENCES `flags`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`cid` integer PRIMARY KEY NOT NULL,
	`name_first` text NOT NULL,
	`name_last` text NOT NULL,
	`name_full` text NOT NULL,
	`email` text NOT NULL,
	`rating` integer NOT NULL,
	`division` text,
	`region` text,
	`subdivision` text,
	`bio` text,
	FOREIGN KEY (`rating`) REFERENCES `ratings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`image` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `news` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`date` integer NOT NULL,
	`author_id` integer,
	`image` text,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`callsign` text NOT NULL,
	`frequency` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `positions_callsign_unique` ON `positions` (`callsign`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`positionId` integer NOT NULL,
	`duration` integer NOT NULL,
	`logonTime` integer DEFAULT '"1970-01-01T00:00:00.000Z"' NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ticket_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` integer NOT NULL,
	`author_id` integer NOT NULL,
	`message` text NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ticket_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`author_id` integer NOT NULL,
	`type_id` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`cid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`type_id`) REFERENCES `ticket_types`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`category` text NOT NULL,
	`public` integer DEFAULT 1 NOT NULL,
	`type` text NOT NULL
);
