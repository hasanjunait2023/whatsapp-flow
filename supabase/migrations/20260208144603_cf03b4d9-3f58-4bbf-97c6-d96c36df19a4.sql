-- Drop existing function if it exists and recreate with better batching
DROP FUNCTION IF EXISTS cleanup_old_webhook_logs(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(
  p_webhook_retention_days INTEGER DEFAULT 7,
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '55s'
AS $$
DECLARE
  v_cutoff_date TIMESTAMP WITH TIME ZONE;
  v_webhook_deleted INTEGER := 0;
  v_fb_webhook_deleted INTEGER := 0;
  v_deleted_count INTEGER;
BEGIN
  v_cutoff_date := NOW() - (p_webhook_retention_days || ' days')::INTERVAL;
  
  -- Delete from webhook_events_log in batch
  WITH deleted AS (
    DELETE FROM webhook_events_log
    WHERE id IN (
      SELECT id FROM webhook_events_log
      WHERE created_at < v_cutoff_date
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_webhook_deleted FROM deleted;
  
  -- Delete from fb_webhook_events_log in batch
  WITH deleted AS (
    DELETE FROM fb_webhook_events_log
    WHERE id IN (
      SELECT id FROM fb_webhook_events_log
      WHERE created_at < v_cutoff_date
      LIMIT p_batch_size
    )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_fb_webhook_deleted FROM deleted;
  
  RETURN json_build_object(
    'webhook_events_deleted', v_webhook_deleted,
    'fb_webhook_events_deleted', v_fb_webhook_deleted,
    'cutoff_date', v_cutoff_date,
    'has_more', (v_webhook_deleted = p_batch_size OR v_fb_webhook_deleted = p_batch_size)
  );
END;
$$;