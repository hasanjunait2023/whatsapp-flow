CREATE TABLE "admin_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"admin_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"details" jsonb,
	"entity_id" text,
	"entity_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"channels" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"escalation_keywords" jsonb,
	"max_turns_before_handoff" integer DEFAULT 10,
	"model_override" text,
	"reply_delay_ms" integer DEFAULT 8000 NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"working_hours" jsonb
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent" text NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"contact_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"error" text,
	"input_preview" text,
	"latency_ms" integer,
	"output_preview" text,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"tenant_id" text NOT NULL,
	"tool_calls" jsonb,
	"trigger" text
);
--> statement-breakpoint
CREATE TABLE "agent_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"agent" text DEFAULT 'ceo' NOT NULL,
	"cadence" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"hour_utc" integer DEFAULT 9 NOT NULL,
	"last_run_at" text,
	"report_type" text NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_souls" (
	"id" text PRIMARY KEY NOT NULL,
	"approved_at" text,
	"business_profile" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"error_message" text,
	"faqs" jsonb,
	"hours" jsonb,
	"languages" jsonb,
	"policies" jsonb,
	"products_summary" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"system_prompt_cache" text,
	"tenant_id" text NOT NULL,
	"tone" jsonb,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"description" text,
	"image_url" text,
	"is_active" boolean DEFAULT true,
	"name" text NOT NULL,
	"parent_id" text,
	"sort_order" integer DEFAULT 0,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"woo_category_id" integer
);
--> statement-breakpoint
CREATE TABLE "ceo_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"content_md" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"data_snapshot" jsonb,
	"error" text,
	"sent_at" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"label_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_thread_state" (
	"contact_id" text PRIMARY KEY NOT NULL,
	"assigned_to" text,
	"contact_avatar_url" text,
	"contact_name" text,
	"contact_phone" text,
	"contact_type" text DEFAULT 'whatsapp' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"handoff_reason" text,
	"instance_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"label_ids" jsonb,
	"last_inbound_at" text,
	"last_message_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"last_message_direction" text,
	"last_message_preview" text,
	"last_message_type" text,
	"needs_handoff" boolean DEFAULT false NOT NULL,
	"tenant_id" text NOT NULL,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"assigned_to" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"device_typing_at" text,
	"handoff_at" text,
	"handoff_reason" text,
	"instance_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"last_message_at" text,
	"name" text,
	"needs_handoff" boolean DEFAULT false NOT NULL,
	"phone_number" text NOT NULL,
	"profile_pic_synced_at" text,
	"profile_pic_url" text,
	"replying_started_at" text,
	"replying_user_id" text,
	"tenant_id" text NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"wa_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"amount_discounted" double precision,
	"coupon_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"crypto_request_id" text,
	"payment_id" text,
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text,
	"discount_type" text NOT NULL,
	"expires_at" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_uses" integer,
	"note" text,
	"plan_ids" jsonb,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"value" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crypto_payment_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"amount_usd" double precision NOT NULL,
	"coupon_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"currency" text DEFAULT 'USDT' NOT NULL,
	"expires_at" text NOT NULL,
	"network" text NOT NULL,
	"plan_id" text NOT NULL,
	"review_note" text,
	"reviewed_at" text,
	"reviewed_by" text,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"submitted_at" text,
	"tenant_id" text NOT NULL,
	"txid" text,
	"unique_amount" double precision NOT NULL,
	"wallet_address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facebook_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"app_secret" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"last_connected_at" text,
	"ig_account_id" text,
	"ig_connected_at" text,
	"ig_profile_picture_url" text,
	"ig_username" text,
	"page_access_token" text NOT NULL,
	"page_id" text NOT NULL,
	"page_name" text NOT NULL,
	"profile_picture_url" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"tenant_id" text NOT NULL,
	"token_expires_at" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"webhook_verify_token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fb_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"assigned_to" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"handoff_at" text,
	"handoff_reason" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"last_message_at" text,
	"locale" text,
	"name" text,
	"needs_handoff" boolean DEFAULT false NOT NULL,
	"page_id" text NOT NULL,
	"platform" text DEFAULT 'facebook' NOT NULL,
	"profile_pic_synced_at" text,
	"profile_pic_url" text,
	"psid" text NOT NULL,
	"tags" jsonb,
	"tenant_id" text NOT NULL,
	"typing_at" text,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fb_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"attachment_id" text,
	"contact_id" text NOT NULL,
	"content" text,
	"content_type" text DEFAULT 'text' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"delivered_at" text,
	"direction" text NOT NULL,
	"error_message" text,
	"is_from_ai" boolean DEFAULT false NOT NULL,
	"media_filename" text,
	"media_mime_type" text,
	"media_url" text,
	"mid" text,
	"original_media_url" text,
	"page_id" text NOT NULL,
	"quick_reply_payload" text,
	"read_at" text,
	"reply_to_id" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"sent_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"sent_by_user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text NOT NULL,
	"text_preview" text
);
--> statement-breakpoint
CREATE TABLE "job_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"dedupe_key" text,
	"kind" text NOT NULL,
	"last_error" text,
	"payload" jsonb,
	"run_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"tenant_id" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_encrypted" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"is_byok" boolean DEFAULT false NOT NULL,
	"model" text,
	"monthly_token_budget" integer,
	"provider" text,
	"temperature" double precision,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" double precision DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"provider" text NOT NULL,
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_raw_payloads" (
	"message_id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"provider_metadata" jsonb,
	"raw_payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text,
	"category" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"is_active" boolean,
	"name" text NOT NULL,
	"placeholders" jsonb,
	"subject" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text,
	"content" text,
	"content_type" text DEFAULT 'text' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"delivered_at" text,
	"direction" text NOT NULL,
	"error_message" text,
	"instance_id" text,
	"is_from_ai" boolean DEFAULT false NOT NULL,
	"is_synced_from_device" boolean,
	"location_lat" text,
	"location_lng" text,
	"media_filename" text,
	"media_mime_type" text,
	"media_url" text,
	"read_at" text,
	"reply_to_id" text,
	"sender_phone" text,
	"sent_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"sent_by_user_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text NOT NULL,
	"text_preview" text,
	"wa_group_id" text,
	"wa_message_id" text
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"error_message" text,
	"instance_id" text,
	"metadata" jsonb,
	"recipient" text,
	"sent_at" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"discount_amount" double precision DEFAULT 0,
	"notes" text,
	"order_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"product_sku" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"tenant_id" text NOT NULL,
	"total" double precision NOT NULL,
	"unit_price" double precision NOT NULL,
	"variant_id" text,
	"variant_name" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"billing_address" jsonb,
	"cancelled_at" text,
	"contact_id" text,
	"courier" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text,
	"currency" text DEFAULT 'USD' NOT NULL,
	"customer_email" text,
	"customer_name" text,
	"customer_phone" text,
	"delivered_at" text,
	"discount_amount" double precision DEFAULT 0,
	"internal_notes" text,
	"notes" text,
	"order_number" text NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"shipped_at" text,
	"shipping_address" jsonb,
	"shipping_amount" double precision DEFAULT 0,
	"source" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"subtotal" double precision DEFAULT 0 NOT NULL,
	"tax_amount" double precision DEFAULT 0,
	"tenant_id" text NOT NULL,
	"total" double precision DEFAULT 0 NOT NULL,
	"tracking_number" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"woo_order_id" integer
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" double precision NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"gateway_response" jsonb,
	"notes" text,
	"payment_gateway" text,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"subscription_id" text,
	"tenant_id" text NOT NULL,
	"transaction_id" text,
	"uddoktapay_invoice_id" text,
	"verified_at" text,
	"verified_by" text
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY NOT NULL,
	"ai_enabled" boolean DEFAULT false NOT NULL,
	"business_type_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"description" text,
	"features" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_agents" integer DEFAULT 1 NOT NULL,
	"max_instances" integer DEFAULT 1 NOT NULL,
	"max_messages_per_month" integer DEFAULT 1000 NOT NULL,
	"max_pages" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"price_monthly" double precision DEFAULT 0 NOT NULL,
	"price_yearly" double precision,
	"tier" text,
	"tier_order" integer,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"compare_at_price" double precision,
	"cost_price" double precision,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"images" jsonb,
	"is_active" boolean DEFAULT true,
	"low_stock_threshold" integer DEFAULT 5,
	"name" text NOT NULL,
	"options" jsonb,
	"position" integer DEFAULT 0,
	"price" double precision,
	"product_id" text NOT NULL,
	"sku" text,
	"stock_quantity" integer DEFAULT 0,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"woo_variant_id" integer
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text,
	"compare_at_price" double precision,
	"cost_price" double precision,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"description" text,
	"images" jsonb,
	"is_active" boolean DEFAULT true,
	"low_stock_threshold" integer DEFAULT 5,
	"name" text NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"sku" text,
	"stock_quantity" integer DEFAULT 0,
	"tags" jsonb,
	"tenant_id" text NOT NULL,
	"track_inventory" boolean DEFAULT true,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"variant_options" jsonb,
	"variants" jsonb,
	"woo_last_synced_at" text,
	"woo_product_id" integer
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"avatar_url" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text,
	"email" text,
	"full_name" text,
	"phone_number" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"tenant_id" text NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"content_type" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"media_filename" text,
	"media_items" jsonb,
	"media_url" text,
	"shortcut" text,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soul_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"content_text" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"error" text,
	"fetched_at" text,
	"soul_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL,
	"url" text
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"cancelled_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"current_period_end" text NOT NULL,
	"current_period_start" text NOT NULL,
	"feature_overrides" jsonb,
	"grace_period_ends_at" text,
	"plan_id" text NOT NULL,
	"resource_overrides" jsonb,
	"status" text DEFAULT 'trialing' NOT NULL,
	"tenant_id" text NOT NULL,
	"trial_ends_at" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"granted_at" text,
	"granted_by" text,
	"is_super_admin" boolean,
	"permissions" jsonb,
	"role" text DEFAULT 'user' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"expires_at" text NOT NULL,
	"link_code" text NOT NULL,
	"linked_at" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_daily_stats" (
	"tenant_id" text NOT NULL,
	"stat_date" text NOT NULL,
	"active_conversations" integer DEFAULT 0 NOT NULL,
	"fb_inbound" integer DEFAULT 0 NOT NULL,
	"fb_outbound" integer DEFAULT 0 NOT NULL,
	"inbound_count" integer DEFAULT 0 NOT NULL,
	"new_conversations" integer DEFAULT 0 NOT NULL,
	"outbound_count" integer DEFAULT 0 NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"wa_inbound" integer DEFAULT 0 NOT NULL,
	"wa_outbound" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tenant_daily_stats_tenant_id_stat_date_pk" PRIMARY KEY("tenant_id","stat_date")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"activated_at" text,
	"activated_by" text,
	"business_type_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"is_activated" boolean DEFAULT false,
	"logo_url" text,
	"name" text NOT NULL,
	"onboarding_status" jsonb,
	"owner_id" text NOT NULL,
	"pending_plan_id" text,
	"settings" jsonb,
	"slug" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" text PRIMARY KEY NOT NULL,
	"ai_messages" integer DEFAULT 0 NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"messages_received" integer DEFAULT 0 NOT NULL,
	"messages_sent" integer DEFAULT 0 NOT NULL,
	"period_end" text NOT NULL,
	"period_start" text NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events_log" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"error" text,
	"event_type" text NOT NULL,
	"instance_id" text,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
