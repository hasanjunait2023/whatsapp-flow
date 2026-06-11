-- Add RLS policy to allow tenant members to view profiles of their teammates
-- This fixes the "Unknown User" issue in the Team Members widget

-- Policy: Users can view profiles of team members in the same tenant
CREATE POLICY "Tenant members can view teammate profiles" 
ON public.profiles 
FOR SELECT 
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- User can see profiles of users who share a tenant with them
  EXISTS (
    SELECT 1 
    FROM public.user_roles my_role
    INNER JOIN public.user_roles their_role ON my_role.tenant_id = their_role.tenant_id
    WHERE my_role.user_id = auth.uid()
    AND their_role.user_id = profiles.id
  )
);

-- Drop the old restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;