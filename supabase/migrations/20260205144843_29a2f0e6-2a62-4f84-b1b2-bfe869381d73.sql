-- Reset the admin instance status since QR was never scanned
UPDATE public.whatsapp_instances 
SET 
  status = 'disconnected',
  last_connected_at = NULL
WHERE id = '5d796b81-677b-4248-b0f2-a84b4e36d42b' 
  AND tenant_id = '5a0ad1d5-588a-473a-af82-724e69890074';