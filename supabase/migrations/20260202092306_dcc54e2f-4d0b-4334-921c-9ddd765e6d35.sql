-- =====================================================
-- SERVICE TASK MANAGEMENT SYSTEM (Trello-like)
-- Phase 1: Database Schema - TABLES AND INDEXES FIRST
-- =====================================================

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. service_boards
CREATE TABLE public.service_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- 2. service_board_members
CREATE TABLE public.service_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.service_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- 3. service_lists
CREATE TABLE public.service_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.service_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position_numeric DECIMAL(20,10) NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. service_cards
CREATE TABLE public.service_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.service_boards(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES public.service_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position_numeric DECIMAL(20,10) NOT NULL DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'review', 'done', 'blocked')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- 5. service_card_members
CREATE TABLE public.service_card_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.service_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

-- 6. service_labels
CREATE TABLE public.service_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.service_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, name)
);

-- 7. service_card_labels
CREATE TABLE public.service_card_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.service_cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.service_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, label_id)
);

-- 8. service_card_comments
CREATE TABLE public.service_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.service_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. service_checklists
CREATE TABLE public.service_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.service_cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position_numeric DECIMAL(20,10) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. service_checklist_items
CREATE TABLE public.service_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.service_checklists(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  position_numeric DECIMAL(20,10) NOT NULL DEFAULT 0,
  done_at TIMESTAMPTZ,
  done_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. service_attachments
CREATE TABLE public.service_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.service_cards(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. service_card_activity
CREATE TABLE public.service_card_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.service_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. service_chat_message_links
CREATE TABLE public.service_chat_message_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.service_cards(id) ON DELETE CASCADE,
  room_id UUID NOT NULL,
  chat_message_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, chat_message_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_service_lists_board_position ON public.service_lists(board_id, position_numeric);
CREATE INDEX idx_service_cards_list_position ON public.service_cards(list_id, position_numeric);
CREATE INDEX idx_service_cards_board_updated ON public.service_cards(board_id, updated_at DESC);
CREATE INDEX idx_service_card_members_card ON public.service_card_members(card_id, user_id);
CREATE INDEX idx_service_board_members_board ON public.service_board_members(board_id, user_id);
CREATE INDEX idx_service_board_members_user ON public.service_board_members(user_id, board_id);
CREATE INDEX idx_service_comments_card ON public.service_card_comments(card_id, created_at DESC);
CREATE INDEX idx_service_activity_card ON public.service_card_activity(card_id, created_at DESC);
CREATE INDEX idx_service_chat_links ON public.service_chat_message_links(tenant_id, chat_message_id);
CREATE INDEX idx_service_chat_links_card ON public.service_chat_message_links(card_id);
CREATE INDEX idx_service_boards_tenant ON public.service_boards(tenant_id);
CREATE INDEX idx_service_lists_tenant ON public.service_lists(tenant_id, board_id);
CREATE INDEX idx_service_cards_tenant ON public.service_cards(tenant_id, board_id);
CREATE INDEX idx_service_labels_board ON public.service_labels(board_id);
CREATE INDEX idx_service_checklists_card ON public.service_checklists(card_id, position_numeric);
CREATE INDEX idx_service_checklist_items ON public.service_checklist_items(checklist_id, position_numeric);
CREATE INDEX idx_service_attachments_card ON public.service_attachments(card_id);

-- =====================================================
-- HELPER FUNCTIONS (after tables exist)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_service_board_member(p_board_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM service_board_members
    WHERE board_id = p_board_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.get_service_board_role(p_board_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM service_board_members
  WHERE board_id = p_board_id AND user_id = p_user_id;
$$;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_service_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_service_boards_updated_at
  BEFORE UPDATE ON public.service_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_service_updated_at();

CREATE TRIGGER update_service_lists_updated_at
  BEFORE UPDATE ON public.service_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_service_updated_at();

CREATE TRIGGER update_service_cards_updated_at
  BEFORE UPDATE ON public.service_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_service_updated_at();

CREATE TRIGGER update_service_comments_updated_at
  BEFORE UPDATE ON public.service_card_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_service_updated_at();

-- =====================================================
-- ADD PERMISSION COLUMN
-- =====================================================

ALTER TABLE public.team_member_permissions 
ADD COLUMN IF NOT EXISTS can_access_service_boards BOOLEAN DEFAULT false;

-- =====================================================
-- ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.service_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_card_comments;