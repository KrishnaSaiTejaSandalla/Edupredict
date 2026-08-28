CREATE TABLE `student_boarding_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`bus_id` int NOT NULL,
	`route_id` int NOT NULL,
	`stop_id` int NOT NULL,
	`trip_id` varchar(128) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'boarded',
	`direction` varchar(20) NOT NULL DEFAULT 'pickup',
	`boarded_at` timestamp DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_boarding_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `student_boarding_logs` ADD CONSTRAINT `student_boarding_logs_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_boarding_logs` ADD CONSTRAINT `student_boarding_logs_bus_id_buses_id_fk` FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_boarding_logs` ADD CONSTRAINT `student_boarding_logs_route_id_transport_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_boarding_logs` ADD CONSTRAINT `student_boarding_logs_stop_id_bus_stops_id_fk` FOREIGN KEY (`stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `student_boarding_logs_student_id_idx` ON `student_boarding_logs` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_boarding_logs_bus_id_idx` ON `student_boarding_logs` (`bus_id`);--> statement-breakpoint
CREATE INDEX `student_boarding_logs_route_id_idx` ON `student_boarding_logs` (`route_id`);--> statement-breakpoint
CREATE INDEX `student_boarding_logs_trip_id_idx` ON `student_boarding_logs` (`trip_id`);