CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sender_id` int NOT NULL,
	`receiver_id` int NOT NULL,
	`message` text NOT NULL,
	`attachment_url` varchar(512),
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sender_id_users_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_receiver_id_users_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `chat_messages_sender_idx` ON `chat_messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `chat_messages_receiver_idx` ON `chat_messages` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `chat_messages_is_read_idx` ON `chat_messages` (`is_read`);