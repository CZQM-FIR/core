CREATE TABLE `dms_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`documentId` text NOT NULL,
	`version` text NOT NULL,
	`effectiveDate` integer NOT NULL,
	`expiryDate` integer,
	`public` integer DEFAULT false NOT NULL,
	`url` text NOT NULL,
	FOREIGN KEY (`documentId`) REFERENCES `dms_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `dms_assets_document_id_idx` ON `dms_assets` (`documentId`);--> statement-breakpoint
CREATE INDEX `dms_assets_effective_date_idx` ON `dms_assets` (`effectiveDate`);--> statement-breakpoint
CREATE TABLE `dms_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`required` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`groupId` text,
	`short` text,
	FOREIGN KEY (`groupId`) REFERENCES `dms_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `dms_documents_group_id_idx` ON `dms_documents` (`groupId`);--> statement-breakpoint
CREATE TABLE `dms_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`sort` integer DEFAULT 99 NOT NULL
);
