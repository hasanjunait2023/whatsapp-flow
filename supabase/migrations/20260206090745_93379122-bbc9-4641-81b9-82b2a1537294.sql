
-- 1. Soft-delete the orphaned empty instance for Rahul Jewellers (no session, no phone)
UPDATE whatsapp_instances
SET 
  is_deleted = true,
  deleted_at = now(),
  status = 'disconnected'
WHERE id = '6b736890-3fb3-4c39-92f2-771814b8c975'
  AND session_id IS NULL
  AND phone_number IS NULL;

-- 2. Ensure the valid instance is marked as default since the other is deleted
UPDATE whatsapp_instances
SET is_default = true
WHERE id = 'a43f5cf2-1e56-43cb-9183-8ae208447333';
