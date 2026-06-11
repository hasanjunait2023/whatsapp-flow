
-- Fix 1: Update increment_usage_counter to include period_end
CREATE OR REPLACE FUNCTION public.increment_usage_counter(p_tenant_id uuid, p_field text, p_amount integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calculate the first and last day of current month
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::DATE;
  
  -- Upsert the usage counter
  INSERT INTO public.usage_counters (tenant_id, period_start, period_end, messages_sent, messages_received)
  VALUES (
    p_tenant_id,
    v_period_start,
    v_period_end,
    CASE WHEN p_field = 'messages_sent' THEN p_amount ELSE 0 END,
    CASE WHEN p_field = 'messages_received' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (tenant_id, period_start)
  DO UPDATE SET
    messages_sent = CASE 
      WHEN p_field = 'messages_sent' 
      THEN usage_counters.messages_sent + p_amount 
      ELSE usage_counters.messages_sent 
    END,
    messages_received = CASE 
      WHEN p_field = 'messages_received' 
      THEN usage_counters.messages_received + p_amount 
      ELSE usage_counters.messages_received 
    END,
    updated_at = NOW();
END;
$function$;

-- Fix 2: Clean up Demo Business notification spam
DELETE FROM in_app_notifications 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001' 
AND type = 'instance_disconnected'
AND created_at > now() - interval '7 days';

-- Fix 3: Update the disconnect notification trigger to prevent spam (debounce)
CREATE OR REPLACE FUNCTION public.create_instance_disconnected_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_recent_count INTEGER;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'disconnected' THEN
    -- Debounce: skip if a notification was created for this instance in the last 30 minutes
    SELECT count(*) INTO v_recent_count
    FROM in_app_notifications
    WHERE entity_id = NEW.id
      AND type = 'instance_disconnected'
      AND created_at > now() - interval '30 minutes';
    
    IF v_recent_count = 0 THEN
      INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
      VALUES (
        NEW.tenant_id,
        'instance_disconnected',
        'WhatsApp Instance Disconnected',
        format('%s is offline. Please reconnect.', COALESCE(NEW.name, 'Your instance')),
        'instance',
        NEW.id,
        jsonb_build_object('instance_name', NEW.name, 'instance_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
