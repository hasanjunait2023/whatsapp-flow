-- First, create a security definer function to check room membership
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = p_room_id AND user_id = p_user_id
  )
$$;

-- Create a function to check if user is room admin
CREATE OR REPLACE FUNCTION public.is_room_admin(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = p_room_id AND user_id = p_user_id AND is_admin = true
  )
$$;

-- Create a function to check if user is room creator
CREATE OR REPLACE FUNCTION public.is_room_creator(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_chat_rooms
    WHERE id = p_room_id AND created_by = p_user_id
  )
$$;

-- Now drop the existing policies
DROP POLICY IF EXISTS "Room members can view members" ON public.internal_chat_members;
DROP POLICY IF EXISTS "Room admins can add members" ON public.internal_chat_members;
DROP POLICY IF EXISTS "Room admins can update member roles" ON public.internal_chat_members;
DROP POLICY IF EXISTS "Room admins can remove members" ON public.internal_chat_members;

-- Recreate policies using security definer functions (no recursion)
CREATE POLICY "Room members can view members"
ON public.internal_chat_members
FOR SELECT
USING (
  public.is_room_member(room_id, auth.uid())
);

CREATE POLICY "Room admins can add members"
ON public.internal_chat_members
FOR INSERT
WITH CHECK (
  public.is_room_admin(room_id, auth.uid()) 
  OR (user_id = auth.uid() AND public.is_room_creator(room_id, auth.uid()))
);

CREATE POLICY "Room admins can update member roles"
ON public.internal_chat_members
FOR UPDATE
USING (
  public.is_room_admin(room_id, auth.uid())
);

CREATE POLICY "Room admins can remove members"
ON public.internal_chat_members
FOR DELETE
USING (
  public.is_room_admin(room_id, auth.uid()) OR user_id = auth.uid()
);