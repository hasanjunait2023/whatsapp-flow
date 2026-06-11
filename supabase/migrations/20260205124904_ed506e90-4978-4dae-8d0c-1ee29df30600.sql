-- Update RLS policies for whatsapp_groups to allow system admins

-- Drop existing policies
DROP POLICY IF EXISTS "Tenants can view their own groups" ON whatsapp_groups;
DROP POLICY IF EXISTS "Tenants can insert their own groups" ON whatsapp_groups;
DROP POLICY IF EXISTS "Tenants can update their own groups" ON whatsapp_groups;
DROP POLICY IF EXISTS "Tenants can delete their own groups" ON whatsapp_groups;

-- Recreate policies with system admin access
CREATE POLICY "Tenants can view their own groups" ON whatsapp_groups
  FOR SELECT
  USING (
    is_system_admin() OR
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenants can insert their own groups" ON whatsapp_groups
  FOR INSERT
  WITH CHECK (
    is_system_admin() OR
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenants can update their own groups" ON whatsapp_groups
  FOR UPDATE
  USING (
    is_system_admin() OR
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenants can delete their own groups" ON whatsapp_groups
  FOR DELETE
  USING (
    is_system_admin() OR
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Also update whatsapp_group_participants RLS to allow system admins
DROP POLICY IF EXISTS "Tenants can view their group participants" ON whatsapp_group_participants;
DROP POLICY IF EXISTS "Tenants can insert their group participants" ON whatsapp_group_participants;
DROP POLICY IF EXISTS "Tenants can update their group participants" ON whatsapp_group_participants;
DROP POLICY IF EXISTS "Tenants can delete their group participants" ON whatsapp_group_participants;

CREATE POLICY "Tenants can view their group participants" ON whatsapp_group_participants
  FOR SELECT
  USING (
    is_system_admin() OR
    group_id IN (
      SELECT id FROM whatsapp_groups 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Tenants can insert their group participants" ON whatsapp_group_participants
  FOR INSERT
  WITH CHECK (
    is_system_admin() OR
    group_id IN (
      SELECT id FROM whatsapp_groups 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Tenants can update their group participants" ON whatsapp_group_participants
  FOR UPDATE
  USING (
    is_system_admin() OR
    group_id IN (
      SELECT id FROM whatsapp_groups 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Tenants can delete their group participants" ON whatsapp_group_participants
  FOR DELETE
  USING (
    is_system_admin() OR
    group_id IN (
      SELECT id FROM whatsapp_groups 
      WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );