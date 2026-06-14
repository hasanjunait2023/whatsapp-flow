ALTER TABLE "whatsapp_instances" ALTER COLUMN "is_deleted" SET DEFAULT false;--> statement-breakpoint
UPDATE "whatsapp_instances" SET "is_deleted" = false WHERE "is_deleted" IS NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_instances" ALTER COLUMN "is_deleted" SET NOT NULL;