CREATE TABLE "whatsapp_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key_encrypted" text,
	"connection_error" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"deleted_at" text,
	"device_info" jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean,
	"last_connected_at" text,
	"last_qr_sent_at" text,
	"last_status_at" text,
	"name" text NOT NULL,
	"phone_number" text,
	"qr_code" text,
	"qr_expires_at" text,
	"session_id" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"wasender_session_id" text,
	"webhook_secret" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_access_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"permissions" jsonb,
	"reason" text,
	"requested_by" text NOT NULL,
	"review_notes" text,
	"reviewed_at" text,
	"reviewed_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_customer_journey" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description_bn" text,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"event_category" text,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"title_bn" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_marketing_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"alternate_channels" boolean DEFAULT true,
	"blackout_hours" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"created_by" text,
	"frequency_per_month" integer DEFAULT 4,
	"frequency_per_week" integer DEFAULT 1,
	"max_discount_percent" integer DEFAULT 10,
	"min_days_between_messages" integer DEFAULT 2,
	"name" text NOT NULL,
	"name_bn" text,
	"status" text DEFAULT 'draft',
	"target_audience" jsonb,
	"target_tier" jsonb,
	"type" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"use_email" boolean DEFAULT true,
	"use_whatsapp" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "admin_marketing_enrollments" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"completed_at" text,
	"current_step" integer DEFAULT 0,
	"current_week" integer DEFAULT 1,
	"enrolled_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"last_message_at" text,
	"messages_this_month" integer DEFAULT 0,
	"messages_this_week" integer DEFAULT 0,
	"metadata" jsonb,
	"month_reset_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"next_message_at" text,
	"status" text DEFAULT 'active',
	"total_messages_sent" integer DEFAULT 0,
	"unsubscribed_at" text,
	"week_reset_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "admin_marketing_sends" (
	"id" text PRIMARY KEY NOT NULL,
	"ai_generated" boolean DEFAULT false,
	"channel" text NOT NULL,
	"clicked_at" text,
	"content" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"delivered_at" text,
	"enrollment_id" text NOT NULL,
	"error_message" text,
	"opened_at" text,
	"sent_at" text,
	"sequence_id" text NOT NULL,
	"status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "admin_marketing_sequences" (
	"id" text PRIMARY KEY NOT NULL,
	"ai_personalize" boolean DEFAULT false,
	"campaign_id" text NOT NULL,
	"channel" text NOT NULL,
	"content_template" jsonb NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"day_of_week" integer,
	"discount_percent" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"name" text NOT NULL,
	"name_bn" text,
	"step_order" integer NOT NULL,
	"theme" text,
	"week_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"entity_id" text,
	"entity_type" text,
	"is_read" boolean DEFAULT false,
	"message" text,
	"metadata" jsonb,
	"tenant_id" text,
	"title" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"assigned_by" text,
	"assigned_to" text,
	"completed_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"due_date" text,
	"priority" text DEFAULT 'medium',
	"related_tenant_id" text,
	"related_ticket_id" text,
	"status" text DEFAULT 'todo',
	"title" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"action_config" jsonb NOT NULL,
	"action_type" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"tenant_id" text NOT NULL,
	"trigger_config" jsonb NOT NULL,
	"trigger_type" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_type_features" (
	"id" text PRIMARY KEY NOT NULL,
	"business_type_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"display_order" integer DEFAULT 0,
	"feature_description" text,
	"feature_key" text NOT NULL,
	"feature_label" text NOT NULL,
	"feature_label_bn" text,
	"icon" text,
	"is_core" boolean DEFAULT true,
	"min_tier" text DEFAULT 'starter'
);
--> statement-breakpoint
CREATE TABLE "business_types" (
	"id" text PRIMARY KEY NOT NULL,
	"color" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"display_order" integer DEFAULT 0,
	"icon" text,
	"is_active" boolean DEFAULT true,
	"name" text NOT NULL,
	"name_bn" text,
	"slug" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"assigned_to" text,
	"category" text DEFAULT 'other' NOT NULL,
	"contact_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"description" text NOT NULL,
	"order_id" text,
	"priority" text DEFAULT 'medium' NOT NULL,
	"reported_by" text NOT NULL,
	"resolution_notes" text,
	"resolved_at" text,
	"resolved_by" text,
	"status" text DEFAULT 'open' NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"assigned_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"assigned_by" text,
	"assignment_reason" text,
	"contact_id" text NOT NULL,
	"segment_id" text NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
CREATE TABLE "courier_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"api_key" text,
	"api_secret" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"default_pickup_address" jsonb,
	"is_active" boolean DEFAULT true,
	"provider" text NOT NULL,
	"settings" jsonb,
	"store_id" text,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "customer_journey_events" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text,
	"description" text,
	"event_category" text NOT NULL,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"avg_order_value" double precision DEFAULT 0,
	"contact_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"first_order_date" text,
	"last_calculated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"last_order_date" text,
	"message_count" integer DEFAULT 0,
	"score" integer DEFAULT 0,
	"score_tier" text DEFAULT 'new',
	"tenant_id" text NOT NULL,
	"total_orders" integer DEFAULT 0,
	"total_spent" double precision DEFAULT 0,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "customer_scoring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"criteria_type" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"name" text NOT NULL,
	"operator" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"tenant_id" text NOT NULL,
	"value_max" double precision,
	"value_min" double precision
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"color" text DEFAULT '#3B82F6',
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"icon" text DEFAULT 'users',
	"is_active" boolean DEFAULT true,
	"is_auto" boolean DEFAULT false,
	"name" text NOT NULL,
	"rules" jsonb,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"color" text DEFAULT 'gray',
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"icon" text,
	"is_active" boolean DEFAULT true,
	"name" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" double precision NOT NULL,
	"attachment_url" text,
	"category_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"currency" text DEFAULT 'BDT',
	"description" text NOT NULL,
	"expense_date" text NOT NULL,
	"notes" text,
	"payment_method" text,
	"recorded_by" text,
	"reference_number" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"vendor_name" text
);
--> statement-breakpoint
CREATE TABLE "external_sales_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" double precision NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"business_name" text NOT NULL,
	"business_type" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"currency" text DEFAULT 'BDT' NOT NULL,
	"customer_email" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"error_message" text,
	"external_order_id" text NOT NULL,
	"payment_method" text,
	"plan_id" text,
	"processed_at" text,
	"raw_payload" jsonb,
	"source" text DEFAULT 'main_website' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text,
	"transaction_id" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "fb_contact_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"label_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fb_post_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"attachment_type" text,
	"attachment_url" text,
	"commenter_fb_id" text NOT NULL,
	"commenter_name" text,
	"commenter_picture_url" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"created_time" text,
	"fb_comment_id" text NOT NULL,
	"fb_contact_id" text,
	"is_from_page" boolean DEFAULT false,
	"is_hidden" boolean DEFAULT false,
	"is_read" boolean DEFAULT false,
	"like_count" integer DEFAULT 0,
	"message" text,
	"page_id" text NOT NULL,
	"parent_comment_id" text,
	"platform" text DEFAULT 'facebook' NOT NULL,
	"post_id" text NOT NULL,
	"reply_count" integer DEFAULT 0,
	"sent_by_user_id" text,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "fb_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_count" integer DEFAULT 0,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"created_time" text,
	"fb_post_id" text NOT NULL,
	"full_picture" text,
	"is_hidden" boolean DEFAULT false,
	"last_comment_at" text,
	"message" text,
	"page_id" text NOT NULL,
	"permalink_url" text,
	"post_type" text DEFAULT 'status',
	"tenant_id" text NOT NULL,
	"unread_comment_count" integer DEFAULT 0,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "feature_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"display_order" integer DEFAULT 0,
	"icon" text,
	"name" text NOT NULL,
	"name_bn" text
);
--> statement-breakpoint
CREATE TABLE "group_add_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_size" integer DEFAULT 5,
	"completed_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"created_by" text,
	"error_log" jsonb,
	"failed_count" integer DEFAULT 0,
	"group_id" text NOT NULL,
	"interval_minutes" integer DEFAULT 30,
	"phone_numbers" jsonb NOT NULL,
	"processed_count" integer DEFAULT 0,
	"scheduled_for" text NOT NULL,
	"status" text DEFAULT 'pending',
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_app_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"entity_id" text,
	"entity_type" text,
	"is_read" boolean DEFAULT false,
	"message" text,
	"metadata" jsonb,
	"read_at" text,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "internal_chat_members" (
	"id" text PRIMARY KEY NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"joined_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"last_read_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"room_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_chat_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text,
	"name" text,
	"tenant_id" text NOT NULL,
	"type" text DEFAULT 'direct' NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text,
	"content_type" text DEFAULT 'text' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"edited_at" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"media_filename" text,
	"media_url" text,
	"mentions" jsonb,
	"reply_to_id" text,
	"room_id" text NOT NULL,
	"sender_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"company_address" text,
	"company_email" text,
	"company_name" text,
	"company_phone" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"footer_text" text,
	"invoice_prefix" text DEFAULT 'INV-',
	"logo_url" text,
	"next_invoice_number" integer DEFAULT 1,
	"tax_id" text,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"invoice_number" text NOT NULL,
	"order_id" text,
	"pdf_url" text,
	"sent_at" text,
	"sent_via_whatsapp" boolean DEFAULT false,
	"tenant_id" text NOT NULL,
	"total" double precision
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" text PRIMARY KEY NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"name" text NOT NULL,
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"demo_access_count" integer DEFAULT 0,
	"demo_accessed_at" text,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"notes" text,
	"source" text DEFAULT 'demo_request',
	"status" text DEFAULT 'warm',
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"whatsapp_number" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"error_message" text,
	"instance_id" text,
	"metadata" jsonb,
	"next_retry_at" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"step" text,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text,
	"notes" text,
	"order_id" text NOT NULL,
	"status" text NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
CREATE TABLE "permission_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"is_system" boolean DEFAULT false,
	"name" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
CREATE TABLE "purchase_behavior_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"cancelled_deliveries" integer DEFAULT 0,
	"checked_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"checked_by" text,
	"contact_id" text,
	"courier_stats" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"customer_rating" double precision,
	"phone_number" text NOT NULL,
	"raw_response" jsonb,
	"returned_deliveries" integer DEFAULT 0,
	"risk_level" text,
	"successful_deliveries" integer DEFAULT 0,
	"tenant_id" text NOT NULL,
	"total_deliveries" integer DEFAULT 0,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" double precision NOT NULL,
	"category_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"currency" text DEFAULT 'BDT',
	"day_of_month" integer DEFAULT 1,
	"description" text NOT NULL,
	"frequency" text DEFAULT 'monthly' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_generated_at" text,
	"next_due_date" text NOT NULL,
	"notes" text,
	"payment_method" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"vendor_name" text
);
--> statement-breakpoint
CREATE TABLE "reminder_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"error_message" text,
	"reminder_type" text NOT NULL,
	"sent_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"status" text DEFAULT 'pending' NOT NULL,
	"subscription_id" text,
	"tenant_id" text
);
--> statement-breakpoint
CREATE TABLE "reminder_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'both' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"days_offset" jsonb NOT NULL,
	"email_subject" text,
	"is_active" boolean DEFAULT true,
	"reminder_type" text NOT NULL,
	"template_id" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "scheduled_report_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"error_message" text,
	"report_data" jsonb,
	"report_type" text NOT NULL,
	"sent_at" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_report_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"daily_enabled" boolean DEFAULT true NOT NULL,
	"monthly_enabled" boolean DEFAULT true NOT NULL,
	"send_time" text DEFAULT '20:00:00' NOT NULL,
	"tenant_id" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Dhaka' NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"weekly_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_board_members" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"joined_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_boards" (
	"id" text PRIMARY KEY NOT NULL,
	"archived_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text NOT NULL,
	"description" text,
	"name" text NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_card_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"event_type" text NOT NULL,
	"from_value" text,
	"metadata_json" jsonb,
	"tenant_id" text NOT NULL,
	"to_value" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"archived_at" text,
	"assigned_to" text,
	"board_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"created_by" text NOT NULL,
	"description" text,
	"due_date" text,
	"list_id" text NOT NULL,
	"position_numeric" double precision DEFAULT 0 NOT NULL,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'open',
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_labels" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"color" text DEFAULT '#6366f1' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"name" text NOT NULL,
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_lists" (
	"id" text PRIMARY KEY NOT NULL,
	"board_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"position_numeric" double precision DEFAULT 0 NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"booked_at" text,
	"cod_amount" double precision,
	"consignment_id" text,
	"courier" text NOT NULL,
	"courier_response" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"delivered_at" text,
	"delivery_address" jsonb,
	"delivery_fee" double precision,
	"item_description" text,
	"order_id" text NOT NULL,
	"pickup_address" jsonb,
	"special_instructions" text,
	"status" text DEFAULT 'pending',
	"tenant_id" text NOT NULL,
	"tracking_code" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"weight_kg" double precision
);
--> statement-breakpoint
CREATE TABLE "stock_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"alert_type" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_triggered_at" text,
	"product_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"threshold" integer NOT NULL,
	"variant_id" text
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"movement_type" text NOT NULL,
	"new_quantity" integer NOT NULL,
	"notes" text,
	"previous_quantity" integer NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text,
	"recorded_by" text,
	"reference_id" text,
	"reference_type" text,
	"tenant_id" text NOT NULL,
	"variant_id" text
);
--> statement-breakpoint
CREATE TABLE "subscription_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" double precision NOT NULL,
	"billing_cycle" text DEFAULT 'monthly',
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"created_by" text,
	"currency" text DEFAULT 'BDT',
	"notes" text,
	"order_number" text NOT NULL,
	"payment_method" text,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'pending',
	"tenant_id" text NOT NULL,
	"transaction_id" text,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"verified_at" text,
	"verified_by" text
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"attachments" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"is_internal_note" boolean DEFAULT false,
	"message" text NOT NULL,
	"sender_id" text,
	"sender_type" text NOT NULL,
	"ticket_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"assigned_to" text,
	"category" text DEFAULT 'general',
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"priority" text DEFAULT 'medium',
	"resolved_at" text,
	"resolved_by" text,
	"status" text DEFAULT 'open',
	"subject" text NOT NULL,
	"tenant_id" text,
	"ticket_number" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"description" text,
	"key" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"value" jsonb
);
--> statement-breakpoint
CREATE TABLE "team_activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_type" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"entity_id" text,
	"entity_type" text,
	"metadata" jsonb,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"accepted_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"email" text NOT NULL,
	"expires_at" text NOT NULL,
	"invited_by" text NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"tenant_id" text NOT NULL,
	"token" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_kpi_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metric" text NOT NULL,
	"period" text DEFAULT 'daily' NOT NULL,
	"target_value" double precision NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "team_member_access" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"resource_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"can_access_ai_agent" boolean DEFAULT false,
	"can_access_analytics" boolean DEFAULT false,
	"can_access_automation" boolean DEFAULT false,
	"can_access_accounts" boolean DEFAULT false,
	"can_access_complaints" boolean DEFAULT true,
	"can_access_contacts" boolean DEFAULT true,
	"can_access_fb_inbox" boolean DEFAULT false,
	"can_access_groups" boolean DEFAULT false,
	"can_access_inbox" boolean DEFAULT true,
	"can_access_internal_chat" boolean DEFAULT true,
	"can_access_orders" boolean DEFAULT true,
	"can_access_products" boolean DEFAULT false,
	"can_access_reports" boolean DEFAULT false,
	"can_access_settings" boolean DEFAULT false,
	"can_access_team" boolean DEFAULT false,
	"can_access_workflows" boolean DEFAULT false,
	"can_assign_contacts" boolean DEFAULT false,
	"can_create_contacts" boolean DEFAULT true,
	"can_create_orders" boolean DEFAULT true,
	"can_create_products" boolean DEFAULT false,
	"can_delete_contacts" boolean DEFAULT false,
	"can_delete_messages" boolean DEFAULT false,
	"can_delete_orders" boolean DEFAULT false,
	"can_delete_products" boolean DEFAULT false,
	"can_edit_contacts" boolean DEFAULT true,
	"can_edit_orders" boolean DEFAULT false,
	"can_edit_products" boolean DEFAULT false,
	"can_export_data" boolean DEFAULT false,
	"can_send_bulk_messages" boolean DEFAULT false,
	"can_send_messages" boolean DEFAULT true,
	"can_update_order_status" boolean DEFAULT true,
	"can_update_payment_status" boolean DEFAULT false,
	"can_view_revenue" boolean DEFAULT false,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_presence_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"current_page" text,
	"date" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"hour_of_day" integer NOT NULL,
	"recorded_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"status" text NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_work_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"break_count" integer DEFAULT 0,
	"conversations_handled" integer DEFAULT 0,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"first_seen_at" text,
	"last_seen_at" text,
	"longest_session_minutes" integer DEFAULT 0,
	"messages_received" integer DEFAULT 0,
	"messages_sent" integer DEFAULT 0,
	"page_activity" jsonb,
	"session_date" text NOT NULL,
	"tenant_id" text NOT NULL,
	"total_active_minutes" integer DEFAULT 0,
	"total_away_minutes" integer DEFAULT 0,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_daily_group_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"max_daily_limit" integer DEFAULT 50,
	"members_added" integer DEFAULT 0,
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_expense_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"color" text DEFAULT 'gray',
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"icon" text DEFAULT 'MoreHorizontal',
	"is_active" boolean DEFAULT true,
	"name" text NOT NULL,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "tenant_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" double precision NOT NULL,
	"attachment_url" text,
	"category_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"currency" text DEFAULT 'BDT',
	"description" text NOT NULL,
	"expense_date" text NOT NULL,
	"notes" text,
	"payment_method" text,
	"recorded_by" text,
	"reference_number" text,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"vendor_name" text
);
--> statement-breakpoint
CREATE TABLE "tenant_recurring_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" double precision NOT NULL,
	"category_id" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"currency" text DEFAULT 'BDT',
	"day_of_month" integer,
	"description" text NOT NULL,
	"frequency" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_generated_at" text,
	"next_due_date" text,
	"notes" text,
	"payment_method" text,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"vendor_name" text
);
--> statement-breakpoint
CREATE TABLE "user_presence" (
	"user_id" text PRIMARY KEY NOT NULL,
	"is_typing_in" text,
	"last_seen_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_auto_message_log" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"message_type" text NOT NULL,
	"sent_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_auto_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"away_cooldown_hours" integer DEFAULT 24,
	"away_enabled" boolean DEFAULT false,
	"away_media_items" jsonb,
	"away_message" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"followup_delay_hours" integer DEFAULT 6,
	"followup_enabled" boolean DEFAULT false,
	"followup_media_items" jsonb,
	"followup_message" text,
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"welcome_enabled" boolean DEFAULT false,
	"welcome_media_items" jsonb,
	"welcome_message" text
);
--> statement-breakpoint
CREATE TABLE "whatsapp_followup_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"contact_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"instance_id" text NOT NULL,
	"scheduled_for" text NOT NULL,
	"skip_reason" text,
	"status" text DEFAULT 'pending',
	"tenant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_group_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"added_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"added_by" text,
	"contact_id" text,
	"group_id" text NOT NULL,
	"is_admin" boolean DEFAULT false,
	"phone_number" text NOT NULL,
	"tenant_id" text
);
--> statement-breakpoint
CREATE TABLE "whatsapp_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"description" text,
	"instance_id" text NOT NULL,
	"invite_link" text,
	"is_admin" boolean DEFAULT true,
	"name" text NOT NULL,
	"participant_count" integer DEFAULT 0,
	"synced_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"wa_group_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "woocommerce_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"consumer_key_encrypted" text NOT NULL,
	"consumer_secret_encrypted" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_sync_at" text,
	"settings" jsonb,
	"store_url" text NOT NULL,
	"sync_error" text,
	"sync_status" text DEFAULT 'idle',
	"tenant_id" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "woocommerce_sync_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"categories_synced" integer DEFAULT 0,
	"completed_at" text,
	"errors" jsonb,
	"integration_id" text NOT NULL,
	"products_synced" integer DEFAULT 0,
	"started_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"status" text NOT NULL,
	"sync_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"label" text,
	"source_handle" text,
	"source_node_id" text NOT NULL,
	"target_handle" text,
	"target_node_id" text NOT NULL,
	"tenant_id" text,
	"workflow_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"completed_at" text,
	"contact_id" text,
	"error_message" text,
	"execution_data" jsonb,
	"started_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"status" text DEFAULT 'running',
	"tenant_id" text NOT NULL,
	"workflow_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"node_config" jsonb,
	"node_subtype" text,
	"node_type" text NOT NULL,
	"position_x" double precision DEFAULT 0,
	"position_y" double precision DEFAULT 0,
	"tenant_id" text,
	"workflow_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
	"created_by" text,
	"description" text,
	"is_active" boolean DEFAULT false,
	"name" text NOT NULL,
	"tenant_id" text NOT NULL,
	"trigger_config" jsonb,
	"trigger_type" text NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_configs_tenant_agent_unq" ON "agent_configs" USING btree ("tenant_id","agent");--> statement-breakpoint
