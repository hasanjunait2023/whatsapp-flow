CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`admin_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`details` text,
	`entity_id` text,
	`entity_type` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_admin_id_idx` ON `admin_audit_logs` (`admin_id`);--> statement-breakpoint
CREATE TABLE `contact_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`label_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_labels_contact_id_idx` ON `contact_labels` (`contact_id`);--> statement-breakpoint
CREATE TABLE `contact_thread_state` (
	`contact_id` text PRIMARY KEY NOT NULL,
	`assigned_to` text,
	`contact_avatar_url` text,
	`contact_name` text,
	`contact_phone` text,
	`contact_type` text DEFAULT 'whatsapp' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`handoff_reason` text,
	`instance_id` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`label_ids` text,
	`last_inbound_at` text,
	`last_message_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`last_message_direction` text,
	`last_message_preview` text,
	`last_message_type` text,
	`needs_handoff` integer DEFAULT false NOT NULL,
	`tenant_id` text NOT NULL,
	`total_messages` integer DEFAULT 0 NOT NULL,
	`unread_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_thread_state_tenant_id_last_message_at_idx` ON `contact_thread_state` (`tenant_id`,`last_message_at`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`assigned_to` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`device_typing_at` text,
	`handoff_at` text,
	`handoff_reason` text,
	`instance_id` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`last_message_at` text,
	`name` text,
	`needs_handoff` integer DEFAULT false NOT NULL,
	`phone_number` text NOT NULL,
	`profile_pic_synced_at` text,
	`profile_pic_url` text,
	`replying_started_at` text,
	`replying_user_id` text,
	`tenant_id` text NOT NULL,
	`unread_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`wa_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contacts_tenant_id_idx` ON `contacts` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `contacts_instance_id_wa_id_idx` ON `contacts` (`instance_id`,`wa_id`);--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`channel` text DEFAULT 'whatsapp' NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`is_active` integer,
	`name` text NOT NULL,
	`placeholders` text,
	`subject` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text,
	`content` text,
	`content_type` text DEFAULT 'text' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`delivered_at` text,
	`direction` text NOT NULL,
	`error_message` text,
	`instance_id` text,
	`is_from_ai` integer DEFAULT false NOT NULL,
	`is_synced_from_device` integer,
	`location_lat` text,
	`location_lng` text,
	`media_filename` text,
	`media_mime_type` text,
	`media_url` text,
	`read_at` text,
	`reply_to_id` text,
	`sender_phone` text,
	`sent_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`sent_by_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text NOT NULL,
	`text_preview` text,
	`wa_group_id` text,
	`wa_message_id` text
);
--> statement-breakpoint
CREATE INDEX `messages_tenant_id_idx` ON `messages` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `messages_wa_message_id_unq` ON `messages` (`wa_message_id`);--> statement-breakpoint
CREATE INDEX `messages_contact_id_created_at_idx` ON `messages` (`contact_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error_message` text,
	`instance_id` text,
	`metadata` text,
	`recipient` text,
	`sent_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notifications_tenant_id_idx` ON `notifications` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text,
	`email` text,
	`full_name` text,
	`phone_number` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quick_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`content_type` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`media_filename` text,
	`media_items` text,
	`media_url` text,
	`shortcut` text,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quick_replies_tenant_id_idx` ON `quick_replies` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`cancelled_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`current_period_end` text NOT NULL,
	`current_period_start` text NOT NULL,
	`feature_overrides` text,
	`grace_period_ends_at` text,
	`plan_id` text NOT NULL,
	`resource_overrides` text,
	`status` text DEFAULT 'trialing' NOT NULL,
	`tenant_id` text NOT NULL,
	`trial_ends_at` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `subscriptions_tenant_id_idx` ON `subscriptions` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `system_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`granted_at` text,
	`granted_by` text,
	`is_super_admin` integer,
	`permissions` text,
	`role` text DEFAULT 'user' NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `system_roles_user_id_idx` ON `system_roles` (`user_id`);--> statement-breakpoint
CREATE TABLE `tenant_daily_stats` (
	`tenant_id` text NOT NULL,
	`stat_date` text NOT NULL,
	`active_conversations` integer DEFAULT 0 NOT NULL,
	`fb_inbound` integer DEFAULT 0 NOT NULL,
	`fb_outbound` integer DEFAULT 0 NOT NULL,
	`inbound_count` integer DEFAULT 0 NOT NULL,
	`new_conversations` integer DEFAULT 0 NOT NULL,
	`outbound_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`wa_inbound` integer DEFAULT 0 NOT NULL,
	`wa_outbound` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`tenant_id`, `stat_date`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`activated_at` text,
	`activated_by` text,
	`business_type_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`is_activated` integer DEFAULT false,
	`logo_url` text,
	`name` text NOT NULL,
	`onboarding_status` text,
	`owner_id` text NOT NULL,
	`pending_plan_id` text,
	`settings` text,
	`slug` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `user_roles_tenant_id_idx` ON `user_roles` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `user_roles_user_id_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_roles_user_tenant_unq` ON `user_roles` (`user_id`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `whatsapp_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key_encrypted` text,
	`connection_error` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`deleted_at` text,
	`device_info` text,
	`is_default` integer DEFAULT false NOT NULL,
	`is_deleted` integer,
	`last_connected_at` text,
	`last_qr_sent_at` text,
	`last_status_at` text,
	`name` text NOT NULL,
	`phone_number` text,
	`qr_code` text,
	`qr_expires_at` text,
	`session_id` text,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`wasender_session_id` text,
	`webhook_secret` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `whatsapp_instances_tenant_id_idx` ON `whatsapp_instances` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`inviter_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text,
	`logo` text,
	`created_at` integer NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_unique` ON `organization` (`slug`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`active_organization_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
