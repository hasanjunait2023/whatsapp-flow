CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`description` text,
	`image_url` text,
	`is_active` integer DEFAULT true,
	`name` text NOT NULL,
	`parent_id` text,
	`sort_order` integer DEFAULT 0,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`woo_category_id` integer
);
--> statement-breakpoint
CREATE INDEX `categories_tenant_id_idx` ON `categories` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`discount_amount` real DEFAULT 0,
	`notes` text,
	`order_id` text NOT NULL,
	`product_id` text,
	`product_name` text NOT NULL,
	`product_sku` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`tenant_id` text NOT NULL,
	`total` real NOT NULL,
	`unit_price` real NOT NULL,
	`variant_id` text,
	`variant_name` text
);
--> statement-breakpoint
CREATE INDEX `order_items_order_id_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `order_items_tenant_id_idx` ON `order_items` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`billing_address` text,
	`cancelled_at` text,
	`contact_id` text,
	`courier` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`created_by` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`customer_email` text,
	`customer_name` text,
	`customer_phone` text,
	`delivered_at` text,
	`discount_amount` real DEFAULT 0,
	`internal_notes` text,
	`notes` text,
	`order_number` text NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`shipped_at` text,
	`shipping_address` text,
	`shipping_amount` real DEFAULT 0,
	`source` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0,
	`tenant_id` text NOT NULL,
	`total` real DEFAULT 0 NOT NULL,
	`tracking_number` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`woo_order_id` integer
);
--> statement-breakpoint
CREATE INDEX `orders_tenant_id_idx` ON `orders` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `orders_contact_id_idx` ON `orders` (`contact_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`currency` text DEFAULT 'BDT' NOT NULL,
	`gateway_response` text,
	`notes` text,
	`payment_gateway` text,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`subscription_id` text,
	`tenant_id` text NOT NULL,
	`transaction_id` text,
	`uddoktapay_invoice_id` text,
	`verified_at` text,
	`verified_by` text
);
--> statement-breakpoint
CREATE INDEX `payments_tenant_id_idx` ON `payments` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`ai_enabled` integer DEFAULT false NOT NULL,
	`business_type_id` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`description` text,
	`features` text,
	`is_active` integer DEFAULT true NOT NULL,
	`max_agents` integer DEFAULT 1 NOT NULL,
	`max_instances` integer DEFAULT 1 NOT NULL,
	`max_messages_per_month` integer DEFAULT 1000 NOT NULL,
	`name` text NOT NULL,
	`price_monthly` real DEFAULT 0 NOT NULL,
	`price_yearly` real,
	`tier` text,
	`tier_order` integer,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`compare_at_price` real,
	`cost_price` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`images` text,
	`is_active` integer DEFAULT true,
	`low_stock_threshold` integer DEFAULT 5,
	`name` text NOT NULL,
	`options` text,
	`position` integer DEFAULT 0,
	`price` real,
	`product_id` text NOT NULL,
	`sku` text,
	`stock_quantity` integer DEFAULT 0,
	`tenant_id` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	`woo_variant_id` integer
);
--> statement-breakpoint
CREATE INDEX `product_variants_tenant_id_idx` ON `product_variants` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `product_variants_product_id_idx` ON `product_variants` (`product_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text,
	`compare_at_price` real,
	`cost_price` real,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`description` text,
	`images` text,
	`is_active` integer DEFAULT true,
	`low_stock_threshold` integer DEFAULT 5,
	`name` text NOT NULL,
	`price` real DEFAULT 0 NOT NULL,
	`sku` text,
	`stock_quantity` integer DEFAULT 0,
	`tags` text,
	`tenant_id` text NOT NULL,
	`track_inventory` integer DEFAULT true,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	`variant_options` text,
	`variants` text,
	`woo_last_synced_at` text,
	`woo_product_id` integer
);
--> statement-breakpoint
CREATE INDEX `products_tenant_id_idx` ON `products` (`tenant_id`);