CREATE INDEX "agent_runs_tenant_created_idx" ON "agent_runs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_schedules_tenant_type_unq" ON "agent_schedules" USING btree ("tenant_id","agent","report_type");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_souls_tenant_unq" ON "agent_souls" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "categories_tenant_id_idx" ON "categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ceo_reports_tenant_created_idx" ON "ceo_reports" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_labels_contact_id_idx" ON "contact_labels" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_thread_state_tenant_id_last_message_at_idx" ON "contact_thread_state" USING btree ("tenant_id","last_message_at");--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_idx" ON "contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contacts_instance_id_wa_id_idx" ON "contacts" USING btree ("instance_id","wa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupon_redemptions_coupon_tenant_unq" ON "coupon_redemptions" USING btree ("coupon_id","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_unq" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "crypto_payment_requests_tenant_id_idx" ON "crypto_payment_requests" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crypto_payment_requests_txid_unq" ON "crypto_payment_requests" USING btree ("txid");--> statement-breakpoint
CREATE INDEX "crypto_payment_requests_status_idx" ON "crypto_payment_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "facebook_pages_tenant_id_idx" ON "facebook_pages" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "facebook_pages_tenant_page_unq" ON "facebook_pages" USING btree ("tenant_id","page_id");--> statement-breakpoint
CREATE INDEX "fb_contacts_tenant_id_idx" ON "fb_contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_contacts_page_psid_unq" ON "fb_contacts" USING btree ("page_id","psid");--> statement-breakpoint
CREATE INDEX "fb_messages_tenant_id_idx" ON "fb_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_messages_mid_unq" ON "fb_messages" USING btree ("mid");--> statement-breakpoint
CREATE INDEX "fb_messages_contact_id_created_at_idx" ON "fb_messages" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE INDEX "job_queue_status_run_at_idx" ON "job_queue" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "job_queue_dedupe_key_idx" ON "job_queue" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "llm_settings_tenant_unq" ON "llm_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "llm_usage_events_tenant_created_idx" ON "llm_usage_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "message_templates_tenant_id_idx" ON "message_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "messages_tenant_id_idx" ON "messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_wa_message_id_unq" ON "messages" USING btree ("wa_message_id");--> statement-breakpoint
CREATE INDEX "messages_contact_id_created_at_idx" ON "messages" USING btree ("contact_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_tenant_id_idx" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_tenant_id_idx" ON "order_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "orders_tenant_id_idx" ON "orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "orders_contact_id_idx" ON "orders" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_id_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "product_variants_tenant_id_idx" ON "product_variants" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_tenant_id_idx" ON "products" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_unq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_tenant_id_idx" ON "push_subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "quick_replies_tenant_id_idx" ON "quick_replies" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "soul_sources_tenant_id_idx" ON "soul_sources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "soul_sources_soul_id_idx" ON "soul_sources" USING btree ("soul_id");--> statement-breakpoint
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "system_roles_user_id_idx" ON "system_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_links_link_code_unq" ON "telegram_links" USING btree ("link_code");--> statement-breakpoint
CREATE INDEX "telegram_links_tenant_id_idx" ON "telegram_links" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_counters_tenant_period_unq" ON "usage_counters" USING btree ("tenant_id","period_start");--> statement-breakpoint
CREATE INDEX "user_roles_tenant_id_idx" ON "user_roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_user_tenant_unq" ON "user_roles" USING btree ("user_id","tenant_id");--> statement-breakpoint
CREATE INDEX "webhook_events_log_instance_id_idx" ON "webhook_events_log" USING btree ("instance_id");--> statement-breakpoint
CREATE INDEX "whatsapp_instances_tenant_id_idx" ON "whatsapp_instances" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "admin_access_requests_user_id_idx" ON "admin_access_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "automation_rules_tenant_id_idx" ON "automation_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "business_type_features_type_idx" ON "business_type_features" USING btree ("business_type_id");--> statement-breakpoint
CREATE INDEX "complaints_tenant_id_idx" ON "complaints" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contact_segments_contact_id_idx" ON "contact_segments" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_segments_contact_segment_unq" ON "contact_segments" USING btree ("contact_id","segment_id");--> statement-breakpoint
CREATE INDEX "courier_integrations_tenant_id_idx" ON "courier_integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courier_integrations_tenant_provider_unq" ON "courier_integrations" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE INDEX "customer_journey_events_tenant_id_idx" ON "customer_journey_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customer_journey_events_contact_id_idx" ON "customer_journey_events" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "customer_scores_tenant_id_idx" ON "customer_scores" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_scores_contact_unq" ON "customer_scores" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "customer_scoring_rules_tenant_id_idx" ON "customer_scoring_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "customer_segments_tenant_id_idx" ON "customer_segments" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_segments_tenant_name_unq" ON "customer_segments" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "external_sales_orders_external_order_unq" ON "external_sales_orders" USING btree ("external_order_id","source");--> statement-breakpoint
CREATE INDEX "fb_contact_labels_contact_id_idx" ON "fb_contact_labels" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_contact_labels_contact_label_unq" ON "fb_contact_labels" USING btree ("contact_id","label_id");--> statement-breakpoint
CREATE INDEX "fb_post_comments_tenant_id_idx" ON "fb_post_comments" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_post_comments_comment_unq" ON "fb_post_comments" USING btree ("fb_comment_id");--> statement-breakpoint
CREATE INDEX "fb_posts_tenant_id_idx" ON "fb_posts" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fb_posts_page_post_unq" ON "fb_posts" USING btree ("page_id","fb_post_id");--> statement-breakpoint
CREATE INDEX "group_add_queue_tenant_id_idx" ON "group_add_queue" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "in_app_notifications_tenant_id_idx" ON "in_app_notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "internal_chat_members_room_user_unq" ON "internal_chat_members" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX "internal_chat_rooms_tenant_id_idx" ON "internal_chat_rooms" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "internal_messages_room_id_idx" ON "internal_messages" USING btree ("room_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_settings_tenant_unq" ON "invoice_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoices_tenant_id_idx" ON "invoices" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "labels_tenant_id_idx" ON "labels" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "labels_tenant_name_unq" ON "labels" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "onboarding_jobs_tenant_id_idx" ON "onboarding_jobs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "permission_templates_tenant_id_idx" ON "permission_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "purchase_behavior_checks_tenant_id_idx" ON "purchase_behavior_checks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reminder_logs_tenant_id_idx" ON "reminder_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "scheduled_report_logs_tenant_id_idx" ON "scheduled_report_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_report_settings_tenant_unq" ON "scheduled_report_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_board_members_tenant_id_idx" ON "service_board_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_board_members_board_user_unq" ON "service_board_members" USING btree ("board_id","user_id");--> statement-breakpoint
CREATE INDEX "service_boards_tenant_id_idx" ON "service_boards" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_card_activity_card_id_idx" ON "service_card_activity" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "service_cards_tenant_id_idx" ON "service_cards" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_labels_tenant_id_idx" ON "service_labels" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "service_lists_tenant_id_idx" ON "service_lists" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shipments_tenant_id_idx" ON "shipments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shipments_order_id_idx" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stock_alerts_tenant_id_idx" ON "stock_alerts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_tenant_id_idx" ON "stock_movements" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "subscription_orders_tenant_id_idx" ON "subscription_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_orders_order_number_unq" ON "subscription_orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_tickets_tenant_id_idx" ON "support_tickets" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_ticket_number_unq" ON "support_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "team_activity_logs_tenant_id_idx" ON "team_activity_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "team_invitations_tenant_id_idx" ON "team_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_token_unq" ON "team_invitations" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "team_invitations_tenant_email_unq" ON "team_invitations" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "team_kpi_targets_tenant_id_idx" ON "team_kpi_targets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "team_member_access_tenant_id_idx" ON "team_member_access" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_access_unq" ON "team_member_access" USING btree ("tenant_id","user_id","resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_permissions_tenant_user_unq" ON "team_member_permissions" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "team_presence_logs_tenant_id_idx" ON "team_presence_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_work_sessions_unq" ON "team_work_sessions" USING btree ("tenant_id","user_id","session_date");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_daily_group_limits_tenant_date_unq" ON "tenant_daily_group_limits" USING btree ("tenant_id","date");--> statement-breakpoint
CREATE INDEX "tenant_expense_categories_tenant_id_idx" ON "tenant_expense_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_expense_categories_tenant_name_unq" ON "tenant_expense_categories" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "tenant_expenses_tenant_id_idx" ON "tenant_expenses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tenant_recurring_expenses_tenant_id_idx" ON "tenant_recurring_expenses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "whatsapp_auto_message_log_tenant_id_idx" ON "whatsapp_auto_message_log" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_auto_messages_tenant_unq" ON "whatsapp_auto_messages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "whatsapp_followup_queue_tenant_id_idx" ON "whatsapp_followup_queue" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "whatsapp_group_participants_group_id_idx" ON "whatsapp_group_participants" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_group_participants_group_phone_unq" ON "whatsapp_group_participants" USING btree ("group_id","phone_number");--> statement-breakpoint
CREATE INDEX "whatsapp_groups_tenant_id_idx" ON "whatsapp_groups" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_groups_tenant_group_unq" ON "whatsapp_groups" USING btree ("tenant_id","wa_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "woocommerce_integrations_tenant_unq" ON "woocommerce_integrations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "woocommerce_sync_logs_integration_id_idx" ON "woocommerce_sync_logs" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "workflow_edges_workflow_id_idx" ON "workflow_edges" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_tenant_id_idx" ON "workflow_executions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflow_nodes_workflow_id_idx" ON "workflow_nodes" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflows_tenant_id_idx" ON "workflows" USING btree ("tenant_id");