-- Delete messages associated with the orphan contact
DELETE FROM messages 
WHERE contact_id = '0fbb946d-d69d-4726-9115-6d3641a33b4c';

-- Delete the orphan contact (01922001161)
DELETE FROM contacts 
WHERE id = '0fbb946d-d69d-4726-9115-6d3641a33b4c';