
-- Insert the Central Admin WhatsApp instance into whatsapp_instances
-- This allows edge functions (send-new-message, wasender-webhook) to work with admin messages
-- Uses the System Tenant ID for Central Admin operations

INSERT INTO public.whatsapp_instances (
  id,
  tenant_id,
  name,
  phone_number,
  status,
  api_key_encrypted,
  is_default,
  created_at,
  updated_at
)
VALUES (
  'd61ab28c-c512-4c34-9566-b57669a69c9f',
  '5a0ad1d5-588a-473a-af82-724e69890074',  -- System Tenant ID
  'Central Admin (01922001161)',
  '+8801922001161',
  'active',
  '85aa3377170ba2007bc4fa2f0acecd9dddca39366c17d42975b5842f53904729',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone_number = EXCLUDED.phone_number,
  status = EXCLUDED.status,
  api_key_encrypted = EXCLUDED.api_key_encrypted,
  is_default = EXCLUDED.is_default,
  updated_at = NOW();
