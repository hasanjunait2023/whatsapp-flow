-- Fix the trigger function to use UUID instead of text for entity_id
CREATE OR REPLACE FUNCTION public.create_instance_disconnected_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'disconnected' THEN
    INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
    VALUES (
      NEW.tenant_id,
      'instance_disconnected',
      'WhatsApp Instance Disconnected',
      format('%s is offline. Please reconnect.', COALESCE(NEW.name, 'Your instance')),
      'instance',
      NEW.id,  -- Remove ::text cast since entity_id is UUID type
      jsonb_build_object('instance_name', NEW.name, 'instance_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;