-- Insert 9 Industry-Tailored Subscription Plans

-- Wholesale Plans (ID: 514ccef5-375d-4f56-9ee0-218b99fc9922)
INSERT INTO public.plans (name, description, price_monthly, price_yearly, max_instances, max_agents, max_messages_per_month, ai_enabled, is_active, business_type_id, tier, tier_order, features)
VALUES 
('Wholesale Starter', 'Essential tools for B2B wholesalers', 1999, 19990, 1, 3, 50000, false, true, 
 '514ccef5-375d-4f56-9ee0-218b99fc9922', 'starter', 1,
 '{"orders_enabled": true, "products_enabled": true, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": false, "automation_enabled": false, "ai_agent_enabled": false, "workflows_enabled": false, "invoice_generation": false, "woocommerce_sync": false, "fb_messenger_enabled": false, "reports_enabled": false}'::jsonb),

('Wholesale Growth', 'Scale your wholesale operations with AI', 2899, 28990, 2, 5, 500000, true, true,
 '514ccef5-375d-4f56-9ee0-218b99fc9922', 'growth', 2,
 '{"orders_enabled": true, "products_enabled": true, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": true, "ai_agent_enabled": true, "workflows_enabled": true, "invoice_generation": false, "woocommerce_sync": false, "fb_messenger_enabled": false, "reports_enabled": true}'::jsonb),

('Wholesale Pro', 'Enterprise wholesale management', 3499, 34990, 3, 10, 5000000, true, true,
 '514ccef5-375d-4f56-9ee0-218b99fc9922', 'pro', 3,
 '{"orders_enabled": true, "products_enabled": true, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": true, "ai_agent_enabled": true, "workflows_enabled": true, "invoice_generation": true, "woocommerce_sync": false, "fb_messenger_enabled": true, "reports_enabled": true}'::jsonb),

-- Retail E-commerce Plans (ID: ab68ccb0-2f55-48ca-bc79-6a99310d6779)
('Retail Starter', 'Launch your e-commerce business', 1999, 19990, 1, 3, 50000, false, true,
 'ab68ccb0-2f55-48ca-bc79-6a99310d6779', 'starter', 1,
 '{"orders_enabled": true, "products_enabled": true, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": false, "ai_agent_enabled": false, "workflows_enabled": false, "invoice_generation": false, "woocommerce_sync": false, "fb_messenger_enabled": false, "reports_enabled": false}'::jsonb),

('Retail Growth', 'Grow your online store with automation', 2899, 28990, 2, 5, 500000, true, true,
 'ab68ccb0-2f55-48ca-bc79-6a99310d6779', 'growth', 2,
 '{"orders_enabled": true, "products_enabled": true, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": true, "ai_agent_enabled": true, "workflows_enabled": true, "invoice_generation": false, "woocommerce_sync": true, "fb_messenger_enabled": false, "reports_enabled": true}'::jsonb),

('Retail Pro', 'Full-featured e-commerce platform', 3499, 34990, 3, 10, 5000000, true, true,
 'ab68ccb0-2f55-48ca-bc79-6a99310d6779', 'pro', 3,
 '{"orders_enabled": true, "products_enabled": true, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": true, "ai_agent_enabled": true, "workflows_enabled": true, "invoice_generation": true, "woocommerce_sync": true, "fb_messenger_enabled": true, "reports_enabled": true}'::jsonb),

-- Service Business Plans (ID: bf43be90-faef-4e3b-a144-a3d36cf18766)
('Service Starter', 'Manage client communications efficiently', 1999, 19990, 1, 3, 50000, false, true,
 'bf43be90-faef-4e3b-a144-a3d36cf18766', 'starter', 1,
 '{"orders_enabled": false, "products_enabled": false, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": false, "ai_agent_enabled": false, "workflows_enabled": false, "invoice_generation": false, "woocommerce_sync": false, "fb_messenger_enabled": false, "reports_enabled": false}'::jsonb),

('Service Growth', 'Automate your service business', 2899, 28990, 2, 5, 500000, true, true,
 'bf43be90-faef-4e3b-a144-a3d36cf18766', 'growth', 2,
 '{"orders_enabled": true, "products_enabled": false, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": true, "ai_agent_enabled": true, "workflows_enabled": true, "invoice_generation": false, "woocommerce_sync": false, "fb_messenger_enabled": false, "reports_enabled": true}'::jsonb),

('Service Pro', 'Complete service business suite', 3499, 34990, 3, 10, 5000000, true, true,
 'bf43be90-faef-4e3b-a144-a3d36cf18766', 'pro', 3,
 '{"orders_enabled": true, "products_enabled": true, "contacts_enabled": true, "quick_replies_enabled": true, "team_enabled": true, "analytics_enabled": true, "automation_enabled": true, "ai_agent_enabled": true, "workflows_enabled": true, "invoice_generation": true, "woocommerce_sync": false, "fb_messenger_enabled": true, "reports_enabled": true}'::jsonb);

-- Deactivate legacy plans without business_type_id
UPDATE public.plans 
SET is_active = false, updated_at = now()
WHERE business_type_id IS NULL;