ALTER TABLE `feedback` ADD `priority` varchar(32) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `feedback` ADD `attachment_url` text;--> statement-breakpoint
ALTER TABLE `feedback` ADD `status` varchar(32) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `feedback` ADD `replies` text;