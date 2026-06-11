-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create the CRON job to run group-batch-processor every 30 minutes
SELECT cron.schedule(
  'group-batch-processor-cron',
  '*/30 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/group-batch-processor',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNka3J2enRxZXVmbHhpbHJ0bndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwOTIyMjIsImV4cCI6MjA4NDY2ODIyMn0.Wzk1rWYrxGnhob0vfD-rC7kR50hWSThfuJ_6thUoDqA'
        ),
        body:='{}'::jsonb
    ) as request_id;
  $$
);