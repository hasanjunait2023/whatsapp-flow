-- Create media_cleanup_logs table for tracking cleanup runs
CREATE TABLE public.media_cleanup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  messages_processed INTEGER NOT NULL DEFAULT 0,
  files_deleted INTEGER NOT NULL DEFAULT 0,
  storage_freed_bytes BIGINT NOT NULL DEFAULT 0,
  errors JSONB,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  wa_messages_cleaned INTEGER NOT NULL DEFAULT 0,
  fb_messages_cleaned INTEGER NOT NULL DEFAULT 0
);

-- Add comment for documentation
COMMENT ON TABLE public.media_cleanup_logs IS 'Logs for media cleanup cron job runs - tracks deleted files and freed storage';

-- Enable RLS (admin only access)
ALTER TABLE public.media_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Only system admins can view cleanup logs
CREATE POLICY "System admins can view cleanup logs"
  ON public.media_cleanup_logs
  FOR SELECT
  USING (public.is_system_admin());

-- Create index for querying recent logs
CREATE INDEX idx_media_cleanup_logs_run_at ON public.media_cleanup_logs(run_at DESC);