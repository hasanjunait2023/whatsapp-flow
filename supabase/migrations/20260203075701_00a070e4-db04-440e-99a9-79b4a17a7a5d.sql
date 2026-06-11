-- Recreate the INSERT policy for internal_chat_rooms that was dropped
-- Allow tenant members OR system admins for the system tenant
CREATE POLICY "Members can create rooms in their tenant or admins in system tenant"
ON public.internal_chat_rooms
FOR INSERT
WITH CHECK (
  is_tenant_member(tenant_id)
  OR 
  (
    tenant_id = '5a0ad1d5-588a-473a-af82-724e69890074'::uuid
    AND EXISTS (
      SELECT 1 FROM system_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- Recreate the INSERT policy for internal_chat_members that was dropped
CREATE POLICY "Room members can add new members or admins in system tenant"
ON public.internal_chat_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM internal_chat_rooms r
    WHERE r.id = room_id
    AND (
      is_tenant_member(r.tenant_id)
      OR (
        r.tenant_id = '5a0ad1d5-588a-473a-af82-724e69890074'::uuid
        AND EXISTS (
          SELECT 1 FROM system_roles
          WHERE user_id = auth.uid()
          AND role = 'admin'
        )
      )
    )
  )
);