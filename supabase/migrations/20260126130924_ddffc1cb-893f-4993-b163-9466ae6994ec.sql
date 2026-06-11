-- Create triggers for additional notification types

-- 1. Order Status Change Trigger
CREATE OR REPLACE FUNCTION create_order_status_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_order_status_notification ON orders;
CREATE TRIGGER trigger_order_status_notification
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_order_status_notification();

-- 2. Instance Disconnection Trigger
CREATE OR REPLACE FUNCTION create_instance_disconnected_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_instance_disconnected_notification ON whatsapp_instances;
CREATE TRIGGER trigger_instance_disconnected_notification
  AFTER UPDATE ON whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION create_instance_disconnected_notification();

-- 3. Subscription Events Trigger
CREATE OR REPLACE FUNCTION create_subscription_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_subscription_notification ON subscriptions;
CREATE TRIGGER trigger_subscription_notification
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_notification();

-- 4. Payment Received Trigger
CREATE OR REPLACE FUNCTION create_payment_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_payment_notification ON payments;
CREATE TRIGGER trigger_payment_notification
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION create_payment_notification();

-- 5. Team Member Added Trigger (using user_roles table)
CREATE OR REPLACE FUNCTION create_team_member_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_team_member_notification ON user_roles;
CREATE TRIGGER trigger_team_member_notification
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION create_team_member_notification();

-- 6. Complaint Resolved Trigger
CREATE OR REPLACE FUNCTION create_complaint_resolved_notification()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_complaint_resolved_notification ON complaints;
CREATE TRIGGER trigger_complaint_resolved_notification
  AFTER UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION create_complaint_resolved_notification();