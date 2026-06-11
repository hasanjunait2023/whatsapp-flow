CREATE TABLE `agent_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`agent` text DEFAULT 'ceo' NOT NULL,
	`cadence` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`hour_utc` integer DEFAULT 9 NOT NULL,
	`last_run_at` text,
	`report_type` text NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_schedules_tenant_type_unq` ON `agent_schedules` (`tenant_id`,`agent`,`report_type`);--> statement-breakpoint
CREATE TABLE `ceo_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`content_md` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`data_snapshot` text,
	`error` text,
	`sent_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ceo_reports_tenant_created_idx` ON `ceo_reports` (`tenant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `telegram_links` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`expires_at` text NOT NULL,
	`link_code` text NOT NULL,
	`linked_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `telegram_links_link_code_unq` ON `telegram_links` (`link_code`);--> statement-breakpoint
CREATE INDEX `telegram_links_tenant_id_idx` ON `telegram_links` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `admin_access_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`permissions` text,
	`reason` text,
	`requested_by` text NOT NULL,
	`review_notes` text,
	`reviewed_at` text,
	`reviewed_by` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_access_requests_user_id_idx` ON `admin_access_requests` (`user_id`);--> statement-breakpoint
CREATE TABLE `admin_customer_journey` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description_bn` text,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`event_category` text,
	`event_type` text NOT NULL,
	`metadata` text,
	`title_bn` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_marketing_campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`alternate_channels` integer DEFAULT true,
	`blackout_hours` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`created_by` text,
	`frequency_per_month` integer DEFAULT 4,
	`frequency_per_week` integer DEFAULT 1,
	`max_discount_percent` integer DEFAULT 10,
	`min_days_between_messages` integer DEFAULT 2,
	`name` text NOT NULL,
	`name_bn` text,
	`status` text DEFAULT 'draft',
	`target_audience` text,
	`target_tier` text,
	`type` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`use_email` integer DEFAULT true,
	`use_whatsapp` integer DEFAULT true
);
--> statement-breakpoint
CREATE TABLE `admin_marketing_enrollments` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`completed_at` text,
	`current_step` integer DEFAULT 0,
	`current_week` integer DEFAULT 1,
	`enrolled_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`last_message_at` text,
	`messages_this_month` integer DEFAULT 0,
	`messages_this_week` integer DEFAULT 0,
	`metadata` text,
	`month_reset_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`next_message_at` text,
	`status` text DEFAULT 'active',
	`total_messages_sent` integer DEFAULT 0,
	`unsubscribed_at` text,
	`week_reset_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE TABLE `admin_marketing_sends` (
	`id` text PRIMARY KEY NOT NULL,
	`ai_generated` integer DEFAULT false,
	`channel` text NOT NULL,
	`clicked_at` text,
	`content` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`delivered_at` text,
	`enrollment_id` text NOT NULL,
	`error_message` text,
	`opened_at` text,
	`sent_at` text,
	`sequence_id` text NOT NULL,
	`status` text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE `admin_marketing_sequences` (
	`id` text PRIMARY KEY NOT NULL,
	`ai_personalize` integer DEFAULT false,
	`campaign_id` text NOT NULL,
	`channel` text NOT NULL,
	`content_template` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`day_of_week` integer,
	`discount_percent` integer DEFAULT 0,
	`is_active` integer DEFAULT true,
	`name` text NOT NULL,
	`name_bn` text,
	`step_order` integer NOT NULL,
	`theme` text,
	`week_number` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`entity_id` text,
	`entity_type` text,
	`is_read` integer DEFAULT false,
	`message` text,
	`metadata` text,
	`tenant_id` text,
	`title` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`assigned_by` text,
	`assigned_to` text,
	`completed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`due_date` text,
	`priority` text DEFAULT 'medium',
	`related_tenant_id` text,
	`related_ticket_id` text,
	`status` text DEFAULT 'todo',
	`title` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`action_config` text NOT NULL,
	`action_type` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`name` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`tenant_id` text NOT NULL,
	`trigger_config` text NOT NULL,
	`trigger_type` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `automation_rules_tenant_id_idx` ON `automation_rules` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `business_type_features` (
	`id` text PRIMARY KEY NOT NULL,
	`business_type_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`display_order` integer DEFAULT 0,
	`feature_description` text,
	`feature_key` text NOT NULL,
	`feature_label` text NOT NULL,
	`feature_label_bn` text,
	`icon` text,
	`is_core` integer DEFAULT true,
	`min_tier` text DEFAULT 'starter'
);
--> statement-breakpoint
CREATE INDEX `business_type_features_type_idx` ON `business_type_features` (`business_type_id`);--> statement-breakpoint
CREATE TABLE `business_types` (
	`id` text PRIMARY KEY NOT NULL,
	`color` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`display_order` integer DEFAULT 0,
	`icon` text,
	`is_active` integer DEFAULT true,
	`name` text NOT NULL,
	`name_bn` text,
	`slug` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` text PRIMARY KEY NOT NULL,
	`assigned_to` text,
	`category` text DEFAULT 'other' NOT NULL,
	`contact_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`description` text NOT NULL,
	`order_id` text,
	`priority` text DEFAULT 'medium' NOT NULL,
	`reported_by` text NOT NULL,
	`resolution_notes` text,
	`resolved_at` text,
	`resolved_by` text,
	`status` text DEFAULT 'open' NOT NULL,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `complaints_tenant_id_idx` ON `complaints` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `contact_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`assigned_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`assigned_by` text,
	`assignment_reason` text,
	`contact_id` text NOT NULL,
	`segment_id` text NOT NULL,
	`tenant_id` text
);
--> statement-breakpoint
CREATE INDEX `contact_segments_contact_id_idx` ON `contact_segments` (`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `contact_segments_contact_segment_unq` ON `contact_segments` (`contact_id`,`segment_id`);--> statement-breakpoint
CREATE TABLE `courier_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key` text,
	`api_secret` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`default_pickup_address` text,
	`is_active` integer DEFAULT true,
	`provider` text NOT NULL,
	`settings` text,
	`store_id` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `courier_integrations_tenant_id_idx` ON `courier_integrations` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `courier_integrations_tenant_provider_unq` ON `courier_integrations` (`tenant_id`,`provider`);--> statement-breakpoint
CREATE TABLE `customer_journey_events` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text,
	`description` text,
	`event_category` text NOT NULL,
	`event_type` text NOT NULL,
	`metadata` text,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_journey_events_tenant_id_idx` ON `customer_journey_events` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `customer_journey_events_contact_id_idx` ON `customer_journey_events` (`contact_id`);--> statement-breakpoint
CREATE TABLE `customer_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`avg_order_value` real DEFAULT 0,
	`contact_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`first_order_date` text,
	`last_calculated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`last_order_date` text,
	`message_count` integer DEFAULT 0,
	`score` integer DEFAULT 0,
	`score_tier` text DEFAULT 'new',
	`tenant_id` text NOT NULL,
	`total_orders` integer DEFAULT 0,
	`total_spent` real DEFAULT 0,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `customer_scores_tenant_id_idx` ON `customer_scores` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_scores_contact_unq` ON `customer_scores` (`contact_id`);--> statement-breakpoint
CREATE TABLE `customer_scoring_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`criteria_type` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true,
	`name` text NOT NULL,
	`operator` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`tenant_id` text NOT NULL,
	`value_max` real,
	`value_min` real
);
--> statement-breakpoint
CREATE INDEX `customer_scoring_rules_tenant_id_idx` ON `customer_scoring_rules` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `customer_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`color` text DEFAULT '#3B82F6',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`icon` text DEFAULT 'users',
	`is_active` integer DEFAULT true,
	`is_auto` integer DEFAULT false,
	`name` text NOT NULL,
	`rules` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `customer_segments_tenant_id_idx` ON `customer_segments` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_segments_tenant_name_unq` ON `customer_segments` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`color` text DEFAULT 'gray',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`icon` text,
	`is_active` integer DEFAULT true,
	`name` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`attachment_url` text,
	`category_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`currency` text DEFAULT 'BDT',
	`description` text NOT NULL,
	`expense_date` text NOT NULL,
	`notes` text,
	`payment_method` text,
	`recorded_by` text,
	`reference_number` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`vendor_name` text
);
--> statement-breakpoint
CREATE TABLE `external_sales_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`billing_cycle` text DEFAULT 'monthly' NOT NULL,
	`business_name` text NOT NULL,
	`business_type` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`currency` text DEFAULT 'BDT' NOT NULL,
	`customer_email` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text,
	`error_message` text,
	`external_order_id` text NOT NULL,
	`payment_method` text,
	`plan_id` text,
	`processed_at` text,
	`raw_payload` text,
	`source` text DEFAULT 'main_website' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text,
	`transaction_id` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_sales_orders_external_order_unq` ON `external_sales_orders` (`external_order_id`,`source`);--> statement-breakpoint
CREATE TABLE `fb_contact_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`label_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `fb_contact_labels_contact_id_idx` ON `fb_contact_labels` (`contact_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fb_contact_labels_contact_label_unq` ON `fb_contact_labels` (`contact_id`,`label_id`);--> statement-breakpoint
CREATE TABLE `fb_post_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`attachment_type` text,
	`attachment_url` text,
	`commenter_fb_id` text NOT NULL,
	`commenter_name` text,
	`commenter_picture_url` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`created_time` text,
	`fb_comment_id` text NOT NULL,
	`fb_contact_id` text,
	`is_from_page` integer DEFAULT false,
	`is_hidden` integer DEFAULT false,
	`is_read` integer DEFAULT false,
	`like_count` integer DEFAULT 0,
	`message` text,
	`page_id` text NOT NULL,
	`parent_comment_id` text,
	`post_id` text NOT NULL,
	`reply_count` integer DEFAULT 0,
	`sent_by_user_id` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `fb_post_comments_tenant_id_idx` ON `fb_post_comments` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fb_post_comments_comment_unq` ON `fb_post_comments` (`fb_comment_id`);--> statement-breakpoint
CREATE TABLE `fb_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_count` integer DEFAULT 0,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`created_time` text,
	`fb_post_id` text NOT NULL,
	`full_picture` text,
	`is_hidden` integer DEFAULT false,
	`last_comment_at` text,
	`message` text,
	`page_id` text NOT NULL,
	`permalink_url` text,
	`post_type` text DEFAULT 'status',
	`tenant_id` text NOT NULL,
	`unread_comment_count` integer DEFAULT 0,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `fb_posts_tenant_id_idx` ON `fb_posts` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fb_posts_page_post_unq` ON `fb_posts` (`page_id`,`fb_post_id`);--> statement-breakpoint
