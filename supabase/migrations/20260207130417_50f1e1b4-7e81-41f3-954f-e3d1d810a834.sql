-- Performance optimization indexes (remaining)

-- 2. Orders: Status-based queries optimization
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status 
ON public.orders (tenant_id, status, created_at DESC);

-- 3. Orders: Contact-based lookups
CREATE INDEX IF NOT EXISTS idx_orders_contact_id 
ON public.orders (contact_id, created_at DESC) WHERE contact_id IS NOT NULL;

-- 4. Messages: Contact + status for delivery tracking
CREATE INDEX IF NOT EXISTS idx_messages_contact_status 
ON public.messages (contact_id, status, sent_at DESC);

-- 5. Webhook events: Created_at index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_created 
ON public.webhook_events_log (created_at DESC);

-- 6. FB webhook events: Created_at index for cleanup
CREATE INDEX IF NOT EXISTS idx_fb_webhook_events_created 
ON public.fb_webhook_events_log (created_at DESC);