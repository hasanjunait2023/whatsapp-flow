CREATE TABLE `coupon_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount_discounted` real,
	`coupon_id` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`crypto_request_id` text,
	`payment_id` text,
	`tenant_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupon_redemptions_coupon_tenant_unq` ON `coupon_redemptions` (`coupon_id`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text,
	`discount_type` text NOT NULL,
	`expires_at` text,
	`is_active` integer DEFAULT true NOT NULL,
	`max_uses` integer,
	`note` text,
	`plan_ids` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`used_count` integer DEFAULT 0 NOT NULL,
	`value` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coupons_code_unq` ON `coupons` (`code`);--> statement-breakpoint
CREATE TABLE `crypto_payment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`amount_usd` real NOT NULL,
	`coupon_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`currency` text DEFAULT 'USDT' NOT NULL,
	`expires_at` text NOT NULL,
	`network` text NOT NULL,
	`plan_id` text NOT NULL,
	`review_note` text,
	`reviewed_at` text,
	`reviewed_by` text,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`submitted_at` text,
	`tenant_id` text NOT NULL,
	`txid` text,
	`unique_amount` real NOT NULL,
	`wallet_address` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `crypto_payment_requests_tenant_id_idx` ON `crypto_payment_requests` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `crypto_payment_requests_txid_unq` ON `crypto_payment_requests` (`txid`);--> statement-breakpoint
CREATE INDEX `crypto_payment_requests_status_idx` ON `crypto_payment_requests` (`status`);