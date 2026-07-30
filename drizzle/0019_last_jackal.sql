CREATE TABLE `help_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` varchar(64) NOT NULL,
	`driver_id` int NOT NULL,
	`driver_name` varchar(128) NOT NULL,
	`driver_phone` varchar(32),
	`category` varchar(64) NOT NULL,
	`priority` varchar(32) NOT NULL DEFAULT 'medium',
	`message` text NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'OPEN',
	`replies` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `help_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `buses` ADD `nickname` varchar(128);--> statement-breakpoint
CREATE INDEX `help_tickets_driver_id_idx` ON `help_tickets` (`driver_id`);--> statement-breakpoint
CREATE INDEX `help_tickets_ticket_id_idx` ON `help_tickets` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `help_tickets_status_idx` ON `help_tickets` (`status`);