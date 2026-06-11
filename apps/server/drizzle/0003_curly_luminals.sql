CREATE TABLE `facebook_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`app_secret` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`last_connected_at` text,
	`page_access_token` text NOT NULL,
	`page_id` text NOT NULL,
	`page_name` text NOT NULL,
	`profile_picture_url` text,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`tenant_id` text NOT NULL,
	`token_expires_at` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`webhook_verify_token` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `facebook_pages_tenant_id_idx` ON `facebook_pages` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `facebook_pages_tenant_page_unq` ON `facebook_pages` (`tenant_id`,`page_id`);--> statement-breakpoint
CREATE TABLE `fb_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`assigned_to` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`handoff_at` text,
	`handoff_reason` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_blocked` integer DEFAULT false NOT NULL,
	`last_message_at` text,
	`locale` text,
	`name` text,
	`needs_handoff` integer DEFAULT false NOT NULL,
	`page_id` text NOT NULL,
	`profile_pic_synced_at` text,
	`profile_pic_url` text,
	`psid` text NOT NULL,
	`tags` text,
	`tenant_id` text NOT NULL,
	`typing_at` text,
	`unread_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fb_contacts_tenant_id_idx` ON `fb_contacts` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fb_contacts_page_psid_unq` ON `fb_contacts` (`page_id`,`psid`);--> statement-breakpoint
CREATE TABLE `fb_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`attachment_id` text,
	`contact_id` text NOT NULL,
	`content` text,
	`content_type` text DEFAULT 'text' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`delivered_at` text,
	`direction` text NOT NULL,
	`error_message` text,
	`is_from_ai` integer DEFAULT false NOT NULL,
	`media_filename` text,
	`media_mime_type` text,
	`media_url` text,
	`mid` text,
	`original_media_url` text,
	`page_id` text NOT NULL,
	`quick_reply_payload` text,
	`read_at` text,
	`reply_to_id` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`sent_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`sent_by_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text NOT NULL,
	`text_preview` text
);
--> statement-breakpoint
CREATE INDEX `fb_messages_tenant_id_idx` ON `fb_messages` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fb_messages_mid_unq` ON `fb_messages` (`mid`);--> statement-breakpoint
CREATE INDEX `fb_messages_contact_id_created_at_idx` ON `fb_messages` (`contact_id`,`created_at`);