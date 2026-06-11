-- Fix tenants INSERT policy
-- The FOR ALL policy without WITH CHECK may be blocking inserts

-- Drop the conflicting policies
DROP POLICY IF EXISTS "System admins can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create separate policies for each operation for system admins
CREATE POLICY "System admins can select all tenants" ON public.tenants 
FOR SELECT USING (public.is_system_admin());

CREATE POLICY "System admins can insert tenants" ON public.tenants 
FOR INSERT WITH CHECK (public.is_system_admin());

CREATE POLICY "System admins can update tenants" ON public.tenants 
FOR UPDATE USING (public.is_system_admin());

CREATE POLICY "System admins can delete tenants" ON public.tenants 
FOR DELETE USING (public.is_system_admin());

-- Create policy for regular users to create their own tenants
CREATE POLICY "Users can create own tenants" ON public.tenants 
FOR INSERT WITH CHECK (auth.uid() = owner_id);