-- =============================================
-- WhatsCRM SaaS - Foundation Database Schema
-- Part 1: Core Tables, Roles & Helper Functions
-- =============================================

-- 1. Create role enum for tenant roles
CREATE TYPE public.tenant_role AS ENUM ('owner', 'manager', 'agent');

-- 2. Create system admin role enum
CREATE TYPE public.system_role AS ENUM ('admin', 'user');

-- 3. Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'cancelled');

-- 4. Create message direction enum
CREATE TYPE public.message_direction AS ENUM ('inbound', 'outbound');

-- 5. Create message status enum
CREATE TYPE public.message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- 6. Create instance status enum
CREATE TYPE public.instance_status AS ENUM ('active', 'disconnected', 'banned');

-- =============================================
-- PROFILES TABLE (for user metadata)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SYSTEM ROLES TABLE (for central admin)
-- =============================================
CREATE TABLE public.system_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role system_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TENANTS TABLE
-- =============================================
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER ROLES TABLE (tenant membership)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    role tenant_role NOT NULL DEFAULT 'agent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PLANS TABLE (subscription plans)
-- =============================================
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10,2),
    max_instances INTEGER NOT NULL DEFAULT 1,
    max_agents INTEGER NOT NULL DEFAULT 1,
    max_messages_per_month INTEGER NOT NULL DEFAULT 1000,
    ai_enabled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status subscription_status NOT NULL DEFAULT 'trialing',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '14 days'),
    grace_period_ends_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PAYMENTS TABLE (manual payment tracking)
-- =============================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BDT',
    payment_method TEXT NOT NULL, -- 'bkash', 'nagad', 'bank_transfer'
    transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- WHATSAPP INSTANCES TABLE
-- =============================================
CREATE TABLE public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT,
    api_key_encrypted TEXT NOT NULL,
    session_id TEXT,
    webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status instance_status NOT NULL DEFAULT 'disconnected',
    is_default BOOLEAN NOT NULL DEFAULT false,
    last_connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CONTACTS TABLE
-- =============================================
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    wa_id TEXT NOT NULL, -- WhatsApp ID (phone number)
    phone_number TEXT NOT NULL,
    name TEXT,
    profile_pic_url TEXT,
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ,
    unread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(instance_id, wa_id)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    wa_message_id TEXT UNIQUE, -- WhatsApp message ID for dedup
    direction message_direction NOT NULL,
    status message_status NOT NULL DEFAULT 'pending',
    content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'audio', 'document'
    content TEXT,
    media_url TEXT,
    media_mime_type TEXT,
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_from_ai BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Index for faster message queries
CREATE INDEX idx_messages_contact_sent ON public.messages(contact_id, sent_at DESC);
CREATE INDEX idx_messages_wa_id ON public.messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- =============================================
-- LABELS TABLE
-- =============================================
CREATE TABLE public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CONTACT LABELS (many-to-many)
-- =============================================
CREATE TABLE public.contact_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(contact_id, label_id)
);

ALTER TABLE public.contact_labels ENABLE ROW LEVEL SECURITY;

-- =============================================
-- QUICK REPLIES TABLE
-- =============================================
CREATE TABLE public.quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    shortcut TEXT, -- e.g., "/greeting"
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- NOTES TABLE
-- =============================================
CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USAGE COUNTERS TABLE
-- =============================================
CREATE TABLE public.usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    messages_sent INTEGER NOT NULL DEFAULT 0,
    messages_received INTEGER NOT NULL DEFAULT 0,
    ai_messages INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, period_start)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================

-- Check if user is system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.system_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
$$;

-- Get all tenant IDs for current user
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid()
$$;

-- Check if user is member of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND tenant_id = _tenant_id
    )
$$;

-- Check if user is owner or manager of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_owner_or_manager(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND tenant_id = _tenant_id 
        AND role IN ('owner', 'manager')
    )
$$;

-- Check if user is owner of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() 
        AND tenant_id = _tenant_id 
        AND role = 'owner'
    )
$$;

-- =============================================
-- TIMESTAMP UPDATE TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quick_replies_updated_at BEFORE UPDATE ON public.quick_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_usage_counters_updated_at BEFORE UPDATE ON public.usage_counters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "System admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_system_admin());

-- SYSTEM ROLES POLICIES
CREATE POLICY "Users can view own system role" ON public.system_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System admins can manage system roles" ON public.system_roles FOR ALL USING (public.is_system_admin());

-- TENANTS POLICIES
CREATE POLICY "Members can view their tenants" ON public.tenants FOR SELECT USING (
    public.is_system_admin() OR id IN (SELECT public.get_user_tenant_ids())
);
CREATE POLICY "System admins can manage all tenants" ON public.tenants FOR ALL USING (public.is_system_admin());
CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their tenants" ON public.tenants FOR UPDATE USING (
    public.is_system_admin() OR owner_id = auth.uid()
);

-- USER ROLES POLICIES
CREATE POLICY "Users can view roles in their tenants" ON public.user_roles FOR SELECT USING (
    public.is_system_admin() OR user_id = auth.uid() OR tenant_id IN (SELECT public.get_user_tenant_ids())
);
CREATE POLICY "Owners/Managers can manage roles" ON public.user_roles FOR INSERT WITH CHECK (
    public.is_system_admin() OR (
        public.is_tenant_owner_or_manager(tenant_id) 
        AND user_id <> auth.uid() 
        AND role <> 'owner'
    )
);
CREATE POLICY "Owners/Managers can update roles" ON public.user_roles FOR UPDATE USING (
    public.is_system_admin() OR (
        public.is_tenant_owner(tenant_id) 
        AND role <> 'owner'
    )
);
CREATE POLICY "Owners can delete roles" ON public.user_roles FOR DELETE USING (
    public.is_system_admin() OR public.is_tenant_owner(tenant_id)
);

