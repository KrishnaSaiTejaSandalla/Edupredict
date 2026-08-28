CREATE TABLE `ai_generated_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`subject_name` varchar(128),
	`topic` varchar(256) NOT NULL,
	`note_type` varchar(64) NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_generated_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_avatar_selections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`avatar_type` varchar(64) NOT NULL,
	`image_url` varchar(512) NOT NULL,
	`is_selected` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_avatar_selections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_diaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`class_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`teacher_id` int NOT NULL,
	`topic_taught` text NOT NULL,
	`homework` text,
	`date` date NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_diaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_diary_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`diary_id` int NOT NULL,
	`is_completed` boolean NOT NULL DEFAULT false,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_diary_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_diary_progress_unique` UNIQUE(`student_id`,`diary_id`)
);
--> statement-breakpoint
ALTER TABLE `schools` ADD `monthly_feedback_open` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `teacher_feedback_open` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `school_survey_open` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_generated_notes` ADD CONSTRAINT `ai_generated_notes_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_avatar_selections` ADD CONSTRAINT `student_avatar_selections_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_diaries` ADD CONSTRAINT `student_diaries_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_diaries` ADD CONSTRAINT `student_diaries_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_diaries` ADD CONSTRAINT `student_diaries_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_diaries` ADD CONSTRAINT `student_diaries_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_diary_progress` ADD CONSTRAINT `student_diary_progress_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_diary_progress` ADD CONSTRAINT `student_diary_progress_diary_id_student_diaries_id_fk` FOREIGN KEY (`diary_id`) REFERENCES `student_diaries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_notes_student_id_idx` ON `ai_generated_notes` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_avatar_student_id_idx` ON `student_avatar_selections` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_diaries_class_id_idx` ON `student_diaries` (`class_id`);--> statement-breakpoint
CREATE INDEX `student_diaries_teacher_id_idx` ON `student_diaries` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `student_diaries_date_idx` ON `student_diaries` (`date`);