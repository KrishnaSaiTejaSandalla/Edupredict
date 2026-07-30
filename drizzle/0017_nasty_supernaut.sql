CREATE TABLE `transport_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`school_id` int NOT NULL,
	`route_name` varchar(128) NOT NULL,
	`type` varchar(20) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transport_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bus_stops` MODIFY COLUMN `bus_id` int;--> statement-breakpoint
ALTER TABLE `bus_stops` MODIFY COLUMN `route_id` int;--> statement-breakpoint
ALTER TABLE `buses` ADD `route_id` int;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD `route_id` int;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD `assigned_by` int;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD `assigned_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD `morning_pickup_time` varchar(10);--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD `return_time` varchar(10);--> statement-breakpoint
ALTER TABLE `transport_routes` ADD CONSTRAINT `transport_routes_school_id_schools_id_fk` FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `transport_routes_school_id_index` ON `transport_routes` (`school_id`);--> statement-breakpoint
ALTER TABLE `bus_stops` ADD CONSTRAINT `bus_stops_route_id_transport_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buses` ADD CONSTRAINT `buses_route_id_transport_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD CONSTRAINT `student_transport_assignments_route_id_transport_routes_id_fk` FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_transport_assignments` ADD CONSTRAINT `student_transport_assignments_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bus_stops_route_id_index` ON `bus_stops` (`route_id`);--> statement-breakpoint
CREATE INDEX `buses_route_id_index` ON `buses` (`route_id`);--> statement-breakpoint
CREATE INDEX `student_transport_assignments_route_id_index` ON `student_transport_assignments` (`route_id`);