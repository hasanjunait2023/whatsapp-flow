
-- Handle duplicate contacts first by merging data to Rahul's existing contacts
-- Then move non-duplicate contacts, messages, and thread_state

-- Step 1: For duplicate contacts, update messages to point to Rahul's existing contact_id
UPDATE messages
SET contact_id = '79bb59d4-2d4d-4851-ba66-d4fce596fe10'
WHERE contact_id = '80ee2338-b359-41dd-9699-e72b7dffb917';

UPDATE messages
SET contact_id = '3a6932e8-4e0b-4a44-ba26-7a801448a8cf'
WHERE contact_id = '328c8b81-24a5-42a0-bd25-eac9c48d7ffc';

-- Step 2: Delete duplicate thread states for merged contacts (keep Rahul's)
DELETE FROM contact_thread_state
WHERE contact_id IN ('80ee2338-b359-41dd-9699-e72b7dffb917', '328c8b81-24a5-42a0-bd25-eac9c48d7ffc');

-- Step 3: Delete the duplicate contacts from ecomex
DELETE FROM contacts
WHERE id IN ('80ee2338-b359-41dd-9699-e72b7dffb917', '328c8b81-24a5-42a0-bd25-eac9c48d7ffc');

-- Step 4: Now safely move remaining contacts to Rahul Jewellers instance
UPDATE contacts 
SET instance_id = 'a09c7169-5de4-4f53-9b12-be48c853ca24',
    tenant_id = '3e648881-2361-4308-9e70-4c6ca154599c'
WHERE instance_id = '5d796b81-677b-4248-b0f2-a84b4e36d42b';

-- Step 5: Move all messages to Rahul Jewellers instance
UPDATE messages
SET instance_id = 'a09c7169-5de4-4f53-9b12-be48c853ca24',
    tenant_id = '3e648881-2361-4308-9e70-4c6ca154599c'
WHERE instance_id = '5d796b81-677b-4248-b0f2-a84b4e36d42b';

-- Step 6: Move thread_state to Rahul Jewellers instance
UPDATE contact_thread_state
SET instance_id = 'a09c7169-5de4-4f53-9b12-be48c853ca24',
    tenant_id = '3e648881-2361-4308-9e70-4c6ca154599c'
WHERE instance_id = '5d796b81-677b-4248-b0f2-a84b4e36d42b';

-- Step 7: Transfer active session from ecomex to Rahul Jewellers instance
UPDATE whatsapp_instances
SET session_id = 59531,
    wasender_session_id = 'e10b666b14f78eb77b5054385f4b51c9d52f1550e6ddd86fbdfc1ec03d188f34',
    status = 'active',
    updated_at = NOW()
WHERE id = 'a09c7169-5de4-4f53-9b12-be48c853ca24';

-- Step 8: Clear and soft-delete ecomex instance from System Tenant
UPDATE whatsapp_instances
SET session_id = NULL,
    wasender_session_id = NULL,
    api_key_encrypted = NULL,
    status = 'disconnected',
    is_deleted = true,
    updated_at = NOW()
WHERE id = '5d796b81-677b-4248-b0f2-a84b4e36d42b';
