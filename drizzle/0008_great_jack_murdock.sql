CREATE TABLE `class_teacher_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`class_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `class_teacher_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_teacher_assignments_class_id_unique` UNIQUE(`class_id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_class_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`class_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_class_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teacher_subject_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacher_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_subject_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance` ADD `subject_id` int;--> statement-breakpoint
ALTER TABLE `attendance` ADD `topic_taught` varchar(255);--> statement-breakpoint
ALTER TABLE `class_teacher_assignments` ADD CONSTRAINT `class_teacher_assignments_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_teacher_assignments` ADD CONSTRAINT `class_teacher_assignments_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_class_assignments` ADD CONSTRAINT `teacher_class_assignments_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_class_assignments` ADD CONSTRAINT `teacher_class_assignments_class_id_classes_id_fk` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_subject_assignments` ADD CONSTRAINT `teacher_subject_assignments_teacher_id_teachers_id_fk` FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teacher_subject_assignments` ADD CONSTRAINT `teacher_subject_assignments_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cta_teacher_id_idx` ON `class_teacher_assignments` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `cta_class_id_idx` ON `class_teacher_assignments` (`class_id`);--> statement-breakpoint
CREATE INDEX `tca_teacher_id_idx` ON `teacher_class_assignments` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `tca_class_id_idx` ON `teacher_class_assignments` (`class_id`);--> statement-breakpoint
CREATE INDEX `tsa_teacher_id_idx` ON `teacher_subject_assignments` (`teacher_id`);--> statement-breakpoint
CREATE INDEX `tsa_subject_id_idx` ON `teacher_subject_assignments` (`subject_id`);--> statement-breakpoint
ALTER TABLE `attendance` ADD CONSTRAINT `attendance_subject_id_subjects_id_fk` FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE no action ON UPDATE no action;