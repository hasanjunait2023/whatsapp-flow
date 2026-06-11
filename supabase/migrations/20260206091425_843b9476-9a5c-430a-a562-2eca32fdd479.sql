
-- Transfer session 59531 from Ecomex Admin to Rahul Jewellers
-- Update the existing instance to point to Rahul Jewellers tenant
UPDATE whatsapp_instances
SET 
  tenant_id = '3e648881-2361-4308-9e70-4c6ca154599c',
  name = 'Rahul Jewellers',
  phone_number = '+8801742901671',
  is_default = true,
  updated_at = now()
WHERE id = 'a09c7169-5de4-4f53-9b12-be48c853ca24'
  AND session_id = '59531';

-- Soft-delete the old empty Rahul Jewellers instance since we're using the transferred one
UPDATE whatsapp_instances
SET 
  is_deleted = true,
  deleted_at = now(),
  is_default = false
WHERE id = 'a43f5cf2-1e56-43cb-9183-8ae208447333';
