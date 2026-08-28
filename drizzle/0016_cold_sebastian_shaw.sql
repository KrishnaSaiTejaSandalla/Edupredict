CREATE TABLE `bus_live_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`bus_id` int NOT NULL,
	`driver_id` int NOT NULL,
	`route_id` varchar(128),
	`trip_id` varchar(128) NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`speed` double,
	`heading` double,
	`accuracy` double,
	`status` varchar(64) NOT NULL DEFAULT 'trip_started',
	`current_stop_id` int,
	`next_stop_id` int,
	`remaining_stops` int,
	`last_updated_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bus_live_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `bus_live_locations_bus_id_unique` UNIQUE(`bus_id`)
);
--> statement-breakpoint
CREATE TABLE `student_transport_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`student_id` int NOT NULL,
	`bus_id` int NOT NULL,
	`pickup_stop_id` int,
	`drop_stop_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_transport_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bus_locations` MODIFY COLUMN `speed` double;--> statement-breakpoint
ALTER TABLE `bus_locations` MODIFY COLUMN `heading` double;--> statement-breakpoint
ALTER TABLE `bus_locations` MODIFY COLUMN `accuracy` double;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `school_id` int;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `driver_id` int;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `route_id` varchar(128);--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `trip_id` varchar(128);--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `status` varchar(64) DEFAULT 'trip_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `current_stop_id` int;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `next_stop_id` int;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `remaining_stops` int;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `bus_stops` ADD `latitude` double;--> statement-breakpoint
ALTER TABLE `bus_stops` ADD `longitude` double;--> statement-breakpoint
ALTER TABLE `bus_stops` ADD `route_id` varchar(128);--> statement-breakpoint
ALTER TABLE `bus_live_locations` ADD CONSTRAINT `bus_live_locations_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_live_locations` ADD CONSTRAINT `bus_live_locations_bus_id_buses_id_fk` FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_live_locations` ADD CONSTRAINT `bus_live_locations_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_live_locations` ADD CONSTRAINT `bus_live_locations_current_stop_id_bus_stops_id_fk` FOREIGN KEY (`current_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_live_locations` ADD CONSTRAINT `bus_live_locations_next_stop_id_bus_stops_id_fk` FOREIGN KEY (`next_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD CONSTRAINT `student_transport_assignments_student_id_students_id_fk` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD CONSTRAINT `student_transport_assignments_bus_id_buses_id_fk` FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD CONSTRAINT `student_transport_assignments_pickup_stop_id_bus_stops_id_fk` FOREIGN KEY (`pickup_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD CONSTRAINT `student_transport_assignments_drop_stop_id_bus_stops_id_fk` FOREIGN KEY (`drop_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bus_live_locations_school_id_index` ON `bus_live_locations` (`school_id`);--> statement-breakpoint
CREATE INDEX `bus_live_locations_driver_id_index` ON `bus_live_locations` (`driver_id`);--> statement-breakpoint
CREATE INDEX `bus_live_locations_trip_id_index` ON `bus_live_locations` (`trip_id`);--> statement-breakpoint
CREATE INDEX `bus_live_locations_status_index` ON `bus_live_locations` (`status`);--> statement-breakpoint
CREATE INDEX `student_transport_assignments_student_id_index` ON `student_transport_assignments` (`student_id`);--> statement-breakpoint
CREATE INDEX `student_transport_assignments_bus_id_index` ON `student_transport_assignments` (`bus_id`);--> statement-breakpoint
CREATE INDEX `student_transport_assignments_active_index` ON `student_transport_assignments` (`is_active`);--> statement-breakpoint
ALTER TABLE `bus_locations` ADD CONSTRAINT `bus_locations_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD CONSTRAINT `bus_locations_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD CONSTRAINT `bus_locations_current_stop_id_bus_stops_id_fk` FOREIGN KEY (`current_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bus_locations` ADD CONSTRAINT `bus_locations_next_stop_id_bus_stops_id_fk` FOREIGN KEY (`next_stop_id`) REFERENCES `bus_stops`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bus_locations_school_id_index` ON `bus_locations` (`school_id`);--> statement-breakpoint
CREATE INDEX `bus_locations_driver_id_index` ON `bus_locations` (`driver_id`);--> statement-breakpoint
CREATE INDEX `bus_locations_trip_id_index` ON `bus_locations` (`trip_id`);