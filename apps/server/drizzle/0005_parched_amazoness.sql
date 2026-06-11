CREATE TABLE `agent_souls` (
	`id` text PRIMARY KEY NOT NULL,
	`approved_at` text,
	`business_profile` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error_message` text,
	`faqs` text,
	`hours` text,
	`languages` text,
	`policies` text,
	`products_summary` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`system_prompt_cache` text,
	`tenant_id` text NOT NULL,
	`tone` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_souls_tenant_unq` ON `agent_souls` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `job_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`dedupe_key` text,
	`kind` text NOT NULL,
	`last_error` text,
	`payload` text,
	`run_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`tenant_id` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `job_queue_status_run_at_idx` ON `job_queue` (`status`,`run_at`);--> statement-breakpoint
CREATE INDEX `job_queue_dedupe_key_idx` ON `job_queue` (`dedupe_key`);--> statement-breakpoint
CREATE TABLE `soul_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`content_text` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error` text,
	`fetched_at` text,
	`soul_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text NOT NULL,
	`type` text NOT NULL,
	`url` text
);
--> statement-breakpoint
CREATE INDEX `soul_sources_tenant_id_idx` ON `soul_sources` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `soul_sources_soul_id_idx` ON `soul_sources` (`soul_id`);