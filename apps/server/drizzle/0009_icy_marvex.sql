CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`endpoint` text NOT NULL,
	`keys` text NOT NULL,
	`tenant_id` text NOT NULL,
	`user_agent` text,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unq` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_tenant_id_idx` ON `push_subscriptions` (`tenant_id`);