PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_dms_groups` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`sort` integer DEFAULT 99 NOT NULL,
	`slug` text NOT NULL UNIQUE
);
--> statement-breakpoint
INSERT INTO `__new_dms_groups`(`id`, `name`, `sort`, `slug`) SELECT `id`, `name`, `sort`, `slug` FROM `dms_groups`;--> statement-breakpoint
DROP TABLE `dms_groups`;--> statement-breakpoint
ALTER TABLE `__new_dms_groups` RENAME TO `dms_groups`;--> statement-breakpoint
PRAGMA foreign_keys=ON;