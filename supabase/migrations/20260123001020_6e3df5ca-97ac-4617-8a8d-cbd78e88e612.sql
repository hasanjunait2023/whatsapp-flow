-- Allow api_key_encrypted to be null during initial instance creation
-- (we get the API key from Wasender AFTER creating the session)
ALTER TABLE public.whatsapp_instances 
ALTER COLUMN api_key_encrypted DROP NOT NULL;