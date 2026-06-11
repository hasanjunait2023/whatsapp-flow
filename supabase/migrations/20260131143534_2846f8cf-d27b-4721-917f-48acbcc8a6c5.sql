-- Data Preservation: Soft delete and SET NULL foreign keys
-- This ensures all data is preserved when instances are deleted

-- 1. Add soft delete columns to whatsapp_instances
ALTER TABLE whatsapp_instances 
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for filtering active instances
CREATE INDEX IF NOT EXISTS idx_instances_not_deleted 
  ON whatsapp_instances(tenant_id) WHERE is_deleted = false;

-- 2. contacts.instance_id: CASCADE → SET NULL
ALTER TABLE contacts ALTER COLUMN instance_id DROP NOT NULL;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_instance_id_fkey;
ALTER TABLE contacts ADD CONSTRAINT contacts_instance_id_fkey 
  FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- Fix unique constraint for nullable instance_id (drop constraint, not index)
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_instance_id_wa_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_instance_wa_unique 
  ON contacts(instance_id, wa_id) WHERE instance_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_wa_orphan_unique 
  ON contacts(tenant_id, wa_id) WHERE instance_id IS NULL;

-- 3. messages.instance_id: CASCADE → SET NULL
ALTER TABLE messages ALTER COLUMN instance_id DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_instance_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_instance_id_fkey 
  FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- 4. messages.contact_id: CASCADE → SET NULL
ALTER TABLE messages ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_contact_id_fkey;
ALTER TABLE messages ADD CONSTRAINT messages_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 5. whatsapp_groups.instance_id: CASCADE → SET NULL
ALTER TABLE whatsapp_groups ALTER COLUMN instance_id DROP NOT NULL;
ALTER TABLE whatsapp_groups DROP CONSTRAINT IF EXISTS whatsapp_groups_instance_id_fkey;
ALTER TABLE whatsapp_groups ADD CONSTRAINT whatsapp_groups_instance_id_fkey 
  FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- 6. contact_labels.contact_id: CASCADE → SET NULL
ALTER TABLE contact_labels ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE contact_labels DROP CONSTRAINT IF EXISTS contact_labels_contact_id_fkey;
ALTER TABLE contact_labels ADD CONSTRAINT contact_labels_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 7. notes.contact_id: CASCADE → SET NULL
ALTER TABLE notes ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_contact_id_fkey;
ALTER TABLE notes ADD CONSTRAINT notes_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 8. customer_journey_events.contact_id: CASCADE → SET NULL
ALTER TABLE customer_journey_events ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE customer_journey_events DROP CONSTRAINT IF EXISTS customer_journey_events_contact_id_fkey;
ALTER TABLE customer_journey_events ADD CONSTRAINT customer_journey_events_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 9. customer_scores.contact_id: CASCADE → SET NULL
ALTER TABLE customer_scores ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE customer_scores DROP CONSTRAINT IF EXISTS customer_scores_contact_id_fkey;
ALTER TABLE customer_scores ADD CONSTRAINT customer_scores_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

-- 10. contact_segments.contact_id: CASCADE → SET NULL
ALTER TABLE contact_segments ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE contact_segments DROP CONSTRAINT IF EXISTS contact_segments_contact_id_fkey;
ALTER TABLE contact_segments ADD CONSTRAINT contact_segments_contact_id_fkey 
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;