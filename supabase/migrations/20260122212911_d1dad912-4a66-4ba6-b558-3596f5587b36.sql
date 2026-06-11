-- Backfill first_contact events for existing contacts that don't have one
INSERT INTO public.customer_journey_events (
  tenant_id,
  contact_id,
  event_type,
  event_category,
  title,
  description,
  metadata,
  created_at
)
SELECT 
  c.tenant_id,
  c.id,
  'first_contact',
  'communication',
  'First Contact',
  'Customer initiated their first conversation',
  jsonb_build_object(
    'phone_number', c.phone_number,
    'instance_id', c.instance_id,
    'name', COALESCE(c.name, 'Unknown')
  ),
  c.created_at  -- Use the original contact creation date
FROM public.contacts c
WHERE NOT EXISTS (
  SELECT 1 FROM public.customer_journey_events e 
  WHERE e.contact_id = c.id AND e.event_type = 'first_contact'
);