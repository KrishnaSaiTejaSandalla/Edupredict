CREATE TABLE `ai_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`current_score` decimal(5,2) NOT NULL,
	`predicted_score_min` decimal(5,2) NOT NULL,
	`predicted_score_max` decimal(5,2) NOT NULL,
	`risk_level` varchar(20) NOT NULL,
	`confidence` varchar(20) NOT NULL DEFAULT 'medium',
	`academic_health_score` int NOT NULL,
	`attendance_impact` text,
	`assignment_impact` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ai_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`resource_id` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_bookmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource_id` int NOT NULL,
	`student_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_bookmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource_id` int NOT NULL,
	`student_id` int NOT NULL,
	`downloaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resource_id` int NOT NULL,
	`student_id` int NOT NULL,
	`viewed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resource_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_learning_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`resource_id` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`is_completed` boolean NOT NULL DEFAULT false,
	`last_accessed_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_learning_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `learning_progress_student_resource_unique` UNIQUE(`student_id`,`resource_id`)
);
--> statement-breakpoint
ALTER TABLE `teacher_resources` ADD `view_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_predictions` ADD CONSTRAINT `ai_predictions_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_predictions` ADD CONSTRAINT `ai_predictions_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_recommendations` ADD CONSTRAINT `ai_recommendations_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_recommendations` ADD CONSTRAINT `ai_recommendations_resource_id_teacher_resources_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `teacher_resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_bookmarks` ADD CONSTRAINT `resource_bookmarks_resource_id_teacher_resources_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `teacher_resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_bookmarks` ADD CONSTRAINT `resource_bookmarks_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_downloads` ADD CONSTRAINT `resource_downloads_resource_id_teacher_resources_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `teacher_resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_downloads` ADD CONSTRAINT `resource_downloads_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_views` ADD CONSTRAINT `resource_views_resource_id_teacher_resources_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `teacher_resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_views` ADD CONSTRAINT `resource_views_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_learning_progress` ADD CONSTRAINT `student_learning_progress_resource_id_teacher_resources_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `teacher_resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_learning_progress` ADD CONSTRAINT `student_learning_progress_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_predictions_student_id_idx` ON `ai_predictions` (`student_id`);--> statement-breakpoint
CREATE INDEX `ai_predictions_subject_id_idx` ON `ai_predictions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `ai_recs_student_id_idx` ON `ai_recommendations` (`student_id`);--> statement-breakpoint
CREATE INDEX `resource_bookmarks_resource_id_idx` ON `resource_bookmarks` (`resource_id`);--> statement-breakpoint
CREATE INDEX `resource_bookmarks_student_id_idx` ON `resource_bookmarks` (`student_id`);--> statement-breakpoint
CREATE INDEX `resource_downloads_resource_id_idx` ON `resource_downloads` (`resource_id`);--> statement-breakpoint
CREATE INDEX `resource_downloads_student_id_idx` ON `resource_downloads` (`student_id`);--> statement-breakpoint
CREATE INDEX `resource_views_resource_id_idx` ON `resource_views` (`resource_id`);--> statement-breakpoint
CREATE INDEX `resource_views_student_id_idx` ON `resource_views` (`student_id`);--> statement-breakpoint
CREATE INDEX `learning_progress_student_id_idx` ON `student_learning_progress` (`student_id`);--> statement-breakpoint
CREATE INDEX `learning_progress_resource_id_idx` ON `student_learning_progress` (`resource_id`);