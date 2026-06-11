-- Fix the wasender_session_id to match what Wasender sends in webhooks
-- Wasender sends the API key as sessionId, not the numeric ID

UPDATE whatsapp_instances 
SET wasender_session_id = 'f7e472c8051fb3ab5031bfbc24cf1d0fcaa122b80227b96f6f41742f03462816'
WHERE id = 'f8c2c8ed-dfaa-4c63-ac90-48af5fad69cc'
  AND wasender_session_id = '56997';
