UPDATE whatsapp_instances 
SET status = 'active', 
    connection_error = NULL, 
    last_connected_at = NOW(), 
    last_status_at = NOW(),
    qr_code = NULL,
    qr_expires_at = NULL
WHERE session_id IN ('57660', '57658');