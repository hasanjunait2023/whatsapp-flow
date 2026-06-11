-- Drop and recreate the view with SECURITY INVOKER to use querying user's permissions
DROP VIEW IF EXISTS contact_customer_status;

CREATE VIEW contact_customer_status 
WITH (security_invoker = true)
AS
SELECT 
  c.id as contact_id,
  c.tenant_id,
  c.phone_number,
  t.business_type_id,
  bt.slug as business_type,
  COALESCE(cs.total_orders, 0) as total_orders,
  COALESCE(cs.total_spent, 0) as total_spent,
  cs.score_tier,
  cs.last_order_date,
  CASE 
    WHEN cs.last_order_date IS NOT NULL 
    THEN EXTRACT(DAY FROM NOW() - cs.last_order_date)::int
    ELSE NULL
  END as days_since_last_order
FROM contacts c
LEFT JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN business_types bt ON t.business_type_id = bt.id
LEFT JOIN customer_scores cs ON cs.contact_id = c.id AND cs.tenant_id = c.tenant_id;