CREATE TABLE IF NOT EXISTS "fb_data_deletion_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"fb_user_id" text NOT NULL,
	"confirmation_code" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fb_data_deletion_requests_code_unq" ON "fb_data_deletion_requests" USING btree ("confirmation_code");
