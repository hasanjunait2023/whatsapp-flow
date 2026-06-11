-- Fix user_roles INSERT policy to allow tenant owners to add themselves
-- The current policy prevents the initial owner assignment

-- Drop the problematic policy
DROP POLICY IF EXISTS "Owners/Managers can manage roles" ON public.user_roles;

-- Create a new policy that allows:
-- 1. System admins (full access)
-- 2. Users adding themselves as owner to a tenant they created (owner_id = auth.uid())
-- 3. Existing owners/managers adding others (not as owner role, not themselves)
CREATE POLICY "Users can add roles" ON public.user_roles 
FOR INSERT WITH CHECK (
    public.is_system_admin() 
    OR (
        -- Allow tenant creator to add themselves as owner
        EXISTS (
            SELECT 1 FROM public.tenants 
            WHERE tenants.id = tenant_id 
            AND tenants.owner_id = auth.uid()
        )
        AND user_id = auth.uid() 
        AND role = 'owner'
    )
    OR (
        -- Allow existing owners/managers to add other team members (not as owner)
        public.is_tenant_owner_or_manager(tenant_id) 
        AND user_id <> auth.uid() 
        AND role <> 'owner'
    )
);