-- Seed reminder_settings with default configurations
INSERT INTO public.reminder_settings (reminder_type, channel, days_offset, email_subject, is_active)
VALUES 
  ('expiry_warning', 'both', ARRAY[7, 3, 1], 'Your subscription expires soon', true),
  ('payment_overdue', 'both', ARRAY[1, 3, 7], 'Payment overdue - action required', true),
  ('trial_ending', 'both', ARRAY[3, 1], 'Your trial is ending soon', true)
ON CONFLICT DO NOTHING;