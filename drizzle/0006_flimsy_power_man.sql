CREATE TABLE `audit_logs_archive` (
	`id` int AUTO_INCREMENT NOT NULL,
	`original_id` int NOT NULL,
	`school_id` int NOT NULL,
	`user_id` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` int NOT NULL,
	`details` text NOT NULL,
	`priority` varchar(20),
	`module` varchar(64),
	`user_role` varchar(32),
	`created_at` timestamp NOT NULL,
	`archived_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_archive_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `priority` varchar(20);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `module` varchar(64);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `user_role` varchar(32);--> statement-breakpoint
ALTER TABLE `exams` ADD `is_archived` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `exams` ADD `type` varchar(64);--> statement-breakpoint
ALTER TABLE `teachers` ADD `performance_rating` int;--> statement-breakpoint
CREATE INDEX `audit_archive_school_id_idx` ON `audit_logs_archive` (`school_id`);--> statement-breakpoint
CREATE INDEX `audit_archive_created_at_idx` ON `audit_logs_archive` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_archive_original_id_idx` ON `audit_logs_archive` (`original_id`);--> statement-breakpoint
CREATE INDEX `audit_archive_priority_idx` ON `audit_logs_archive` (`priority`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_priority_idx` ON `audit_logs` (`priority`);--> statement-breakpoint
CREATE INDEX `audit_logs_module_idx` ON `audit_logs` (`module`);