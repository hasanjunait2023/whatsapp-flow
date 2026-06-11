
-- Update webhook_secret for Central Admin instance
UPDATE whatsapp_instances
SET webhook_secret = '4b056112867bc6017d670532b3a6e820',
    updated_at = NOW()
WHERE id = 'd61ab28c-c512-4c34-9566-b57669a69c9f';
