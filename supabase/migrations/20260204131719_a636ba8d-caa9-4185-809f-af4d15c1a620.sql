-- =====================================================
-- Phase 1: High-Volume Messaging Performance Architecture
-- =====================================================

-- 1.1 Create contact_thread_state table (fast inbox rendering)
CREATE TABLE IF NOT EXISTS public.contact_thread_state (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL UNIQUE,
  contact_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (contact_type IN ('whatsapp', 'facebook')),
  instance_id UUID,
  
  -- Contact metadata (denormalized for speed)
  contact_name TEXT,
  contact_phone TEXT,
  contact_avatar_url TEXT,
  
  -- Thread state
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_preview TEXT,
  last_message_direction TEXT CHECK (last_message_direction IN ('inbound', 'outbound')),
  last_message_type TEXT DEFAULT 'text',
  last_inbound_at TIMESTAMPTZ,
  
  -- Counts & flags
  unread_count INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  
  -- Assignment & status
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  needs_handoff BOOLEAN NOT NULL DEFAULT false,
  handoff_reason TEXT,
  
  -- Labels (denormalized array for filtering)
  label_ids UUID[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (tenant_id, contact_id)
);

-- Indexes for inbox queries
CREATE INDEX IF NOT EXISTS idx_thread_state_inbox 
ON contact_thread_state (tenant_id, is_archived, last_message_at DESC)
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_thread_state_assigned 
ON contact_thread_state (tenant_id, assigned_to, is_archived, last_message_at DESC)
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_thread_state_unread 
ON contact_thread_state (tenant_id, unread_count, last_message_at DESC)
WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_thread_state_handoff
ON contact_thread_state (tenant_id)
WHERE needs_handoff = true;

CREATE INDEX IF NOT EXISTS idx_thread_state_type
ON contact_thread_state (tenant_id, contact_type, is_archived, last_message_at DESC);

-- 1.2 Create tenant_daily_stats table (aggregated counters)
CREATE TABLE IF NOT EXISTS public.tenant_daily_stats (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  
  inbound_count INTEGER NOT NULL DEFAULT 0,
  outbound_count INTEGER NOT NULL DEFAULT 0,
  new_conversations INTEGER NOT NULL DEFAULT 0,
  active_conversations INTEGER NOT NULL DEFAULT 0,
  
  wa_inbound INTEGER NOT NULL DEFAULT 0,
  wa_outbound INTEGER NOT NULL DEFAULT 0,
  fb_inbound INTEGER NOT NULL DEFAULT 0,
  fb_outbound INTEGER NOT NULL DEFAULT 0,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (tenant_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_lookup
ON tenant_daily_stats (tenant_id, stat_date DESC);

-- 1.3 Create message_raw_payloads table (heavy payload storage)
CREATE TABLE IF NOT EXISTS public.message_raw_payloads (
  message_id UUID PRIMARY KEY,
  raw_payload JSONB,
  provider_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Add text_preview columns to messages tables
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS text_preview TEXT;
ALTER TABLE public.fb_messages ADD COLUMN IF NOT EXISTS text_preview TEXT;

-- 1.5 Create optimized indexes for keyset pagination
DROP INDEX IF EXISTS idx_messages_contact_sent;
CREATE INDEX IF NOT EXISTS idx_messages_thread_keyset 
ON messages (contact_id, sent_at DESC, id DESC);

DROP INDEX IF EXISTS idx_fb_messages_contact_sent;
CREATE INDEX IF NOT EXISTS idx_fb_messages_thread_keyset 
ON fb_messages (contact_id, sent_at DESC, id DESC);

-- Idempotency indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_wa_id_unique
ON messages (wa_message_id) WHERE wa_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fb_messages_mid_unique
ON fb_messages (mid) WHERE mid IS NOT NULL;

-- 1.6 Enable RLS on new tables
ALTER TABLE contact_thread_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_raw_payloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_thread_state
CREATE POLICY "Tenant members can view thread states" ON contact_thread_state
FOR SELECT USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can update thread states" ON contact_thread_state
FOR UPDATE USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "Tenant members can insert thread states" ON contact_thread_state
FOR INSERT WITH CHECK (is_system_admin() OR is_tenant_member(tenant_id));

-- RLS Policies for tenant_daily_stats
CREATE POLICY "Tenant members can view stats" ON tenant_daily_stats
FOR SELECT USING (is_system_admin() OR is_tenant_member(tenant_id));

CREATE POLICY "System can manage stats" ON tenant_daily_stats
FOR ALL USING (is_system_admin());

-- RLS for message_raw_payloads (join to messages for access)
CREATE POLICY "Access via message ownership" ON message_raw_payloads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.id = message_id 
    AND (is_system_admin() OR is_tenant_member(m.tenant_id))
  )
);

-- 1.7 Keyset pagination functions

-- Get inbox contacts with keyset pagination
CREATE OR REPLACE FUNCTION get_inbox_contacts(
  p_tenant_id UUID,
  p_contact_type TEXT DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_is_archived BOOLEAN DEFAULT false,
  p_unread_only BOOLEAN DEFAULT false,
  p_cursor_timestamp TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  contact_id UUID,
  contact_type TEXT,
  instance_id UUID,
  contact_name TEXT,
  contact_phone TEXT,
  contact_avatar_url TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_direction TEXT,
  last_message_type TEXT,
  unread_count INTEGER,
  total_messages INTEGER,
  assigned_to UUID,
  is_archived BOOLEAN,
  is_blocked BOOLEAN,
  needs_handoff BOOLEAN,
  handoff_reason TEXT,
  label_ids UUID[],
  created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    cts.contact_id,
    cts.contact_type,
    cts.instance_id,
    cts.contact_name,
    cts.contact_phone,
    cts.contact_avatar_url,
    cts.last_message_at,
    cts.last_message_preview,
    cts.last_message_direction,
    cts.last_message_type,
    cts.unread_count,
    cts.total_messages,
    cts.assigned_to,
    cts.is_archived,
    cts.is_blocked,
    cts.needs_handoff,
    cts.handoff_reason,
    cts.label_ids,
    cts.created_at
  FROM contact_thread_state cts
  WHERE cts.tenant_id = p_tenant_id
    AND cts.is_archived = p_is_archived
    AND (p_contact_type IS NULL OR cts.contact_type = p_contact_type)
    AND (p_assigned_to IS NULL OR cts.assigned_to = p_assigned_to)
    AND (p_unread_only = false OR cts.unread_count > 0)
    AND (
      p_cursor_timestamp IS NULL 
      OR (cts.last_message_at, cts.contact_id) < (p_cursor_timestamp, p_cursor_id)
    )
  ORDER BY cts.last_message_at DESC, cts.contact_id DESC
  LIMIT p_limit;
$$;

-- Get thread messages with keyset pagination (WhatsApp)
CREATE OR REPLACE FUNCTION get_thread_messages(
  p_contact_id UUID,
  p_cursor_timestamp TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_direction TEXT DEFAULT 'older'
)
RETURNS TABLE (
  id UUID,
  wa_message_id TEXT,
  direction TEXT,
  status TEXT,
  content_type TEXT,
  content TEXT,
  text_preview TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  media_filename TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  reply_to_id UUID,
  is_from_ai BOOLEAN,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  sent_by_user_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    m.id,
    m.wa_message_id,
    m.direction::TEXT,
    m.status::TEXT,
    m.content_type,
    m.content,
    m.text_preview,
    m.media_url,
    m.media_mime_type,
    m.media_filename,
    m.location_lat,
    m.location_lng,
    m.reply_to_id,
    m.is_from_ai,
    m.error_message,
    m.sent_at,
    m.delivered_at,
    m.read_at,
    m.sent_by_user_id
  FROM messages m
  WHERE m.contact_id = p_contact_id
    AND (
      p_cursor_timestamp IS NULL 
      OR (
        CASE 
          WHEN p_direction = 'older' THEN (m.sent_at, m.id) < (p_cursor_timestamp, p_cursor_id)
          ELSE (m.sent_at, m.id) > (p_cursor_timestamp, p_cursor_id)
        END
      )
    )
  ORDER BY 
    CASE WHEN p_direction = 'older' THEN m.sent_at END DESC,
    CASE WHEN p_direction = 'older' THEN m.id END DESC,
    CASE WHEN p_direction = 'newer' THEN m.sent_at END ASC,
    CASE WHEN p_direction = 'newer' THEN m.id END ASC
  LIMIT p_limit;
$$;

-- Get FB thread messages with keyset pagination
CREATE OR REPLACE FUNCTION get_fb_thread_messages(
  p_contact_id UUID,
  p_cursor_timestamp TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_direction TEXT DEFAULT 'older'
)
RETURNS TABLE (
  id UUID,
  mid TEXT,
  direction TEXT,
  status TEXT,
  content_type TEXT,
  content TEXT,
  text_preview TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  media_filename TEXT,
  reply_to_id UUID,
  is_from_ai BOOLEAN,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  sent_by_user_id UUID
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    m.id,
    m.mid,
    m.direction::TEXT,
    m.status::TEXT,
    m.content_type,
    m.content,
    m.text_preview,
    m.media_url,
    m.media_mime_type,
    m.media_filename,
    m.reply_to_id,
    m.is_from_ai,
    m.error_message,
    m.sent_at,
    m.delivered_at,
    m.read_at,
    m.sent_by_user_id
  FROM fb_messages m
  WHERE m.contact_id = p_contact_id
    AND (
      p_cursor_timestamp IS NULL 
      OR (
        CASE 
          WHEN p_direction = 'older' THEN (m.sent_at, m.id) < (p_cursor_timestamp, p_cursor_id)
          ELSE (m.sent_at, m.id) > (p_cursor_timestamp, p_cursor_id)
        END
      )
    )
  ORDER BY 
    CASE WHEN p_direction = 'older' THEN m.sent_at END DESC,
    CASE WHEN p_direction = 'older' THEN m.id END DESC,
    CASE WHEN p_direction = 'newer' THEN m.sent_at END ASC,
    CASE WHEN p_direction = 'newer' THEN m.id END ASC
  LIMIT p_limit;
$$;

-- 1.8 Counter update functions

-- Lightweight UPSERT for thread state on message insert
CREATE OR REPLACE FUNCTION update_thread_state_on_message(
  p_contact_id UUID,
  p_last_message_at TIMESTAMPTZ,
  p_last_message_preview TEXT,
  p_last_message_direction TEXT,
  p_last_message_type TEXT DEFAULT 'text',
  p_unread_delta INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE contact_thread_state
  SET 
    last_message_at = GREATEST(last_message_at, p_last_message_at),
    last_message_preview = CASE 
      WHEN p_last_message_at >= last_message_at THEN p_last_message_preview 
      ELSE last_message_preview 
    END,
    last_message_direction = CASE 
      WHEN p_last_message_at >= last_message_at THEN p_last_message_direction 
      ELSE last_message_direction 
    END,
    last_message_type = CASE 
      WHEN p_last_message_at >= last_message_at THEN p_last_message_type 
      ELSE last_message_type 
    END,
    last_inbound_at = CASE 
      WHEN p_last_message_direction = 'inbound' AND p_last_message_at >= COALESCE(last_inbound_at, '1970-01-01'::TIMESTAMPTZ)
      THEN p_last_message_at 
      ELSE last_inbound_at 
    END,
    unread_count = unread_count + p_unread_delta,
    total_messages = total_messages + 1,
    updated_at = now()
  WHERE contact_id = p_contact_id;
END;
$$;

-- Daily stats increment
CREATE OR REPLACE FUNCTION increment_daily_stats(
  p_tenant_id UUID,
  p_direction TEXT,
  p_channel TEXT DEFAULT 'whatsapp',
  p_is_new_conversation BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO tenant_daily_stats (tenant_id, stat_date, 
    inbound_count, outbound_count, 
    new_conversations,
    wa_inbound, wa_outbound, fb_inbound, fb_outbound)
  VALUES (
    p_tenant_id, 
    CURRENT_DATE,
    CASE WHEN p_direction = 'inbound' THEN 1 ELSE 0 END,
    CASE WHEN p_direction = 'outbound' THEN 1 ELSE 0 END,
    CASE WHEN p_is_new_conversation THEN 1 ELSE 0 END,
    CASE WHEN p_channel = 'whatsapp' AND p_direction = 'inbound' THEN 1 ELSE 0 END,
    CASE WHEN p_channel = 'whatsapp' AND p_direction = 'outbound' THEN 1 ELSE 0 END,
    CASE WHEN p_channel = 'facebook' AND p_direction = 'inbound' THEN 1 ELSE 0 END,
    CASE WHEN p_channel = 'facebook' AND p_direction = 'outbound' THEN 1 ELSE 0 END
  )
  ON CONFLICT (tenant_id, stat_date) DO UPDATE SET
    inbound_count = tenant_daily_stats.inbound_count + EXCLUDED.inbound_count,
    outbound_count = tenant_daily_stats.outbound_count + EXCLUDED.outbound_count,
    new_conversations = tenant_daily_stats.new_conversations + EXCLUDED.new_conversations,
    wa_inbound = tenant_daily_stats.wa_inbound + EXCLUDED.wa_inbound,
    wa_outbound = tenant_daily_stats.wa_outbound + EXCLUDED.wa_outbound,
    fb_inbound = tenant_daily_stats.fb_inbound + EXCLUDED.fb_inbound,
    fb_outbound = tenant_daily_stats.fb_outbound + EXCLUDED.fb_outbound,
    updated_at = now();
END;
$$;

-- Mark thread as read (reset unread count)
CREATE OR REPLACE FUNCTION mark_thread_as_read(p_contact_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE contact_thread_state
  SET unread_count = 0, updated_at = now()
  WHERE contact_id = p_contact_id;
END;
$$;

-- Get sidebar unread counts efficiently
CREATE OR REPLACE FUNCTION get_sidebar_unread_counts(p_tenant_id UUID)
RETURNS TABLE (
  wa_unread INTEGER,
  fb_unread INTEGER,
  total_unread INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COALESCE(SUM(CASE WHEN contact_type = 'whatsapp' THEN unread_count ELSE 0 END), 0)::INTEGER AS wa_unread,
    COALESCE(SUM(CASE WHEN contact_type = 'facebook' THEN unread_count ELSE 0 END), 0)::INTEGER AS fb_unread,
    COALESCE(SUM(unread_count), 0)::INTEGER AS total_unread
  FROM contact_thread_state
  WHERE tenant_id = p_tenant_id
    AND is_archived = false
    AND unread_count > 0;
$$;

-- 1.9 Backfill function to populate contact_thread_state from existing data
CREATE OR REPLACE FUNCTION backfill_contact_thread_state()
RETURNS TABLE (wa_contacts_processed INTEGER, fb_contacts_processed INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wa_count INTEGER := 0;
  v_fb_count INTEGER := 0;
BEGIN
  -- Backfill WhatsApp contacts
  INSERT INTO contact_thread_state (
    tenant_id, contact_id, contact_type, instance_id,
    contact_name, contact_phone, contact_avatar_url,
    last_message_at, last_message_preview, last_message_direction, last_message_type,
    unread_count, assigned_to, is_archived, is_blocked,
    needs_handoff, handoff_reason, created_at
  )
  SELECT 
    c.tenant_id,
    c.id,
    'whatsapp',
    c.instance_id,
    c.name,
    c.phone_number,
    c.profile_pic_url,
    COALESCE(c.last_message_at, c.created_at),
    (SELECT LEFT(COALESCE(m.content, ''), 100) 
     FROM messages m WHERE m.contact_id = c.id 
     ORDER BY m.sent_at DESC LIMIT 1),
    (SELECT m.direction::TEXT 
     FROM messages m WHERE m.contact_id = c.id 
     ORDER BY m.sent_at DESC LIMIT 1),
    (SELECT m.content_type 
     FROM messages m WHERE m.contact_id = c.id 
     ORDER BY m.sent_at DESC LIMIT 1),
    c.unread_count,
    c.assigned_to,
    c.is_archived,
    c.is_blocked,
    c.needs_handoff,
    c.handoff_reason,
    c.created_at
  FROM contacts c
  ON CONFLICT (contact_id) DO UPDATE SET
    last_message_at = EXCLUDED.last_message_at,
    last_message_preview = EXCLUDED.last_message_preview,
    last_message_direction = EXCLUDED.last_message_direction,
    unread_count = EXCLUDED.unread_count,
    updated_at = now();
  
  GET DIAGNOSTICS v_wa_count = ROW_COUNT;

  -- Backfill Facebook contacts
  INSERT INTO contact_thread_state (
    tenant_id, contact_id, contact_type, instance_id,
    contact_name, contact_phone, contact_avatar_url,
    last_message_at, last_message_preview, last_message_direction, last_message_type,
    unread_count, assigned_to, is_archived, is_blocked,
    needs_handoff, handoff_reason, created_at
  )
  SELECT 
    c.tenant_id,
    c.id,
    'facebook',
    c.page_id::UUID,
    c.name,
    c.psid,
    c.profile_pic_url,
    COALESCE(c.last_message_at, c.created_at),
    (SELECT LEFT(COALESCE(m.content, ''), 100) 
     FROM fb_messages m WHERE m.contact_id = c.id 
     ORDER BY m.sent_at DESC LIMIT 1),
    (SELECT m.direction::TEXT 
     FROM fb_messages m WHERE m.contact_id = c.id 
     ORDER BY m.sent_at DESC LIMIT 1),
    (SELECT m.content_type 
     FROM fb_messages m WHERE m.contact_id = c.id 
     ORDER BY m.sent_at DESC LIMIT 1),
    c.unread_count,
    c.assigned_to,
    c.is_archived,
    c.is_blocked,
    c.needs_handoff,
    c.handoff_reason,
    c.created_at
  FROM fb_contacts c
  ON CONFLICT (contact_id) DO UPDATE SET
    last_message_at = EXCLUDED.last_message_at,
    last_message_preview = EXCLUDED.last_message_preview,
    last_message_direction = EXCLUDED.last_message_direction,
    unread_count = EXCLUDED.unread_count,
    updated_at = now();
  
  GET DIAGNOSTICS v_fb_count = ROW_COUNT;

  RETURN QUERY SELECT v_wa_count, v_fb_count;
END;
$$;

-- Update text_preview for existing messages
UPDATE public.messages 
SET text_preview = LEFT(COALESCE(content, ''), 100)
WHERE text_preview IS NULL;

UPDATE public.fb_messages 
SET text_preview = LEFT(COALESCE(content, ''), 100)
WHERE text_preview IS NULL;