UPDATE facebook_pages 
SET page_id = TRIM(page_id), 
    page_name = TRIM(page_name),
    page_access_token = TRIM(page_access_token),
    app_secret = TRIM(app_secret)
WHERE page_id != TRIM(page_id) 
   OR page_name != TRIM(page_name)
   OR (page_access_token IS NOT NULL AND page_access_token != TRIM(page_access_token))
   OR (app_secret IS NOT NULL AND app_secret != TRIM(app_secret));