-- PLANS POLICIES (public read, admin write)
CREATE POLICY "Anyone can view active plans" ON public.plans FOR SELECT USING (is_active = true OR public.is_system_admin());
CREATE POLICY "System admins can manage plans" ON public.plans FOR ALL USING (public.is_system_admin());

-- SUBSCRIPTIONS POLICIES
CREATE POLICY "Members can view their subscription" ON public.subscriptions FOR SELECT USING (
    public.is_system_admin() OR tenant_id IN (SELECT public.get_user_tenant_ids())
);
CREATE POLICY "System admins can manage subscriptions" ON public.subscriptions FOR ALL USING (public.is_system_admin());

-- PAYMENTS POLICIES
CREATE POLICY "Owners can view their payments" ON public.payments FOR SELECT USING (
    public.is_system_admin() OR (tenant_id IN (SELECT public.get_user_tenant_ids()) AND public.is_tenant_owner(tenant_id))
);
CREATE POLICY "Owners can create payments" ON public.payments FOR INSERT WITH CHECK (
    public.is_system_admin() OR public.is_tenant_owner(tenant_id)
);
CREATE POLICY "System admins can manage payments" ON public.payments FOR ALL USING (public.is_system_admin());

-- WHATSAPP INSTANCES POLICIES
CREATE POLICY "Members can view instances" ON public.whatsapp_instances FOR SELECT USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Owners/Managers can manage instances" ON public.whatsapp_instances FOR INSERT WITH CHECK (
    public.is_system_admin() OR public.is_tenant_owner_or_manager(tenant_id)
);
CREATE POLICY "Owners/Managers can update instances" ON public.whatsapp_instances FOR UPDATE USING (
    public.is_system_admin() OR public.is_tenant_owner_or_manager(tenant_id)
);
CREATE POLICY "Owners/Managers can delete instances" ON public.whatsapp_instances FOR DELETE USING (
    public.is_system_admin() OR public.is_tenant_owner_or_manager(tenant_id)
);

-- CONTACTS POLICIES
CREATE POLICY "Members can view contacts" ON public.contacts FOR SELECT USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can manage contacts" ON public.contacts FOR INSERT WITH CHECK (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can update contacts" ON public.contacts FOR UPDATE USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Owners/Managers can delete contacts" ON public.contacts FOR DELETE USING (
    public.is_system_admin() OR public.is_tenant_owner_or_manager(tenant_id)
);

-- MESSAGES POLICIES
CREATE POLICY "Members can view messages" ON public.messages FOR SELECT USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can create messages" ON public.messages FOR INSERT WITH CHECK (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "System admins can update messages" ON public.messages FOR UPDATE USING (public.is_system_admin());
CREATE POLICY "System admins can delete messages" ON public.messages FOR DELETE USING (public.is_system_admin());

-- LABELS POLICIES
CREATE POLICY "Members can view labels" ON public.labels FOR SELECT USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can manage labels" ON public.labels FOR INSERT WITH CHECK (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can update labels" ON public.labels FOR UPDATE USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can delete labels" ON public.labels FOR DELETE USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);

-- CONTACT LABELS POLICIES
CREATE POLICY "Members can view contact labels" ON public.contact_labels FOR SELECT USING (
    public.is_system_admin() OR EXISTS (
        SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND public.is_tenant_member(c.tenant_id)
    )
);
CREATE POLICY "Members can manage contact labels" ON public.contact_labels FOR INSERT WITH CHECK (
    public.is_system_admin() OR EXISTS (
        SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND public.is_tenant_member(c.tenant_id)
    )
);
CREATE POLICY "Members can delete contact labels" ON public.contact_labels FOR DELETE USING (
    public.is_system_admin() OR EXISTS (
        SELECT 1 FROM public.contacts c WHERE c.id = contact_id AND public.is_tenant_member(c.tenant_id)
    )
);

-- QUICK REPLIES POLICIES
CREATE POLICY "Members can view quick replies" ON public.quick_replies FOR SELECT USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can manage quick replies" ON public.quick_replies FOR INSERT WITH CHECK (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can update quick replies" ON public.quick_replies FOR UPDATE USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can delete quick replies" ON public.quick_replies FOR DELETE USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);

-- NOTES POLICIES
CREATE POLICY "Members can view notes" ON public.notes FOR SELECT USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "Members can create notes" ON public.notes FOR INSERT WITH CHECK (
    public.is_system_admin() OR (public.is_tenant_member(tenant_id) AND user_id = auth.uid())
);
CREATE POLICY "Users can update own notes" ON public.notes FOR UPDATE USING (
    public.is_system_admin() OR user_id = auth.uid()
);
CREATE POLICY "Users can delete own notes" ON public.notes FOR DELETE USING (
    public.is_system_admin() OR user_id = auth.uid()
);

-- USAGE COUNTERS POLICIES
CREATE POLICY "Members can view usage" ON public.usage_counters FOR SELECT USING (
    public.is_system_admin() OR public.is_tenant_member(tenant_id)
);
CREATE POLICY "System manages usage" ON public.usage_counters FOR ALL USING (public.is_system_admin());

-- =============================================
-- INSERT DEFAULT PLANS
-- =============================================
INSERT INTO public.plans (name, description, price_monthly, max_instances, max_agents, max_messages_per_month, ai_enabled) VALUES
('Starter', 'Perfect for small businesses', 999.00, 1, 2, 1000, false),
('Growth', 'For growing teams', 2499.00, 3, 5, 5000, true),
('Pro', 'For large organizations', 4999.00, 10, 20, 20000, true);