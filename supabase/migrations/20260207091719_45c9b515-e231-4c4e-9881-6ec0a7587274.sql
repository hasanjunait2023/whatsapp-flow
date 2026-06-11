
-- Create an optimized cleanup function that runs with elevated privileges
-- This can handle large deletions without timeout

CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_logs(
  p_webhook_retention_days INTEGER DEFAULT 7,
  p_batch_size INTEGER DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '300s'
AS $$
DECLARE
  v_webhook_deleted INTEGER := 0;
  v_fb_webhook_deleted INTEGER := 0;
  v_batch_deleted INTEGER;
  v_cutoff_date TIMESTAMPTZ;
  v_start_time TIMESTAMPTZ := NOW();
BEGIN
  -- Calculate cutoff date
  v_cutoff_date := NOW() - (p_webhook_retention_days || ' days')::INTERVAL;
  
  RAISE NOTICE 'Starting cleanup for records older than %', v_cutoff_date;
  
  -- Delete from webhook_events_log in batches
  LOOP
    DELETE FROM webhook_events_log
    WHERE id IN (
      SELECT id 
      FROM webhook_events_log 
      WHERE created_at < v_cutoff_date
      LIMIT p_batch_size
    );
    
    GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
    v_webhook_deleted := v_webhook_deleted + v_batch_deleted;
    
    RAISE NOTICE 'webhook_events_log batch deleted: %, total: %', v_batch_deleted, v_webhook_deleted;
    
    EXIT WHEN v_batch_deleted < p_batch_size;
    
    -- Small pause to prevent resource exhaustion
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  -- Delete from fb_webhook_events_log in batches
  LOOP
    DELETE FROM fb_webhook_events_log
    WHERE id IN (
      SELECT id 
      FROM fb_webhook_events_log 
      WHERE created_at < v_cutoff_date
      LIMIT p_batch_size
    );
    
    GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
    v_fb_webhook_deleted := v_fb_webhook_deleted + v_batch_deleted;
    
    RAISE NOTICE 'fb_webhook_events_log batch deleted: %, total: %', v_batch_deleted, v_fb_webhook_deleted;
    
    EXIT WHEN v_batch_deleted < p_batch_size;
    
    -- Small pause to prevent resource exhaustion
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'webhook_events_deleted', v_webhook_deleted,
    'fb_webhook_events_deleted', v_fb_webhook_deleted,
    'cutoff_date', v_cutoff_date,
    'duration_ms', EXTRACT(MILLISECONDS FROM (NOW() - v_start_time))::INTEGER
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'webhook_events_deleted', v_webhook_deleted,
    'fb_webhook_events_deleted', v_fb_webhook_deleted
  );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_webhook_logs(INTEGER, INTEGER) TO service_role;

-- Add index to speed up cleanup queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_webhook_events_log_created_at ON webhook_events_log(created_at);
CREATE INDEX IF NOT EXISTS idx_fb_webhook_events_log_created_at ON fb_webhook_events_log(created_at);

-- Add comment for documentation
COMMENT ON FUNCTION public.cleanup_old_webhook_logs IS 'Cleans up old webhook event logs to prevent disk space exhaustion. Safe for tenant data - only deletes webhook logs.';
