CREATE TABLE `agent_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent` text NOT NULL,
	`channels` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`escalation_keywords` text,
	`max_turns_before_handoff` integer DEFAULT 10,
	`model_override` text,
	`reply_delay_ms` integer DEFAULT 8000 NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`working_hours` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_configs_tenant_agent_unq` ON `agent_configs` (`tenant_id`,`agent`);--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent` text NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`contact_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error` text,
	`input_preview` text,
	`latency_ms` integer,
	`output_preview` text,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`tenant_id` text NOT NULL,
	`tool_calls` text,
	`trigger` text
);
--> statement-breakpoint
CREATE INDEX `agent_runs_tenant_created_idx` ON `agent_runs` (`tenant_id`,`created_at`);