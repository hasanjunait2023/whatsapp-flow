-- M4 AFTER-SALES + LOYALTY: owner channel prefs/consent + template-approve-once.
-- Additive only. `IF NOT EXISTS` guards make this safe to apply on a DB where a
-- partial run already added some objects.

CREATE TABLE IF NOT EXISTS "owner_channel_prefs" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL,
  "preferred_channel" text,
  "in_app_ok" boolean DEFAULT true NOT NULL,
  "push_ok" boolean DEFAULT true NOT NULL,
  "whatsapp_ok" boolean DEFAULT true NOT NULL,
  "telegram_ok" boolean DEFAULT true NOT NULL,
  "email" text,
  "email_ok" boolean DEFAULT true NOT NULL,
  "sms_number" text,
  "sms_ok" boolean DEFAULT false NOT NULL,
  "quiet_hours_start" integer DEFAULT 22,
  "quiet_hours_end" integer DEFAULT 8,
  "opted_out" boolean DEFAULT false NOT NULL,
  "weekly_cap" integer DEFAULT 5 NOT NULL,
  "messages_this_week" integer DEFAULT 0 NOT NULL,
  "week_reset_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  "created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
  "updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "owner_channel_prefs_tenant_unq" ON "owner_channel_prefs" ("tenant_id");
--> statement-breakpoint
ALTER TABLE "admin_marketing_sequences" ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "admin_marketing_sequences" ADD COLUMN IF NOT EXISTS "approval_id" text;
