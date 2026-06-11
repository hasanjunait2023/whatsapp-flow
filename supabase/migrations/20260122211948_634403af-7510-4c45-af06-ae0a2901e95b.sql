-- Create customer journey events table
CREATE TABLE public.customer_journey_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX idx_journey_contact_id ON public.customer_journey_events(contact_id);
CREATE INDEX idx_journey_tenant_id ON public.customer_journey_events(tenant_id);
CREATE INDEX idx_journey_created_at ON public.customer_journey_events(created_at DESC);
CREATE INDEX idx_journey_event_type ON public.customer_journey_events(event_type);

-- Enable RLS
ALTER TABLE public.customer_journey_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view journey events"
ON public.customer_journey_events
FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Members can create journey events"
ON public.customer_journey_events
FOR INSERT
WITH CHECK (is_tenant_member(tenant_id));

CREATE POLICY "Owners/Managers can delete journey events"
ON public.customer_journey_events
FOR DELETE
USING (is_tenant_owner_or_manager(tenant_id));

-- Trigger function for first contact (when contact is created)
CREATE OR REPLACE FUNCTION public.log_first_contact()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customer_journey_events (
    tenant_id,
    contact_id,
    event_type,
    event_category,
    title,
    description,
    metadata
  ) VALUES (
    NEW.tenant_id,
    NEW.id,
    'first_contact',
    'communication',
    'First Contact',
    'Customer initiated their first conversation',
    jsonb_build_object(
      'phone_number', NEW.phone_number,
      'instance_id', NEW.instance_id,
      'name', COALESCE(NEW.name, 'Unknown')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contacts table
CREATE TRIGGER trigger_log_first_contact
AFTER INSERT ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.log_first_contact();

-- Trigger function for order events
CREATE OR REPLACE FUNCTION public.log_order_journey_event()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id UUID;
  v_event_type TEXT;
  v_title TEXT;
  v_description TEXT;
BEGIN
  -- Get contact_id from order
  v_contact_id := NEW.contact_id;
  
  -- Skip if no contact associated
  IF v_contact_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- For INSERT (new order)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.customer_journey_events (
      tenant_id,
      contact_id,
      event_type,
      event_category,
      title,
      description,
      metadata
    ) VALUES (
      NEW.tenant_id,
      v_contact_id,
      'order_created',
      'order',
      'Order Created',
      format('Order %s placed - %s %s', NEW.order_number, NEW.currency, NEW.total),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'total', NEW.total,
        'currency', NEW.currency,
        'status', NEW.status
      )
    );
  END IF;
  
  -- For UPDATE (status changes)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Determine event type and title based on new status
    CASE NEW.status
      WHEN 'confirmed' THEN
        v_event_type := 'order_confirmed';
        v_title := 'Order Confirmed';
        v_description := format('Order %s has been confirmed', NEW.order_number);
      WHEN 'processing' THEN
        v_event_type := 'order_processing';
        v_title := 'Order Processing';
        v_description := format('Order %s is being processed', NEW.order_number);
      WHEN 'shipped' THEN
        v_event_type := 'order_shipped';
        v_title := 'Order Shipped';
        v_description := format('Order %s has been shipped', NEW.order_number);
      WHEN 'delivered' THEN
        v_event_type := 'order_delivered';
        v_title := 'Order Delivered';
        v_description := format('Order %s was successfully delivered', NEW.order_number);
      WHEN 'cancelled' THEN
        v_event_type := 'order_cancelled';
        v_title := 'Order Cancelled';
        v_description := format('Order %s was cancelled', NEW.order_number);
      ELSE
        v_event_type := 'order_status_changed';
        v_title := 'Order Status Changed';
        v_description := format('Order %s status changed to %s', NEW.order_number, NEW.status);
    END CASE;
    
    INSERT INTO public.customer_journey_events (
      tenant_id,
      contact_id,
      event_type,
      event_category,
      title,
      description,
      metadata
    ) VALUES (
      NEW.tenant_id,
      v_contact_id,
      v_event_type,
      'order',
      v_title,
      v_description,
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'tracking_number', NEW.tracking_number
      )
    );
  END IF;
  
  -- For payment status changes
  IF TG_OP = 'UPDATE' AND OLD.payment_status != NEW.payment_status AND NEW.payment_status = 'paid' THEN
    INSERT INTO public.customer_journey_events (
      tenant_id,
      contact_id,
      event_type,
      event_category,
      title,
      description,
      metadata
    ) VALUES (
      NEW.tenant_id,
      v_contact_id,
      'payment_received',
      'payment',
      'Payment Received',
      format('Payment of %s %s received for order %s', NEW.currency, NEW.total, NEW.order_number),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'amount', NEW.total,
        'currency', NEW.currency
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
CREATE TRIGGER trigger_log_order_journey
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_journey_event();

-- Trigger for handoff events
CREATE OR REPLACE FUNCTION public.log_handoff_journey_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log handoff requested
  IF TG_OP = 'UPDATE' AND OLD.needs_handoff = false AND NEW.needs_handoff = true THEN
    INSERT INTO public.customer_journey_events (
      tenant_id,
      contact_id,
      event_type,
      event_category,
      title,
      description,
      metadata
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'handoff_requested',
      'system',
      'Handoff Requested',
      COALESCE(NEW.handoff_reason, 'Customer requested human assistance'),
      jsonb_build_object(
        'reason', NEW.handoff_reason,
        'requested_at', NEW.handoff_at
      )
    );
  END IF;
  
  -- Log handoff resolved
  IF TG_OP = 'UPDATE' AND OLD.needs_handoff = true AND NEW.needs_handoff = false THEN
    INSERT INTO public.customer_journey_events (
      tenant_id,
      contact_id,
      event_type,
      event_category,
      title,
      description,
      metadata
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      'handoff_resolved',
      'system',
      'Handoff Resolved',
      'Human agent took over the conversation',
      jsonb_build_object(
        'resolved_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on contacts for handoff
CREATE TRIGGER trigger_log_handoff_journey
AFTER UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.log_handoff_journey_event();