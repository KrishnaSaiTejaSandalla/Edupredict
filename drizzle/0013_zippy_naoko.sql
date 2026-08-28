CREATE TABLE `conversation_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `conversation_id` int;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `media_type` varchar(32);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `media_size` int;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `file_name` varchar(256);--> statement-breakpoint
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `participants_conversation_idx` ON `conversation_participants` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `participants_user_idx` ON `conversation_participants` (`user_id`);--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chat_messages_conversation_idx` ON `chat_messages` (`conversation_id`);