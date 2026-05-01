CREATE TABLE `dms_acknowledgements` (
	`id` text PRIMARY KEY,
	`assetId` text NOT NULL,
	`userId` text NOT NULL,
	`acknowledgedAt` integer NOT NULL,
	CONSTRAINT `fk_dms_acknowledgements_assetId_dms_assets_id_fk` FOREIGN KEY (`assetId`) REFERENCES `dms_assets`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_dms_acknowledgements_userId_users_cid_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`cid`) ON DELETE CASCADE
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_dms_documents` (
	`id` text PRIMARY KEY,
	`required` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`groupId` text,
	`short` text NOT NULL,
	`sort` integer DEFAULT 99 NOT NULL,
	CONSTRAINT `fk_dms_documents_groupId_dms_groups_id_fk` FOREIGN KEY (`groupId`) REFERENCES `dms_groups`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_dms_documents`(`id`, `required`, `name`, `description`, `groupId`, `short`, `sort`) SELECT `id`, `required`, `name`, `description`, `groupId`, `short`, `sort` FROM `dms_documents`;--> statement-breakpoint
DROP TABLE `dms_documents`;--> statement-breakpoint
ALTER TABLE `__new_dms_documents` RENAME TO `dms_documents`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `dms_documents_group_id_idx` ON `dms_documents` (`groupId`);--> statement-breakpoint
CREATE INDEX `dms_acknowledgements_asset_id_idx` ON `dms_acknowledgements` (`assetId`);--> statement-breakpoint
CREATE INDEX `dms_acknowledgements_user_id_idx` ON `dms_acknowledgements` (`userId`);