ALTER TABLE `message_templates` ADD `tenant_id` text;--> statement-breakpoint
CREATE INDEX `message_templates_tenant_id_idx` ON `message_templates` (`tenant_id`);