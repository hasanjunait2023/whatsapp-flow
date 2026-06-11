
-- Set the active instance as default for System Tenant
UPDATE whatsapp_instances 
SET is_default = true 
WHERE id = '5d796b81-677b-4248-b0f2-a84b4e36d42b';
