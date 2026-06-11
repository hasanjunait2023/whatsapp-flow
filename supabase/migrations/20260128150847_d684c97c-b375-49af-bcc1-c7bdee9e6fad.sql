UPDATE whatsapp_instances 
SET tenant_id = '5a0ad1d5-588a-473a-af82-724e69890074'
WHERE id = 'a09c7169-5de4-4f53-9b12-be48c853ca24';

UPDATE contacts 
SET tenant_id = '5a0ad1d5-588a-473a-af82-724e69890074'
WHERE instance_id = 'a09c7169-5de4-4f53-9b12-be48c853ca24';

UPDATE messages 
SET tenant_id = '5a0ad1d5-588a-473a-af82-724e69890074'
WHERE contact_id IN (
  SELECT id FROM contacts WHERE instance_id = 'a09c7169-5de4-4f53-9b12-be48c853ca24'
);