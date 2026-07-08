CREATE TABLE `bus_stops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bus_id` int NOT NULL,
	`stop_name` varchar(256) NOT NULL,
	`pickup_time` varchar(10) NOT NULL,
	`drop_time` varchar(10) NOT NULL,
	`sequence_number` int NOT NULL,
	`student_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bus_stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bus_stops` ADD CONSTRAINT `bus_stops_bus_id_buses_id_fk` FOREIGN KEY (`bus_id`) REFERENCES `buses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bus_stops_bus_id_index` ON `bus_stops` (`bus_id`);