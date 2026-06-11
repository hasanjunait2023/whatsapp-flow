-- Add delivery and read tracking columns to fb_messages
ALTER TABLE public.fb_messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient status updates by mid
CREATE INDEX IF NOT EXISTS idx_fb_messages_mid ON public.fb_messages(mid) WHERE mid IS NOT NULL;

-- Add index for read receipt watermark queries
CREATE INDEX IF NOT EXISTS idx_fb_messages_outbound_sent_at ON public.fb_messages(page_id, direction, sent_at) 
WHERE direction = 'outbound';