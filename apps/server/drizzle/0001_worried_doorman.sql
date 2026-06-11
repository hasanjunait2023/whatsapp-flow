CREATE TABLE `message_raw_payloads` (
	`message_id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`provider_metadata` text,
	`raw_payload` text
);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`id` text PRIMARY KEY NOT NULL,
	`ai_messages` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`messages_received` integer DEFAULT 0 NOT NULL,
	`messages_sent` integer DEFAULT 0 NOT NULL,
	`period_end` text NOT NULL,
	`period_start` text NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usage_counters_tenant_period_unq` ON `usage_counters` (`tenant_id`,`period_start`);--> statement-breakpoint
CREATE TABLE `webhook_events_log` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error` text,
	`event_type` text NOT NULL,
	`instance_id` text,
	`payload` text NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`tenant_id` text
);
--> statement-breakpoint
CREATE INDEX `webhook_events_log_instance_id_idx` ON `webhook_events_log` (`instance_id`);