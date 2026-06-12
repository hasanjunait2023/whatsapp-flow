ALTER TABLE `facebook_pages` ADD `ig_account_id` text;--> statement-breakpoint
ALTER TABLE `facebook_pages` ADD `ig_connected_at` text;--> statement-breakpoint
ALTER TABLE `facebook_pages` ADD `ig_profile_picture_url` text;--> statement-breakpoint
ALTER TABLE `facebook_pages` ADD `ig_username` text;--> statement-breakpoint
ALTER TABLE `fb_contacts` ADD `platform` text DEFAULT 'facebook' NOT NULL;--> statement-breakpoint
ALTER TABLE `plans` ADD `max_pages` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `fb_post_comments` ADD `platform` text DEFAULT 'facebook' NOT NULL;