ALTER TABLE `students` ADD `qr_token` varchar(128);--> statement-breakpoint
ALTER TABLE `students` ADD CONSTRAINT `students_qr_token_unique` UNIQUE(`qr_token`);
