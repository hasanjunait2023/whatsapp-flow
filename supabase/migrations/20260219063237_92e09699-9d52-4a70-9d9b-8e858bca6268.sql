-- Register the missing webhook-cleanup-cron job (every 6 hours)
SELECT cron.schedule(
  'webhook-cleanup-every-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/webhook-cleanup-cron',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNka3J2enRxZXVmbHhpbHJ0bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTIyMjIsImV4cCI6MjA4NDY2ODIyMn0.Wzk1rWYrxGnhob0vfD-rC7kR50hWSThfuJ_6thUoDqA'
    ),
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Drop unused indexes (zero scans, wasting disk and slowing writes)
DROP INDEX IF EXISTS idx_thread_state_assigned;
DROP INDEX IF EXISTS idx_thread_state_inbox;
DROP INDEX IF EXISTS idx_webhook_events_log_processed;