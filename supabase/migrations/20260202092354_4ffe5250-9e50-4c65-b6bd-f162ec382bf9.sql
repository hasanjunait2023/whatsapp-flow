-- =====================================================
-- SERVICE TASK MANAGEMENT - RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.service_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_card_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_chat_message_links ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - service_boards
-- =====================================================

CREATE POLICY "service_boards_select"
  ON public.service_boards FOR SELECT
  USING (
    is_service_board_member(id, auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "service_boards_insert"
  ON public.service_boards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND tenant_id = service_boards.tenant_id
    )
  );

CREATE POLICY "service_boards_update"
  ON public.service_boards FOR UPDATE
  USING (get_service_board_role(id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "service_boards_delete"
  ON public.service_boards FOR DELETE
  USING (get_service_board_role(id, auth.uid()) = 'owner');

-- =====================================================
-- RLS POLICIES - service_board_members
-- =====================================================

CREATE POLICY "service_board_members_select"
  ON public.service_board_members FOR SELECT
  USING (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_board_members_insert"
  ON public.service_board_members FOR INSERT
  WITH CHECK (
    get_service_board_role(board_id, auth.uid()) IN ('owner', 'admin')
    OR NOT EXISTS (SELECT 1 FROM service_board_members sbm WHERE sbm.board_id = service_board_members.board_id)
  );

CREATE POLICY "service_board_members_update"
  ON public.service_board_members FOR UPDATE
  USING (get_service_board_role(board_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "service_board_members_delete"
  ON public.service_board_members FOR DELETE
  USING (
    get_service_board_role(board_id, auth.uid()) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- =====================================================
-- RLS POLICIES - service_lists
-- =====================================================

CREATE POLICY "service_lists_select"
  ON public.service_lists FOR SELECT
  USING (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_lists_insert"
  ON public.service_lists FOR INSERT
  WITH CHECK (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_lists_update"
  ON public.service_lists FOR UPDATE
  USING (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_lists_delete"
  ON public.service_lists FOR DELETE
  USING (get_service_board_role(board_id, auth.uid()) IN ('owner', 'admin'));

-- =====================================================
-- RLS POLICIES - service_cards
-- =====================================================

CREATE POLICY "service_cards_select"
  ON public.service_cards FOR SELECT
  USING (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_cards_insert"
  ON public.service_cards FOR INSERT
  WITH CHECK (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_cards_update"
  ON public.service_cards FOR UPDATE
  USING (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_cards_delete"
  ON public.service_cards FOR DELETE
  USING (
    created_by = auth.uid()
    OR get_service_board_role(board_id, auth.uid()) IN ('owner', 'admin')
  );

-- =====================================================
-- RLS POLICIES - service_card_members
-- =====================================================

CREATE POLICY "service_card_members_select"
  ON public.service_card_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_card_members_insert"
  ON public.service_card_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_card_members_delete"
  ON public.service_card_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - service_labels
-- =====================================================

CREATE POLICY "service_labels_select"
  ON public.service_labels FOR SELECT
  USING (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_labels_insert"
  ON public.service_labels FOR INSERT
  WITH CHECK (is_service_board_member(board_id, auth.uid()));

CREATE POLICY "service_labels_update"
  ON public.service_labels FOR UPDATE
  USING (get_service_board_role(board_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "service_labels_delete"
  ON public.service_labels FOR DELETE
  USING (get_service_board_role(board_id, auth.uid()) IN ('owner', 'admin'));

-- =====================================================
-- RLS POLICIES - service_card_labels
-- =====================================================

CREATE POLICY "service_card_labels_select"
  ON public.service_card_labels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_card_labels_insert"
  ON public.service_card_labels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_card_labels_delete"
  ON public.service_card_labels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - service_card_comments
-- =====================================================

CREATE POLICY "service_card_comments_select"
  ON public.service_card_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_card_comments_insert"
  ON public.service_card_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "service_card_comments_update"
  ON public.service_card_comments FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "service_card_comments_delete"
  ON public.service_card_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND get_service_board_role(c.board_id, auth.uid()) IN ('owner', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - service_checklists
-- =====================================================

CREATE POLICY "service_checklists_select"
  ON public.service_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_checklists_insert"
  ON public.service_checklists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_checklists_update"
  ON public.service_checklists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_checklists_delete"
  ON public.service_checklists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - service_checklist_items
-- =====================================================

CREATE POLICY "service_checklist_items_select"
  ON public.service_checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_checklists cl
      JOIN service_cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_checklist_items_insert"
  ON public.service_checklist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_checklists cl
      JOIN service_cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_checklist_items_update"
  ON public.service_checklist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM service_checklists cl
      JOIN service_cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_checklist_items_delete"
  ON public.service_checklist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM service_checklists cl
      JOIN service_cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - service_attachments
-- =====================================================

CREATE POLICY "service_attachments_select"
  ON public.service_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_attachments_insert"
  ON public.service_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "service_attachments_delete"
  ON public.service_attachments FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND get_service_board_role(c.board_id, auth.uid()) IN ('owner', 'admin')
    )
  );

-- =====================================================
-- RLS POLICIES - service_card_activity
-- =====================================================

CREATE POLICY "service_card_activity_select"
  ON public.service_card_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_card_activity_insert"
  ON public.service_card_activity FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - service_chat_message_links
-- =====================================================

CREATE POLICY "service_chat_message_links_select"
  ON public.service_chat_message_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
  );

CREATE POLICY "service_chat_message_links_insert"
  ON public.service_chat_message_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_cards c 
      WHERE c.id = card_id AND is_service_board_member(c.board_id, auth.uid())
    )
    AND created_by = auth.uid()
  );