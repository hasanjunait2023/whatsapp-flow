
-- Insert default admin WhatsApp instance for marketing automation
INSERT INTO admin_whatsapp_instances (
  name, 
  phone_number, 
  api_key_encrypted, 
  session_id, 
  status, 
  is_default, 
  created_at
)
VALUES (
  'Junait test (Marketing)',
  '+8801922001161',
  '85aa3377170ba2007bc4fa2f0acecd9dddca39366c17d42975b5842f53904729',
  NULL,
  'active',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;
