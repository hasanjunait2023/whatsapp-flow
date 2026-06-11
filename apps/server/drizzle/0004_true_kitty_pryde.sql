CREATE TABLE `llm_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key_encrypted` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`is_byok` integer DEFAULT false NOT NULL,
	`model` text,
	`monthly_token_budget` integer,
	`provider` text,
	`temperature` real,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `llm_settings_tenant_unq` ON `llm_settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `llm_usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`feature` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`provider` text NOT NULL,
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `llm_usage_events_tenant_created_idx` ON `llm_usage_events` (`tenant_id`,`created_at`);