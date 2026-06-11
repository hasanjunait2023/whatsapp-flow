-- 1. Add DELETE policy for in_app_notifications
CREATE POLICY "Users can delete their own notifications"
ON public.in_app_notifications
FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

-- 2. Create increment_usage_counter function for message tracking
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  p_tenant_id UUID,
  p_field TEXT,
  p_amount INT DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start DATE;
BEGIN
  -- Calculate the first day of current month
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Upsert the usage counter
  INSERT INTO public.usage_counters (tenant_id, period_start, messages_sent, messages_received)
  VALUES (
    p_tenant_id,
    v_period_start,
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
$$;

-- 3. Fix mutable search_path in existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_order_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
    VALUES (
      NEW.tenant_id,
      'order_status',
      format('Order %s Status Updated', COALESCE(NEW.order_number, NEW.id::text)),
      format('Status changed to %s', NEW.status),
      'order',
      NEW.id::text,
      jsonb_build_object('order_number', NEW.order_number, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_instance_disconnected_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'disconnected' THEN
    INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
    VALUES (
      NEW.tenant_id,
      'instance_disconnected',
      'WhatsApp Instance Disconnected',
      format('%s is offline. Please reconnect.', COALESCE(NEW.name, 'Your instance')),
      'instance',
      NEW.id::text,
      jsonb_build_object('instance_name', NEW.name, 'instance_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_subscription_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'expired' THEN
    INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
    VALUES (
      NEW.tenant_id,
      'subscription_expired',
      'Subscription Expired',
      'Your subscription has expired. Please renew to continue using all features.',
      'subscription',
      NEW.id::text,
      jsonb_build_object('plan_id', NEW.plan_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_payment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (
    NEW.tenant_id,
    'payment_received',
    'Payment Received',
    format('Payment of ৳%s has been confirmed.', NEW.amount),
    'payment',
    NEW.id::text,
    jsonb_build_object('amount', NEW.amount, 'payment_method', NEW.payment_method)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_team_member_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_name TEXT;
BEGIN
  SELECT full_name INTO member_name FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (
    NEW.tenant_id,
    'team_member_added',
    'New Team Member',
    format('%s has joined your team.', COALESCE(member_name, 'A new member')),
    'team',
    NEW.id::text,
    jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_complaint_resolved_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'resolved' THEN
    INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
    VALUES (
      NEW.tenant_id,
      'complaint_resolved',
      'Complaint Resolved',
      format('Complaint "%s" has been resolved.', NEW.title),
      'complaint',
      NEW.id::text,
      jsonb_build_object('complaint_title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$;