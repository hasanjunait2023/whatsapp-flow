
-- Update the Central Admin instance with wasender_session_id
-- The wasender_session_id is used for webhook validation and API calls
UPDATE public.whatsapp_instances
SET wasender_session_id = '85aa3377170ba2007bc4fa2f0acecd9dddca39366c17d42975b5842f53904729',
    updated_at = NOW()
WHERE id = 'd61ab28c-c512-4c34-9566-b57669a69c9f';
