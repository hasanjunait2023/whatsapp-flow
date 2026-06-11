-- Enums for Facebook Messenger
CREATE TYPE public.fb_message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE public.fb_message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE public.fb_page_status AS ENUM ('active', 'disconnected', 'token_expired');

-- Facebook Pages (stores encrypted page access tokens)
CREATE TABLE public.facebook_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL,
    page_name TEXT NOT NULL,
    page_access_token TEXT NOT NULL,
    app_secret TEXT,
    profile_picture_url TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    status public.fb_page_status NOT NULL DEFAULT 'disconnected',
    webhook_verify_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    last_connected_at TIMESTAMPTZ,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, page_id)
);

-- Facebook Contacts (PSID = Page-Scoped User ID)
CREATE TABLE public.fb_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
    psid TEXT NOT NULL,
    name TEXT,
    profile_pic_url TEXT,
    locale TEXT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    needs_handoff BOOLEAN NOT NULL DEFAULT false,
    handoff_reason TEXT,
    handoff_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(page_id, psid)
);

-- Facebook Messages
CREATE TABLE public.fb_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.facebook_pages(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.fb_contacts(id) ON DELETE CASCADE,
    mid TEXT UNIQUE,
    direction public.fb_message_direction NOT NULL,
    status public.fb_message_status NOT NULL DEFAULT 'pending',
    content_type TEXT NOT NULL DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    original_media_url TEXT,
    attachment_id TEXT,
    media_mime_type TEXT,
    media_filename TEXT,
    quick_reply_payload TEXT,
    reply_to_id UUID REFERENCES public.fb_messages(id) ON DELETE SET NULL,
    is_from_ai BOOLEAN NOT NULL DEFAULT false,
    sent_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Webhook Events Log for idempotency
CREATE TABLE public.fb_webhook_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    page_id UUID REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    sender_psid TEXT,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    error TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX idx_fb_pages_tenant ON public.facebook_pages(tenant_id);
CREATE INDEX idx_fb_contacts_tenant_page ON public.fb_contacts(tenant_id, page_id);
CREATE INDEX idx_fb_contacts_last_message ON public.fb_contacts(tenant_id, last_message_at DESC);
CREATE INDEX idx_fb_messages_contact_created ON public.fb_messages(contact_id, created_at DESC);
CREATE INDEX idx_fb_messages_tenant_created ON public.fb_messages(tenant_id, created_at DESC);
CREATE INDEX idx_fb_messages_mid ON public.fb_messages(mid) WHERE mid IS NOT NULL;
CREATE INDEX idx_fb_webhook_idempotency ON public.fb_webhook_events_log(idempotency_key);

-- Enable RLS
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fb_webhook_events_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_pages
CREATE POLICY "Tenant members can view their pages"
    ON public.facebook_pages FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant owners/managers can insert pages"
    ON public.facebook_pages FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Tenant owners/managers can update pages"
    ON public.facebook_pages FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

CREATE POLICY "Tenant owners/managers can delete pages"
    ON public.facebook_pages FOR DELETE
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('owner', 'manager')));

-- RLS Policies for fb_contacts
CREATE POLICY "Tenant members can view their contacts"
    ON public.fb_contacts FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert contacts"
    ON public.fb_contacts FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can update contacts"
    ON public.fb_contacts FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

-- RLS Policies for fb_messages
CREATE POLICY "Tenant members can view their messages"
    ON public.fb_messages FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can insert messages"
    ON public.fb_messages FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can update messages"
    ON public.fb_messages FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

-- RLS Policies for fb_webhook_events_log (service role only for inserts, tenant for reads)
CREATE POLICY "Tenant members can view their webhook logs"
    ON public.fb_webhook_events_log FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_fb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_facebook_pages_updated_at
    BEFORE UPDATE ON public.facebook_pages
    FOR EACH ROW EXECUTE FUNCTION public.update_fb_updated_at();

CREATE TRIGGER update_fb_contacts_updated_at
    BEFORE UPDATE ON public.fb_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_fb_updated_at();

-- Enable realtime for messages and contacts
ALTER PUBLICATION supabase_realtime ADD TABLE public.fb_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fb_contacts;