-- Schedule media cleanup cron job to run daily at 9 PM UTC (3 AM Bangladesh Time)
SELECT cron.schedule(
  'media-cleanup-daily',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url:='https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/media-cleanup-cron',
    headers:=jsonb_build_object('Content-Type', 'application/json'),
    body:='{}'::jsonb
  ) as request_id;
  $$
);