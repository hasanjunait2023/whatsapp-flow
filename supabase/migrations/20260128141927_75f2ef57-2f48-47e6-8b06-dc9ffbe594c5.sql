-- Function to auto-enroll new tenants into retention campaigns
CREATE OR REPLACE FUNCTION public.auto_enroll_tenant_marketing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Only trigger when tenant becomes activated
  IF OLD.is_activated = FALSE AND NEW.is_activated = TRUE THEN
    SELECT id INTO v_campaign_id
    FROM public.admin_marketing_campaigns
    WHERE type = 'subscriber_retention' AND status = 'active'
    LIMIT 1;

    IF v_campaign_id IS NOT NULL THEN
      INSERT INTO public.admin_marketing_enrollments (
        campaign_id, entity_type, entity_id, status, current_week, current_step,
        next_message_at, messages_this_week, messages_this_month, week_reset_at, month_reset_at
      ) VALUES (
        v_campaign_id, 'tenant', NEW.id, 'active', 1, 0, NOW(), 0, 0, NOW(), NOW()
      ) ON CONFLICT DO NOTHING;

      INSERT INTO public.admin_customer_journey (entity_type, entity_id, event_type, event_category, title_bn, metadata)
      VALUES ('tenant', NEW.id, 'marketing_auto_enrolled', 'marketing', 'রিটেনশন ক্যাম্পেইনে এনরোল', jsonb_build_object('campaign_id', v_campaign_id));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_enroll_tenant_marketing ON tenants;
CREATE TRIGGER trigger_auto_enroll_tenant_marketing
  AFTER UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION auto_enroll_tenant_marketing();

-- Insert default campaigns
INSERT INTO public.admin_marketing_campaigns (name, name_bn, type, status, target_tier, max_discount_percent, frequency_per_week, frequency_per_month, min_days_between_messages, use_whatsapp, use_email, alternate_channels, blackout_hours)
VALUES 
('Prospect Nurture - 1 Year', 'প্রসপেক্ট নার্চারিং', 'prospect_nurture', 'active', ARRAY['starter', 'growth', 'pro'], 10, 1, 4, 2, true, true, true, '{"start": "22:00", "end": "08:00"}'::jsonb),
('Subscriber Retention', 'সাবস্ক্রাইবার রিটেনশন', 'subscriber_retention', 'active', ARRAY['starter', 'growth', 'pro'], 5, 1, 4, 3, true, true, true, '{"start": "22:00", "end": "08:00"}'::jsonb)
ON CONFLICT DO NOTHING;