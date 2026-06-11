-- Drop the problematic SELECT policy on user_roles
DROP POLICY IF EXISTS "Users can view roles in their tenants" ON public.user_roles;

-- Create a simpler policy that avoids recursion
-- Users can see their own roles directly (no need to call get_user_tenant_ids which causes recursion)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (
  is_system_admin() OR 
  user_id = auth.uid()
);

-- Separately, allow users to see other members of tenants they belong to
CREATE POLICY "Users can view roles of teammates"
ON public.user_roles
FOR SELECT
USING (
  tenant_id IN (
    SELECT ur.tenant_id 
    FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid()
  )
);