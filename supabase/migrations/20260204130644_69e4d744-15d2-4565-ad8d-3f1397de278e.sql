-- Add retry columns to admin_marketing_sends for rate limit handling
ALTER TABLE admin_marketing_sends 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_after TIMESTAMPTZ;

-- Add index for retry queue processing
CREATE INDEX IF NOT EXISTS idx_marketing_sends_retry 
ON admin_marketing_sends (status, retry_count, retry_after) 
WHERE status = 'failed' AND retry_count < 3;