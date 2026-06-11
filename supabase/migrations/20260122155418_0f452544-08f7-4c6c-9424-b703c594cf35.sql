-- Fix tenant creation returning/select visibility
-- When inserting with RETURNING (Supabase .select()), the new row must also be visible via SELECT policies.
-- Add a SELECT policy to allow the tenant owner to view their tenant immediately.

DROP POLICY IF EXISTS "Owners can view owned tenants" ON public.tenants;

CREATE POLICY "Owners can view owned tenants"
ON public.tenants
FOR SELECT
USING (owner_id = auth.uid());