CREATE TABLE `feature_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`display_order` integer DEFAULT 0,
	`icon` text,
	`name` text NOT NULL,
	`name_bn` text
);
--> statement-breakpoint
CREATE TABLE `group_add_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_size` integer DEFAULT 5,
	`completed_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`created_by` text,
	`error_log` text,
	`failed_count` integer DEFAULT 0,
	`group_id` text NOT NULL,
	`interval_minutes` integer DEFAULT 30,
	`phone_numbers` text NOT NULL,
	`processed_count` integer DEFAULT 0,
	`scheduled_for` text NOT NULL,
	`status` text DEFAULT 'pending',
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `group_add_queue_tenant_id_idx` ON `group_add_queue` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `in_app_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`entity_id` text,
	`entity_type` text,
	`is_read` integer DEFAULT false,
	`message` text,
	`metadata` text,
	`read_at` text,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `in_app_notifications_tenant_id_idx` ON `in_app_notifications` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `internal_chat_members` (
	`id` text PRIMARY KEY NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`joined_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`last_read_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`room_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `internal_chat_members_room_user_unq` ON `internal_chat_members` (`room_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `internal_chat_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text,
	`name` text,
	`tenant_id` text NOT NULL,
	`type` text DEFAULT 'direct' NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `internal_chat_rooms_tenant_id_idx` ON `internal_chat_rooms` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `internal_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`content` text,
	`content_type` text DEFAULT 'text' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`edited_at` text,
	`is_deleted` integer DEFAULT false NOT NULL,
	`media_filename` text,
	`media_url` text,
	`mentions` text,
	`reply_to_id` text,
	`room_id` text NOT NULL,
	`sender_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `internal_messages_room_id_idx` ON `internal_messages` (`room_id`);--> statement-breakpoint
CREATE TABLE `invoice_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_address` text,
	`company_email` text,
	`company_name` text,
	`company_phone` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`footer_text` text,
	`invoice_prefix` text DEFAULT 'INV-',
	`logo_url` text,
	`next_invoice_number` integer DEFAULT 1,
	`tax_id` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoice_settings_tenant_unq` ON `invoice_settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`invoice_number` text NOT NULL,
	`order_id` text,
	`pdf_url` text,
	`sent_at` text,
	`sent_via_whatsapp` integer DEFAULT false,
	`tenant_id` text NOT NULL,
	`total` real
);
--> statement-breakpoint
CREATE INDEX `invoices_tenant_id_idx` ON `invoices` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `labels` (
	`id` text PRIMARY KEY NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`name` text NOT NULL,
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `labels_tenant_id_idx` ON `labels` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `labels_tenant_name_unq` ON `labels` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `marketing_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`business_name` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`demo_access_count` integer DEFAULT 0,
	`demo_accessed_at` text,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`notes` text,
	`source` text DEFAULT 'demo_request',
	`status` text DEFAULT 'warm',
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`whatsapp_number` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `onboarding_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error_message` text,
	`instance_id` text,
	`metadata` text,
	`next_retry_at` text,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`step` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `onboarding_jobs_tenant_id_idx` ON `onboarding_jobs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text,
	`notes` text,
	`order_id` text NOT NULL,
	`status` text NOT NULL,
	`tenant_id` text
);
--> statement-breakpoint
CREATE INDEX `order_status_history_order_id_idx` ON `order_status_history` (`order_id`);--> statement-breakpoint
CREATE TABLE `permission_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`is_system` integer DEFAULT false,
	`name` text NOT NULL,
	`permissions` text NOT NULL,
	`tenant_id` text
);
--> statement-breakpoint
CREATE INDEX `permission_templates_tenant_id_idx` ON `permission_templates` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `purchase_behavior_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`cancelled_deliveries` integer DEFAULT 0,
	`checked_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`checked_by` text,
	`contact_id` text,
	`courier_stats` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`customer_rating` real,
	`phone_number` text NOT NULL,
	`raw_response` text,
	`returned_deliveries` integer DEFAULT 0,
	`risk_level` text,
	`successful_deliveries` integer DEFAULT 0,
	`tenant_id` text NOT NULL,
	`total_deliveries` integer DEFAULT 0,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `purchase_behavior_checks_tenant_id_idx` ON `purchase_behavior_checks` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`category_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`currency` text DEFAULT 'BDT',
	`day_of_month` integer DEFAULT 1,
	`description` text NOT NULL,
	`frequency` text DEFAULT 'monthly' NOT NULL,
	`is_active` integer DEFAULT true,
	`last_generated_at` text,
	`next_due_date` text NOT NULL,
	`notes` text,
	`payment_method` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`vendor_name` text
);
--> statement-breakpoint
CREATE TABLE `reminder_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text NOT NULL,
	`error_message` text,
	`reminder_type` text NOT NULL,
	`sent_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`status` text DEFAULT 'pending' NOT NULL,
	`subscription_id` text,
	`tenant_id` text
);
--> statement-breakpoint
CREATE INDEX `reminder_logs_tenant_id_idx` ON `reminder_logs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `reminder_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`channel` text DEFAULT 'both' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`days_offset` text NOT NULL,
	`email_subject` text,
	`is_active` integer DEFAULT true,
	`reminder_type` text NOT NULL,
	`template_id` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE TABLE `scheduled_report_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`error_message` text,
	`report_data` text,
	`report_type` text NOT NULL,
	`sent_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scheduled_report_logs_tenant_id_idx` ON `scheduled_report_logs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `scheduled_report_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`daily_enabled` integer DEFAULT true NOT NULL,
	`monthly_enabled` integer DEFAULT true NOT NULL,
	`send_time` text DEFAULT '20:00:00' NOT NULL,
	`tenant_id` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Dhaka' NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`weekly_enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduled_report_settings_tenant_unq` ON `scheduled_report_settings` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `service_board_members` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`joined_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_board_members_tenant_id_idx` ON `service_board_members` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `service_board_members_board_user_unq` ON `service_board_members` (`board_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `service_boards` (
	`id` text PRIMARY KEY NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text NOT NULL,
	`description` text,
	`name` text NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_boards_tenant_id_idx` ON `service_boards` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `service_card_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`event_type` text NOT NULL,
	`from_value` text,
	`metadata_json` text,
	`tenant_id` text NOT NULL,
	`to_value` text,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_card_activity_card_id_idx` ON `service_card_activity` (`card_id`);--> statement-breakpoint
CREATE TABLE `service_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`archived_at` text,
	`assigned_to` text,
	`board_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text NOT NULL,
	`description` text,
	`due_date` text,
	`list_id` text NOT NULL,
	`position_numeric` real DEFAULT 0 NOT NULL,
	`priority` text DEFAULT 'medium',
	`status` text DEFAULT 'open',
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_cards_tenant_id_idx` ON `service_cards` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `service_labels` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`name` text NOT NULL,
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_labels_tenant_id_idx` ON `service_labels` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `service_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`position_numeric` real DEFAULT 0 NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `service_lists_tenant_id_idx` ON `service_lists` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `shipments` (
	`id` text PRIMARY KEY NOT NULL,
	`booked_at` text,
	`cod_amount` real,
	`consignment_id` text,
	`courier` text NOT NULL,
	`courier_response` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`delivered_at` text,
	`delivery_address` text,
	`delivery_fee` real,
	`item_description` text,
	`order_id` text NOT NULL,
	`pickup_address` text,
	`special_instructions` text,
	`status` text DEFAULT 'pending',
	`tenant_id` text NOT NULL,
	`tracking_code` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`weight_kg` real
);
--> statement-breakpoint
CREATE INDEX `shipments_tenant_id_idx` ON `shipments` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `shipments_order_id_idx` ON `shipments` (`order_id`);--> statement-breakpoint
CREATE TABLE `stock_alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`alert_type` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`is_active` integer DEFAULT true,
	`last_triggered_at` text,
	`product_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`threshold` integer NOT NULL,
	`variant_id` text
);
--> statement-breakpoint
CREATE INDEX `stock_alerts_tenant_id_idx` ON `stock_alerts` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`movement_type` text NOT NULL,
	`new_quantity` integer NOT NULL,
	`notes` text,
	`previous_quantity` integer NOT NULL,
	`product_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`reason` text,
	`recorded_by` text,
	`reference_id` text,
	`reference_type` text,
	`tenant_id` text NOT NULL,
	`variant_id` text
);
--> statement-breakpoint
CREATE INDEX `stock_movements_tenant_id_idx` ON `stock_movements` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_id_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE TABLE `subscription_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`billing_cycle` text DEFAULT 'monthly',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`created_by` text,
	`currency` text DEFAULT 'BDT',
	`notes` text,
	`order_number` text NOT NULL,
	`payment_method` text,
	`plan_id` text NOT NULL,
	`status` text DEFAULT 'pending',
	`tenant_id` text NOT NULL,
	`transaction_id` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`verified_at` text,
	`verified_by` text
);
--> statement-breakpoint
CREATE INDEX `subscription_orders_tenant_id_idx` ON `subscription_orders` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_orders_order_number_unq` ON `subscription_orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `support_ticket_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`attachments` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`is_internal_note` integer DEFAULT false,
	`message` text NOT NULL,
	`sender_id` text,
	`sender_type` text NOT NULL,
	`ticket_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `support_ticket_messages_ticket_id_idx` ON `support_ticket_messages` (`ticket_id`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`assigned_to` text,
	`category` text DEFAULT 'general',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`priority` text DEFAULT 'medium',
	`resolved_at` text,
	`resolved_by` text,
	`status` text DEFAULT 'open',
	`subject` text NOT NULL,
	`tenant_id` text,
	`ticket_number` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `support_tickets_tenant_id_idx` ON `support_tickets` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `support_tickets_ticket_number_unq` ON `support_tickets` (`ticket_number`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`description` text,
	`key` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `team_activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_type` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`entity_id` text,
	`entity_type` text,
	`metadata` text,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `team_activity_logs_tenant_id_idx` ON `team_activity_logs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `team_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`accepted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`email` text NOT NULL,
	`expires_at` text NOT NULL,
	`invited_by` text NOT NULL,
	`role` text DEFAULT 'agent' NOT NULL,
	`tenant_id` text NOT NULL,
	`token` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `team_invitations_tenant_id_idx` ON `team_invitations` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitations_token_unq` ON `team_invitations` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_invitations_tenant_email_unq` ON `team_invitations` (`tenant_id`,`email`);--> statement-breakpoint
CREATE TABLE `team_kpi_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metric` text NOT NULL,
	`period` text DEFAULT 'daily' NOT NULL,
	`target_value` real NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`user_id` text
);
--> statement-breakpoint
CREATE INDEX `team_kpi_targets_tenant_id_idx` ON `team_kpi_targets` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `team_member_access` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`resource_id` text NOT NULL,
	`resource_type` text NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `team_member_access_tenant_id_idx` ON `team_member_access` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_access_unq` ON `team_member_access` (`tenant_id`,`user_id`,`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `team_member_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`can_access_ai_agent` integer DEFAULT false,
	`can_access_analytics` integer DEFAULT false,
	`can_access_automation` integer DEFAULT false,
	`can_access_accounts` integer DEFAULT false,
	`can_access_complaints` integer DEFAULT true,
	`can_access_contacts` integer DEFAULT true,
	`can_access_fb_inbox` integer DEFAULT false,
	`can_access_groups` integer DEFAULT false,
	`can_access_inbox` integer DEFAULT true,
	`can_access_internal_chat` integer DEFAULT true,
	`can_access_orders` integer DEFAULT true,
	`can_access_products` integer DEFAULT false,
	`can_access_reports` integer DEFAULT false,
	`can_access_settings` integer DEFAULT false,
	`can_access_team` integer DEFAULT false,
	`can_access_workflows` integer DEFAULT false,
	`can_assign_contacts` integer DEFAULT false,
	`can_create_contacts` integer DEFAULT true,
	`can_create_orders` integer DEFAULT true,
	`can_create_products` integer DEFAULT false,
	`can_delete_contacts` integer DEFAULT false,
	`can_delete_messages` integer DEFAULT false,
	`can_delete_orders` integer DEFAULT false,
	`can_delete_products` integer DEFAULT false,
	`can_edit_contacts` integer DEFAULT true,
	`can_edit_orders` integer DEFAULT false,
	`can_edit_products` integer DEFAULT false,
	`can_export_data` integer DEFAULT false,
	`can_send_bulk_messages` integer DEFAULT false,
	`can_send_messages` integer DEFAULT true,
	`can_update_order_status` integer DEFAULT true,
	`can_update_payment_status` integer DEFAULT false,
	`can_view_revenue` integer DEFAULT false,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_permissions_tenant_user_unq` ON `team_member_permissions` (`tenant_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `team_presence_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`current_page` text,
	`date` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`hour_of_day` integer NOT NULL,
	`recorded_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`status` text NOT NULL,
	`tenant_id` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `team_presence_logs_tenant_id_idx` ON `team_presence_logs` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `team_work_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`break_count` integer DEFAULT 0,
	`conversations_handled` integer DEFAULT 0,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`first_seen_at` text,
	`last_seen_at` text,
	`longest_session_minutes` integer DEFAULT 0,
	`messages_received` integer DEFAULT 0,
	`messages_sent` integer DEFAULT 0,
	`page_activity` text,
	`session_date` text NOT NULL,
	`tenant_id` text NOT NULL,
	`total_active_minutes` integer DEFAULT 0,
	`total_away_minutes` integer DEFAULT 0,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_work_sessions_unq` ON `team_work_sessions` (`tenant_id`,`user_id`,`session_date`);--> statement-breakpoint
CREATE TABLE `tenant_daily_group_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`max_daily_limit` integer DEFAULT 50,
	`members_added` integer DEFAULT 0,
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_daily_group_limits_tenant_date_unq` ON `tenant_daily_group_limits` (`tenant_id`,`date`);--> statement-breakpoint
CREATE TABLE `tenant_expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`color` text DEFAULT 'gray',
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`icon` text DEFAULT 'MoreHorizontal',
	`is_active` integer DEFAULT true,
	`name` text NOT NULL,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `tenant_expense_categories_tenant_id_idx` ON `tenant_expense_categories` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `tenant_expense_categories_tenant_name_unq` ON `tenant_expense_categories` (`tenant_id`,`name`);--> statement-breakpoint
CREATE TABLE `tenant_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`attachment_url` text,
	`category_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`currency` text DEFAULT 'BDT',
	`description` text NOT NULL,
	`expense_date` text NOT NULL,
	`notes` text,
	`payment_method` text,
	`recorded_by` text,
	`reference_number` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`vendor_name` text
);
--> statement-breakpoint
CREATE INDEX `tenant_expenses_tenant_id_idx` ON `tenant_expenses` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `tenant_recurring_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`category_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`currency` text DEFAULT 'BDT',
	`day_of_month` integer,
	`description` text NOT NULL,
	`frequency` text NOT NULL,
	`is_active` integer DEFAULT true,
	`last_generated_at` text,
	`next_due_date` text,
	`notes` text,
	`payment_method` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`vendor_name` text
);
--> statement-breakpoint
CREATE INDEX `tenant_recurring_expenses_tenant_id_idx` ON `tenant_recurring_expenses` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `user_presence` (
	`user_id` text PRIMARY KEY NOT NULL,
	`is_typing_in` text,
	`last_seen_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`status` text DEFAULT 'offline' NOT NULL,
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `whatsapp_auto_message_log` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`message_type` text NOT NULL,
	`sent_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `whatsapp_auto_message_log_tenant_id_idx` ON `whatsapp_auto_message_log` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `whatsapp_auto_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`away_cooldown_hours` integer DEFAULT 24,
	`away_enabled` integer DEFAULT false,
	`away_media_items` text,
	`away_message` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`followup_delay_hours` integer DEFAULT 6,
	`followup_enabled` integer DEFAULT false,
	`followup_media_items` text,
	`followup_message` text,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`welcome_enabled` integer DEFAULT false,
	`welcome_media_items` text,
	`welcome_message` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_auto_messages_tenant_unq` ON `whatsapp_auto_messages` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `whatsapp_followup_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`instance_id` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`skip_reason` text,
	`status` text DEFAULT 'pending',
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `whatsapp_followup_queue_tenant_id_idx` ON `whatsapp_followup_queue` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `whatsapp_group_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`added_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`added_by` text,
	`contact_id` text,
	`group_id` text NOT NULL,
	`is_admin` integer DEFAULT false,
	`phone_number` text NOT NULL,
	`tenant_id` text
);
--> statement-breakpoint
CREATE INDEX `whatsapp_group_participants_group_id_idx` ON `whatsapp_group_participants` (`group_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_group_participants_group_phone_unq` ON `whatsapp_group_participants` (`group_id`,`phone_number`);--> statement-breakpoint
CREATE TABLE `whatsapp_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`description` text,
	`instance_id` text NOT NULL,
	`invite_link` text,
	`is_admin` integer DEFAULT true,
	`name` text NOT NULL,
	`participant_count` integer DEFAULT 0,
	`synced_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`wa_group_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `whatsapp_groups_tenant_id_idx` ON `whatsapp_groups` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `whatsapp_groups_tenant_group_unq` ON `whatsapp_groups` (`tenant_id`,`wa_group_id`);--> statement-breakpoint
CREATE TABLE `woocommerce_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`consumer_key_encrypted` text NOT NULL,
	`consumer_secret_encrypted` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`is_active` integer DEFAULT true,
	`last_sync_at` text,
	`settings` text,
	`store_url` text NOT NULL,
	`sync_error` text,
	`sync_status` text DEFAULT 'idle',
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `woocommerce_integrations_tenant_unq` ON `woocommerce_integrations` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `woocommerce_sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`categories_synced` integer DEFAULT 0,
	`completed_at` text,
	`errors` text,
	`integration_id` text NOT NULL,
	`products_synced` integer DEFAULT 0,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`status` text NOT NULL,
	`sync_type` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `woocommerce_sync_logs_integration_id_idx` ON `woocommerce_sync_logs` (`integration_id`);--> statement-breakpoint
CREATE TABLE `workflow_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`label` text,
	`source_handle` text,
	`source_node_id` text NOT NULL,
	`target_handle` text,
	`target_node_id` text NOT NULL,
	`tenant_id` text,
	`workflow_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflow_edges_workflow_id_idx` ON `workflow_edges` (`workflow_id`);--> statement-breakpoint
CREATE TABLE `workflow_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`completed_at` text,
	`contact_id` text,
	`error_message` text,
	`execution_data` text,
	`started_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`status` text DEFAULT 'running',
	`tenant_id` text NOT NULL,
	`workflow_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflow_executions_tenant_id_idx` ON `workflow_executions` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `workflow_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`node_config` text,
	`node_subtype` text,
	`node_type` text NOT NULL,
	`position_x` real DEFAULT 0,
	`position_y` real DEFAULT 0,
	`tenant_id` text,
	`workflow_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflow_nodes_workflow_id_idx` ON `workflow_nodes` (`workflow_id`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`created_by` text,
	`description` text,
	`is_active` integer DEFAULT false,
	`name` text NOT NULL,
	`tenant_id` text NOT NULL,
	`trigger_config` text,
	`trigger_type` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
--> statement-breakpoint
CREATE INDEX `workflows_tenant_id_idx` ON `workflows` (`tenant_id`);