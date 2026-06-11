
-- Update Central Admin instance with session details
-- Note: The correct webhook URL for Central Admin should use its own instance_id

-- Update whatsapp_instances table
UPDATE whatsapp_instances
SET 
  wasender_session_id = '85aa3377170ba2007bc4fa2f0acecd9dddca39366c17d42975b5842f53904729',
  api_key_encrypted = '85aa3377170ba2007bc4fa2f0acecd9dddca39366c17d42975b5842f53904729',
  updated_at = NOW()
WHERE id = 'd61ab28c-c512-4c34-9566-b57669a69c9f';

-- Update admin_whatsapp_instances table
UPDATE admin_whatsapp_instances
SET 
  api_key_encrypted = '85aa3377170ba2007bc4fa2f0acecd9dddca39366c17d42975b5842f53904729',
  updated_at = NOW()
WHERE id = 'd61ab28c-c512-4c34-9566-b57669a69c9f';
