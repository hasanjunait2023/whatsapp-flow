-- Add created_by to profiles to track who created the account
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create enum for chat room types
CREATE TYPE chat_room_type AS ENUM ('direct', 'group');

-- Create enum for presence status
CREATE TYPE presence_status AS ENUM ('online', 'away', 'offline');

-- Create internal_chat_rooms table
CREATE TABLE public.internal_chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT,
  type chat_room_type NOT NULL DEFAULT 'direct',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create internal_chat_members table
CREATE TABLE public.internal_chat_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.internal_chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(room_id, user_id)
);

-- Create internal_messages table
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.internal_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT,
  content_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  media_filename TEXT,
  reply_to_id UUID REFERENCES public.internal_messages(id) ON DELETE SET NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Create user_presence table
CREATE TABLE public.user_presence (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID NOT NULL,
  status presence_status NOT NULL DEFAULT 'offline',
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_typing_in UUID REFERENCES public.internal_chat_rooms(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_internal_chat_rooms_tenant ON public.internal_chat_rooms(tenant_id);
CREATE INDEX idx_internal_chat_members_room ON public.internal_chat_members(room_id);
CREATE INDEX idx_internal_chat_members_user ON public.internal_chat_members(user_id);
CREATE INDEX idx_internal_messages_room ON public.internal_messages(room_id);
CREATE INDEX idx_internal_messages_sender ON public.internal_messages(sender_id);
CREATE INDEX idx_internal_messages_created ON public.internal_messages(created_at DESC);
CREATE INDEX idx_user_presence_tenant ON public.user_presence(tenant_id);

-- Enable RLS on all tables
ALTER TABLE public.internal_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for internal_chat_rooms
CREATE POLICY "Users can view rooms they are members of"
ON public.internal_chat_rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_chat_rooms.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Members can create rooms in their tenant"
ON public.internal_chat_rooms FOR INSERT
WITH CHECK (
  is_tenant_member(tenant_id)
);

CREATE POLICY "Room admins can update rooms"
ON public.internal_chat_rooms FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_chat_rooms.id AND user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Room admins can delete rooms"
ON public.internal_chat_rooms FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_chat_rooms.id AND user_id = auth.uid() AND is_admin = true
  )
);

-- RLS Policies for internal_chat_members
CREATE POLICY "Room members can view members"
ON public.internal_chat_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members m2
    WHERE m2.room_id = internal_chat_members.room_id AND m2.user_id = auth.uid()
  )
);

CREATE POLICY "Room admins can add members"
ON public.internal_chat_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_chat_members.room_id AND user_id = auth.uid() AND is_admin = true
  ) OR
  (
    -- Allow adding self when creating a new room
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.internal_chat_rooms
      WHERE id = internal_chat_members.room_id AND created_by = auth.uid()
    )
  )
);

CREATE POLICY "Room admins can remove members"
ON public.internal_chat_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_chat_members.room_id AND user_id = auth.uid() AND is_admin = true
  ) OR user_id = auth.uid()
);

CREATE POLICY "Room admins can update member roles"
ON public.internal_chat_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_chat_members.room_id AND user_id = auth.uid() AND is_admin = true
  )
);

-- RLS Policies for internal_messages
CREATE POLICY "Room members can view messages"
ON public.internal_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_messages.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Room members can send messages"
ON public.internal_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.internal_chat_members
    WHERE room_id = internal_messages.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Message senders can update their messages"
ON public.internal_messages FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "Message senders can delete their messages"
ON public.internal_messages FOR DELETE
USING (sender_id = auth.uid());

-- RLS Policies for user_presence
CREATE POLICY "Tenant members can view presence"
ON public.user_presence FOR SELECT
USING (is_tenant_member(tenant_id));

CREATE POLICY "Users can update their own presence"
ON public.user_presence FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own presence"
ON public.user_presence FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger for rooms
CREATE TRIGGER update_internal_chat_rooms_updated_at
BEFORE UPDATE ON public.internal_chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_chat_members;