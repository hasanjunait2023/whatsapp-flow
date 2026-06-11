-- Add onboarding status to tenants table for tracking tour and setup progress
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_status JSONB DEFAULT '{
  "tour_completed": false,
  "tour_skipped": false,
  "setup_completed": false,
  "setup_steps": {
    "whatsapp": false,
    "products": false,
    "invoice": false,
    "courier": false,
    "quickReplies": false,
    "team": false
  }
}'::jsonb;