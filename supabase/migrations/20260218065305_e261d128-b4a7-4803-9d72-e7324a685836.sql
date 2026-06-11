ALTER TABLE public.subscriptions 
ADD COLUMN resource_overrides JSONB DEFAULT NULL;

COMMENT ON COLUMN public.subscriptions.resource_overrides IS 
'Per-tenant numeric limit overrides set by admin. Keys: max_instances, max_agents, max_fb_pages, max_messages_per_month, custom_price_monthly';