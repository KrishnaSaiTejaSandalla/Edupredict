CREATE TABLE `ai_generations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`prompt` text,
	`status` varchar(32) NOT NULL DEFAULT 'completed',
	`result_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_generations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_avatars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`image_url` varchar(512) NOT NULL,
	`style` varchar(64) NOT NULL,
	`is_selected` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_avatars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`theme` varchar(32) NOT NULL DEFAULT 'dark',
	`density` varchar(32) NOT NULL DEFAULT 'comfortable',
	`sidebar_collapsed` boolean NOT NULL DEFAULT false,
	`language` varchar(16) NOT NULL DEFAULT 'en',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `schools` ADD `motto` varchar(256);--> statement-breakpoint
ALTER TABLE `schools` ADD `website` varchar(256);--> statement-breakpoint
ALTER TABLE `schools` ADD `registration_number` varchar(128);--> statement-breakpoint
ALTER TABLE `schools` ADD `affiliation_board` varchar(128);--> statement-breakpoint
ALTER TABLE `schools` ADD `udise_code` varchar(64);--> statement-breakpoint
ALTER TABLE `schools` ADD `logo_url` varchar(512);--> statement-breakpoint
ALTER TABLE `schools` ADD `primary_color` varchar(16) DEFAULT '#06b6d4';--> statement-breakpoint
ALTER TABLE `schools` ADD `accent_color` varchar(16) DEFAULT '#a78bfa';--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `profile_image_url` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `designation` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `phone_number` varchar(20);--> statement-breakpoint
ALTER TABLE `ai_generations` ADD CONSTRAINT `ai_generations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_avatars` ADD CONSTRAINT `user_avatars_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_preferences` ADD CONSTRAINT `user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_generations_user_id_index` ON `ai_generations` (`user_id`);--> statement-breakpoint
CREATE INDEX `ai_generations_type_index` ON `ai_generations` (`type`);--> statement-breakpoint
CREATE INDEX `ai_generations_status_index` ON `ai_generations` (`status`);--> statement-breakpoint
CREATE INDEX `user_avatars_user_id_index` ON `user_avatars` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_preferences_user_id_index` ON `user_preferences` (`user_id`);