DROP INDEX `preferences_cid_key_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `preferences_cid_key_unique` ON `preferences` (`cid`,`key`);