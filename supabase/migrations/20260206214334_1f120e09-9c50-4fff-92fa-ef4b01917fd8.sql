
-- Backfill contact_thread_state for Central Admin instance contacts that are missing
INSERT INTO contact_thread_state (
  contact_id,
  tenant_id,
  instance_id,
  contact_type,
  contact_phone,
  contact_name,
  last_message_at,
  last_message_preview,
  last_message_direction,
  last_message_type,
  unread_count,
  total_messages,
  is_archived,
  is_blocked,
  needs_handoff,
  created_at,
  updated_at
)
SELECT 
  c.id as contact_id,
  c.tenant_id,
  m.instance_id,
  'whatsapp' as contact_type,
  c.phone_number as contact_phone,
  c.name as contact_name,
  c.last_message_at,
  CASE 
    WHEN m.direction = 'outbound' THEN 'You: ' || COALESCE(LEFT(m.content, 100), '[' || m.content_type || ']')
    ELSE COALESCE(LEFT(m.content, 100), '[' || m.content_type || ']')
  END as last_message_preview,
  m.direction as last_message_direction,
  m.content_type as last_message_type,
  c.unread_count,
  1 as total_messages,
  c.is_archived,
  c.is_blocked,
  c.needs_handoff,
  c.created_at,
  NOW()
FROM contacts c
JOIN LATERAL (
  SELECT instance_id, direction, content, content_type
  FROM messages
  WHERE contact_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true
WHERE m.instance_id = 'd61ab28c-c512-4c34-9566-b57669a69c9f'
  AND NOT EXISTS (
    SELECT 1 FROM contact_thread_state cts WHERE cts.contact_id = c.id
  );

-- Also update any existing contacts that need instance_id corrected
UPDATE contacts 
SET instance_id = 'd61ab28c-c512-4c34-9566-b57669a69c9f'
WHERE id IN (
  SELECT DISTINCT contact_id 
  FROM messages 
  WHERE instance_id = 'd61ab28c-c512-4c34-9566-b57669a69c9f'
)
AND (instance_id IS NULL OR instance_id != 'd61ab28c-c512-4c34-9566-b57669a69c9f');
