-- Fix infinite recursion in user_roles RLS: avoid self-referencing subqueries in policies.

-- Drop the recursive policy introduced previously
DROP POLICY IF EXISTS "Users can view roles of teammates" ON public.user_roles;

-- Recreate teammate visibility using SECURITY DEFINER function (no RLS recursion)
-- Allows a user to see all roles within any tenant they are a member of.
CREATE POLICY "Users can view roles of teammates"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  is_system_admin()
  OR user_id = auth.uid()
  OR tenant_id IN (SELECT public.get_user_tenant_ids())
);