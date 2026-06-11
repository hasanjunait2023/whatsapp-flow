-- Extend system_roles table with permissions and super admin flag
ALTER TABLE public.system_roles ADD COLUMN IF NOT EXISTS 
  is_super_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.system_roles ADD COLUMN IF NOT EXISTS 
  permissions JSONB DEFAULT '{}';

ALTER TABLE public.system_roles ADD COLUMN IF NOT EXISTS 
  granted_by UUID REFERENCES auth.users(id);

ALTER TABLE public.system_roles ADD COLUMN IF NOT EXISTS 
  granted_at TIMESTAMPTZ DEFAULT now();

-- Create admin_access_requests table for approval workflow
CREATE TABLE IF NOT EXISTS public.admin_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  permissions JSONB DEFAULT '{}',
  reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique partial index for pending requests (only one pending per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_access_requests_pending 
ON public.admin_access_requests (user_id) 
WHERE status = 'pending';

-- Enable RLS on admin_access_requests
ALTER TABLE public.admin_access_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin' 
    AND is_super_admin = TRUE
  )
$$;

-- Helper function to get admin permissions
CREATE OR REPLACE FUNCTION public.get_admin_permissions()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT permissions FROM public.system_roles 
     WHERE user_id = auth.uid() AND role = 'admin'),
    '{}'::JSONB
  )
$$;

-- RLS Policies for admin_access_requests

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.admin_access_requests
FOR SELECT
TO authenticated
USING (public.is_system_admin());

-- Admins can insert requests
CREATE POLICY "Admins can create requests"
ON public.admin_access_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_system_admin() 
  AND requested_by = auth.uid()
);

-- Only super admins can update requests (approve/reject)
CREATE POLICY "Super admins can update requests"
ON public.admin_access_requests
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Only super admins can delete requests
CREATE POLICY "Super admins can delete requests"
ON public.admin_access_requests
FOR DELETE
TO authenticated
USING (public.is_super_admin());

-- Update system_roles RLS to allow super admins to modify permissions
DROP POLICY IF EXISTS "Super admins can update roles" ON public.system_roles;
CREATE POLICY "Super admins can update roles"
ON public.system_roles
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Auto-promote first admin to super admin
DO $$
BEGIN
  -- If there are existing admins but no super admin, make the first one super admin
  IF EXISTS (SELECT 1 FROM public.system_roles WHERE role = 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.system_roles WHERE role = 'admin' AND is_super_admin = TRUE) 
  THEN
    UPDATE public.system_roles 
    SET is_super_admin = TRUE,
        permissions = '{
          "dashboard": true,
          "tenants": true,
          "users": true,
          "instances": true,
          "leads": true,
          "accounts": true,
          "payments": true,
          "subscriptions": true,
          "plans": true,
          "audit_logs": true,
          "settings": true,
          "admin_management": true
        }'::JSONB
    WHERE id = (
      SELECT id FROM public.system_roles 
      WHERE role = 'admin' 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
END $$;