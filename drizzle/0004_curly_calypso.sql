CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`user_id` int NOT NULL,
	`action` varchar(128) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` int NOT NULL,
	`details` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`category` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`user_id` int NOT NULL,
	`student_id` int,
	`leave_type` varchar(64) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`reason` text NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`remarks` text,
	`actioned_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `timetables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`class_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`teacher_id` int NOT NULL,
	`day_of_week` varchar(20) NOT NULL,
	`start_time` varchar(10) NOT NULL,
	`end_time` varchar(10) NOT NULL,
	`room_number` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `timetables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_actioned_by_users_id_fk` FOREIGN KEY (`actioned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timetables` ADD CONSTRAINT `timetables_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timetables` ADD CONSTRAINT `timetables_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timetables` ADD CONSTRAINT `timetables_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `timetables` ADD CONSTRAINT `timetables_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_school_id_idx` ON `audit_logs` (`school_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `feedback_school_id_idx` ON `feedback` (`school_id`);--> statement-breakpoint
CREATE INDEX `feedback_user_id_idx` ON `feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `leave_requests_school_id_idx` ON `leave_requests` (`school_id`);--> statement-breakpoint
CREATE INDEX `leave_requests_user_id_idx` ON `leave_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `leave_requests_status_idx` ON `leave_requests` (`status`);--> statement-breakpoint
CREATE INDEX `timetables_school_id_idx` ON `timetables` (`school_id`);--> statement-breakpoint
CREATE INDEX `timetables_class_id_idx` ON `timetables` (`class_id`);--> statement-breakpoint
CREATE INDEX `timetables_teacher_id_idx` ON `timetables` (`teacher_id`);