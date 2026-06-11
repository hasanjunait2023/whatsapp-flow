-- Add settings JSONB column to tenants table for storing AI agent config and other settings
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.settings IS 'JSON settings storage for tenant-specific configurations like AI agent settings, knowledge base, etc.';