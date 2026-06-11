-- Drop the old conflicting INSERT policy
DROP POLICY IF EXISTS "Members can create rooms in their tenant" ON public.internal_chat_rooms;