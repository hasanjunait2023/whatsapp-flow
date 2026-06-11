-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to trigger workflow on order status change
CREATE OR REPLACE FUNCTION public.trigger_order_status_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Only trigger if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.contact_id IS NOT NULL THEN
    -- Get configuration from vault or use hardcoded values
    v_supabase_url := 'https://cdkrvztqeuflxilrtnws.supabase.co';
    v_service_role_key := current_setting('app.supabase_service_role_key', true);
    
    -- If service role key is not set, skip (will be called from edge function instead)
    IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
      RAISE NOTICE 'Service role key not configured, skipping workflow trigger';
      RETURN NEW;
    END IF;
    
    -- Call workflow-execute via pg_net
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/workflow-execute',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'trigger_type', 'order_status_changed',
        'tenant_id', NEW.tenant_id,
        'contact_id', NEW.contact_id,
        'data', jsonb_build_object(
          'order_id', NEW.id,
          'order_status', NEW.status,
          'old_status', OLD.status,
          'order_number', NEW.order_number,
          'total', NEW.total,
          'customer_name', NEW.customer_name
        )
      )
    );
    
    RAISE NOTICE 'Workflow triggered for order % status change: % -> %', NEW.order_number, OLD.status, NEW.status;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS trigger_workflow_on_order_status ON orders;
CREATE TRIGGER trigger_workflow_on_order_status
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_order_status_workflow();

-- Function to trigger workflow when contact label is added
CREATE OR REPLACE FUNCTION public.trigger_contact_label_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_label_name TEXT;
  v_tenant_id UUID;
  v_contact_phone TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Get label name and contact details
  SELECT l.name, c.tenant_id, c.phone_number 
  INTO v_label_name, v_tenant_id, v_contact_phone
  FROM labels l
  JOIN contacts c ON c.id = NEW.contact_id
  WHERE l.id = NEW.label_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get configuration
  v_supabase_url := 'https://cdkrvztqeuflxilrtnws.supabase.co';
  v_service_role_key := current_setting('app.supabase_service_role_key', true);
  
  -- If service role key is not set, skip
  IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
    RAISE NOTICE 'Service role key not configured, skipping workflow trigger';
    RETURN NEW;
  END IF;
  
  -- Call workflow-execute via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/workflow-execute',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'trigger_type', 'contact_label_added',
      'tenant_id', v_tenant_id,
      'contact_id', NEW.contact_id,
      'data', jsonb_build_object(
        'label_id', NEW.label_id,
        'label_name', v_label_name,
        'contact_phone', v_contact_phone
      )
    )
  );
  
  RAISE NOTICE 'Workflow triggered for contact label: %', v_label_name;
  
  RETURN NEW;
END;
$$;

-- Create trigger for contact label additions
DROP TRIGGER IF EXISTS trigger_workflow_on_contact_label ON contact_labels;
CREATE TRIGGER trigger_workflow_on_contact_label
AFTER INSERT ON contact_labels
FOR EACH ROW
EXECUTE FUNCTION public.trigger_contact_label_workflow();