CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` varchar(128) NOT NULL,
	`provider_account_id` varchar(256) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`teacher_id` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`due_date` date NOT NULL,
	`max_marks` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`class_id` int NOT NULL,
	`attendance_date` date NOT NULL,
	`status` varchar(20) NOT NULL,
	`remarks` text,
	`marked_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bus_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bus_id` int NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`speed` int,
	`heading` int,
	`accuracy` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bus_locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `buses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`registration_number` varchar(64) NOT NULL,
	`route_name` varchar(128),
	`driver_name` varchar(128),
	`driver_phone` varchar(20),
	`capacity` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buses_id` PRIMARY KEY(`id`),
	CONSTRAINT `buses_registration_number_unique` UNIQUE(`registration_number`)
);
--> statement-breakpoint
CREATE TABLE `class_subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`teacher_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `class_subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`section` varchar(64),
	`class_teacher_id` int,
	`academic_year` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`class_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`exam_date` date NOT NULL,
	`duration` int,
	`max_marks` decimal(5,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(50) NOT NULL,
	`priority` varchar(20) NOT NULL DEFAULT 'medium',
	`is_read` boolean NOT NULL DEFAULT false,
	`action_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`read_at` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `parents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`phone_number` varchar(20),
	`occupation` varchar(128),
	`address` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `parents_id` PRIMARY KEY(`id`),
	CONSTRAINT `parents_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`predicted_score` decimal(5,2),
	`risk_level` varchar(20) NOT NULL,
	`confidence` decimal(3,2),
	`recommendations` text,
	`prediction_date` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`exam_id` int,
	`assignment_id` int,
	`subject_id` int NOT NULL,
	`marks` decimal(5,2) NOT NULL,
	`remarks` text,
	`recorded_date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `schools` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`email` varchar(256),
	`phone` varchar(20),
	`address` text,
	`city` varchar(128),
	`state` varchar(128),
	`pincode` varchar(20),
	`principal_name` varchar(128),
	`established_year` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`session_token` varchar(128) NOT NULL,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_parents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`parent_id` int NOT NULL,
	`relation` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_parents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`school_id` int NOT NULL,
	`class_id` int NOT NULL,
	`roll_number` varchar(64),
	`date_of_birth` date,
	`gender` varchar(20),
	`phone_number` varchar(20),
	`address` text,
	`admission_date` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `students_roll_number_unique` UNIQUE(`roll_number`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`code` varchar(64),
	`description` text,
	`max_marks` decimal(5,2),
	`passing_marks` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`school_id` int NOT NULL,
	`employee_id` varchar(64),
	`phone_number` varchar(20),
	`qualification` varchar(256),
	`experience` int,
	`join_date` date,
	`department` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`),
	CONSTRAINT `teachers_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `teachers_employee_id_unique` UNIQUE(`employee_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(256) NOT NULL,
	`name` varchar(128) NOT NULL,
	`password` varchar(256) NOT NULL,
	`role` varchar(32) NOT NULL,
	`school_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(256) NOT NULL,
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD CONSTRAINT `bus_locations_bus_id_buses_id_fk` FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buses` ADD CONSTRAINT `buses_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_subjects` ADD CONSTRAINT `class_subjects_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_subjects` ADD CONSTRAINT `class_subjects_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_subjects` ADD CONSTRAINT `class_subjects_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classes` ADD CONSTRAINT `classes_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exams` ADD CONSTRAINT `exams_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `parents` ADD CONSTRAINT `parents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `predictions` ADD CONSTRAINT `predictions_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_exam_id_exams_id_fk` FOREIGN KEY (`exam_id`) REFERENCES `exams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `results` ADD CONSTRAINT `results_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_parents` ADD CONSTRAINT `student_parents_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_parents` ADD CONSTRAINT `student_parents_parent_id_parents_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `parents`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subjects` ADD CONSTRAINT `subjects_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_tokens` ADD CONSTRAINT `verification_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_user_id_index` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `accounts_provider_index` ON `accounts` (`provider`);--> statement-breakpoint
CREATE INDEX `assignments_class_id_index` ON `assignments` (`class_id`);--> statement-breakpoint
CREATE INDEX `assignments_subject_id_index` ON `assignments` (`subject_id`);--> statement-breakpoint
CREATE INDEX `assignments_teacher_id_index` ON `assignments` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `assignments_due_date_index` ON `assignments` (`due_date`);--> statement-breakpoint
CREATE INDEX `attendance_student_id_index` ON `attendance` (`student_id`);--> statement-breakpoint
CREATE INDEX `attendance_class_id_index` ON `attendance` (`class_id`);--> statement-breakpoint
CREATE INDEX `attendance_date_index` ON `attendance` (`attendance_date`);--> statement-breakpoint
CREATE INDEX `attendance_student_date_index` ON `attendance` (`student_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `bus_locations_bus_id_index` ON `bus_locations` (`bus_id`);--> statement-breakpoint
CREATE INDEX `bus_locations_timestamp_index` ON `bus_locations` (`timestamp`);--> statement-breakpoint
CREATE INDEX `buses_school_id_index` ON `buses` (`school_id`);--> statement-breakpoint
CREATE INDEX `buses_registration_number_index` ON `buses` (`registration_number`);--> statement-breakpoint
CREATE INDEX `class_subjects_class_id_index` ON `class_subjects` (`class_id`);--> statement-breakpoint
CREATE INDEX `class_subjects_subject_id_index` ON `class_subjects` (`subject_id`);--> statement-breakpoint
CREATE INDEX `class_subjects_teacher_id_index` ON `class_subjects` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `classes_school_id_index` ON `classes` (`school_id`);--> statement-breakpoint
CREATE INDEX `classes_class_teacher_id_index` ON `classes` (`class_teacher_id`);--> statement-breakpoint
CREATE INDEX `exams_class_id_index` ON `exams` (`class_id`);--> statement-breakpoint
CREATE INDEX `exams_subject_id_index` ON `exams` (`subject_id`);--> statement-breakpoint
CREATE INDEX `exams_exam_date_index` ON `exams` (`exam_date`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_index` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_is_read_index` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `notifications_created_at_index` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `parents_user_id_index` ON `parents` (`user_id`);--> statement-breakpoint
CREATE INDEX `predictions_student_id_index` ON `predictions` (`student_id`);--> statement-breakpoint
CREATE INDEX `predictions_subject_id_index` ON `predictions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `predictions_risk_level_index` ON `predictions` (`risk_level`);--> statement-breakpoint
CREATE INDEX `results_student_id_index` ON `results` (`student_id`);--> statement-breakpoint
CREATE INDEX `results_exam_id_index` ON `results` (`exam_id`);--> statement-breakpoint
CREATE INDEX `results_assignment_id_index` ON `results` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `results_subject_id_index` ON `results` (`subject_id`);--> statement-breakpoint
CREATE INDEX `schools_name_index` ON `schools` (`name`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_index` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `student_parents_student_id_index` ON `student_parents` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_parents_parent_id_index` ON `student_parents` (`parent_id`);--> statement-breakpoint
CREATE INDEX `students_user_id_index` ON `students` (`user_id`);--> statement-breakpoint
CREATE INDEX `students_school_id_index` ON `students` (`school_id`);--> statement-breakpoint
CREATE INDEX `students_class_id_index` ON `students` (`class_id`);--> statement-breakpoint
CREATE INDEX `students_roll_number_index` ON `students` (`roll_number`);--> statement-breakpoint
CREATE INDEX `subjects_school_id_index` ON `subjects` (`school_id`);--> statement-breakpoint
CREATE INDEX `subjects_code_index` ON `subjects` (`code`);--> statement-breakpoint
CREATE INDEX `teachers_user_id_index` ON `teachers` (`user_id`);--> statement-breakpoint
CREATE INDEX `teachers_school_id_index` ON `teachers` (`school_id`);--> statement-breakpoint
CREATE INDEX `teachers_employee_id_index` ON `teachers` (`employee_id`);--> statement-breakpoint
CREATE INDEX `users_school_id_index` ON `users` (`school_id`);--> statement-breakpoint
CREATE INDEX `users_role_index` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `verification_user_id_index` ON `verification_tokens` (`user_id`);