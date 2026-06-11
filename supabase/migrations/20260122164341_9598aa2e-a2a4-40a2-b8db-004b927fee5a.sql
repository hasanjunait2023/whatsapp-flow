-- Add handoff columns to contacts table for AI-to-human transfer
ALTER TABLE public.contacts 
  ADD COLUMN IF NOT EXISTS needs_handoff BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS handoff_reason TEXT,
  ADD COLUMN IF NOT EXISTS handoff_at TIMESTAMPTZ;

-- Add index for filtering handoff requests
CREATE INDEX IF NOT EXISTS idx_contacts_needs_handoff ON public.contacts(tenant_id, needs_handoff) WHERE needs_handoff = true;

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.needs_handoff IS 'Whether the AI has requested human agent assistance for this contact';
COMMENT ON COLUMN public.contacts.handoff_reason IS 'Reason provided by AI for requesting handoff';
COMMENT ON COLUMN public.contacts.handoff_at IS 'Timestamp when handoff was requested';