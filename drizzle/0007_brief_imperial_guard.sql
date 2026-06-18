CREATE TABLE `assignment_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`student_id` int NOT NULL,
	`submitted_at` timestamp NOT NULL DEFAULT (now()),
	`file_url` varchar(512),
	`content` text,
	`grade` decimal(5,2),
	`feedback` text,
	`graded_at` timestamp,
	`graded_by` int,
	`is_late` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignment_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assignment_submissions_student_assignment_unique` UNIQUE(`assignment_id`,`student_id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`student_id` int NOT NULL,
	`class_id` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`category` varchar(64) NOT NULL,
	`academic_year` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teacher_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`school_id` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`subject` varchar(128),
	`class_level` varchar(64),
	`resource_type` varchar(64) NOT NULL,
	`file_url` varchar(512),
	`is_ai_generated` boolean NOT NULL DEFAULT false,
	`ai_prompt` text,
	`ai_content` text,
	`download_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_resources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_assignment_id_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_feedback` ADD CONSTRAINT `teacher_feedback_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_feedback` ADD CONSTRAINT `teacher_feedback_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_feedback` ADD CONSTRAINT `teacher_feedback_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_resources` ADD CONSTRAINT `teacher_resources_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_resources` ADD CONSTRAINT `teacher_resources_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assignment_submissions_assignment_id_idx` ON `assignment_submissions` (`assignment_id`);--> statement-breakpoint
CREATE INDEX `assignment_submissions_student_id_idx` ON `assignment_submissions` (`student_id`);--> statement-breakpoint
CREATE INDEX `assignment_submissions_graded_by_idx` ON `assignment_submissions` (`graded_by`);--> statement-breakpoint
CREATE INDEX `teacher_feedback_teacher_id_idx` ON `teacher_feedback` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `teacher_feedback_student_id_idx` ON `teacher_feedback` (`student_id`);--> statement-breakpoint
CREATE INDEX `teacher_feedback_class_id_idx` ON `teacher_feedback` (`class_id`);--> statement-breakpoint
CREATE INDEX `teacher_resources_teacher_id_idx` ON `teacher_resources` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `teacher_resources_school_id_idx` ON `teacher_resources` (`school_id`);--> statement-breakpoint
CREATE INDEX `teacher_resources_subject_idx` ON `teacher_resources` (`subject`);--> statement-breakpoint
CREATE INDEX `teacher_resources_type_idx` ON `teacher_resources` (`resource_type`);