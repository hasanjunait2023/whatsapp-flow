-- Create system tenant for admin business with WhatsApp instance
DO $$
DECLARE
  v_tenant_id UUID;
  v_owner_id UUID := '0fa1897c-c5b7-4025-8a07-d07cf199244f';
  v_instance_id UUID := 'a09c7169-5de4-4f53-9b12-be48c853ca24';
BEGIN
  -- Insert system tenant with owner
  INSERT INTO tenants (name, owner_id, is_activated, activated_at, settings)
  VALUES (
    'Ecomex Admin',
    v_owner_id,
    true,
    NOW(),
    '{"is_system_tenant": true}'::jsonb
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_tenant_id;
  
  -- If already exists, get its ID
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM tenants 
    WHERE name = 'Ecomex Admin' LIMIT 1;
  END IF;

  -- Insert the WhatsApp instance with the specific ID from webhook URL
  INSERT INTO whatsapp_instances (
    id, 
    tenant_id, 
    name, 
    api_key_encrypted, 
    webhook_secret, 
    status, 
    is_default
  ) VALUES (
    v_instance_id,
    v_tenant_id,
    'Ecomex Business WhatsApp',
    '85aa3377170ba2007bc4fa2f0acecd9dddca39366c17d42975b5842f53904729',
    '4b056112867bc6017d670532b3a6e820',
    'active',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    webhook_secret = EXCLUDED.webhook_secret,
    status = EXCLUDED.status;

  -- Grant owner access first
  INSERT INTO user_roles (user_id, tenant_id, role)
  VALUES (v_owner_id, v_tenant_id, 'owner')
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- Grant all other admins manager access to system tenant
  INSERT INTO user_roles (user_id, tenant_id, role)
  SELECT sr.user_id, v_tenant_id, 'manager'
  FROM system_roles sr
  WHERE sr.role = 'admin' AND sr.user_id != v_owner_id
  ON CONFLICT (user_id, tenant_id) DO NOTHING;
END $$;