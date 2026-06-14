CREATE TABLE "content_pieces" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text DEFAULT 'blog' NOT NULL,
	"slug" text,
	"title" text NOT NULL,
	"body_md" text,
	"target_keywords" jsonb,
	"seo_score" integer,
	"audit_notes" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"approval_id" text,
	"published_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_approvals" (
	"id" text PRIMARY KEY NOT NULL,
	"artifact_type" text NOT NULL,
	"artifact_id" text,
	"summary" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'awaiting_approval' NOT NULL,
	"execute_job_kind" text NOT NULL,
	"tg_chat_id" text,
	"tg_message_id" text,
	"decided_by" text,
	"decided_at" text,
	"reject_reason" text,
	"execute_job_id" text,
	"error" text,
	"expires_at" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text,
	"platform" text NOT NULL,
	"channel_ids" jsonb NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"media_urls" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"approval_id" text,
	"postiz_post_id" text,
	"planned_for" text,
	"scheduled_at" text,
	"published_at" text,
	"ai_generated" boolean DEFAULT true NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
CREATE INDEX "content_pieces_status_idx" ON "content_pieces" USING btree ("status");--> statement-breakpoint
CREATE INDEX "growth_approvals_status_idx" ON "growth_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "social_posts_status_idx" ON "social_posts" USING btree ("status");