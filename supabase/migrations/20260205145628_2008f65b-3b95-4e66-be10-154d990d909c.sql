-- Reset admin instance - clear wrongly adopted tenant session
UPDATE public.whatsapp_instances 
SET 
  status = 'disconnected',
  session_id = NULL,
  wasender_session_id = NULL,
  api_key_encrypted = NULL,
  phone_number = NULL,
  name = 'Admin Instance',
  last_connected_at = NULL,
  qr_code = NULL,
  qr_expires_at = NULL
WHERE id = '5d796b81-677b-4248-b0f2-a84b4e36d42b' 
  AND tenant_id = '5a0ad1d5-588a-473a-af82-724e69890074';