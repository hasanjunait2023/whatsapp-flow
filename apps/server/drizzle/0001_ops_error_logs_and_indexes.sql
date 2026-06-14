CREATE TABLE "error_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"severity" text DEFAULT 'error' NOT NULL,
	"fingerprint" text NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"tenant_id" text,
	"user_id" text,
	"url" text,
	"meta" jsonb,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE INDEX "error_logs_created_at_idx" ON "error_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "error_logs_fingerprint_idx" ON "error_logs" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "messages_tenant_id_created_at_idx" ON "messages" USING btree ("tenant_id","created_at");