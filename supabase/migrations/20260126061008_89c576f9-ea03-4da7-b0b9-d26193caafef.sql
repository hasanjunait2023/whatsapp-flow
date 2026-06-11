-- Auto-update last_message_at for WhatsApp contacts on message insert
CREATE OR REPLACE FUNCTION update_contact_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'outbound' THEN
    UPDATE contacts 
    SET last_message_at = NEW.sent_at
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS messages_update_contact_last_message ON messages;
CREATE TRIGGER messages_update_contact_last_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_contact_last_message();

-- Auto-update last_message_at for Facebook contacts on message insert
CREATE OR REPLACE FUNCTION update_fb_contact_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction = 'outbound' THEN
    UPDATE fb_contacts 
    SET last_message_at = NEW.sent_at
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS fb_messages_update_contact_last_message ON fb_messages;
CREATE TRIGGER fb_messages_update_contact_last_message
AFTER INSERT ON fb_messages
FOR EACH ROW EXECUTE FUNCTION update_fb_contact_last_message();