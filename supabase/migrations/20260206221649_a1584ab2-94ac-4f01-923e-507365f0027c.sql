
-- Update Central Admin instance with session_id
UPDATE whatsapp_instances
SET session_id = '34724',
    status = 'active',
    updated_at = NOW()
WHERE id = 'd61ab28c-c512-4c34-9566-b57669a69c9f';

UPDATE admin_whatsapp_instances
SET session_id = '34724',
    status = 'active',
    updated_at = NOW()
WHERE id = 'd61ab28c-c512-4c34-9566-b57669a69c9f';
