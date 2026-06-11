-- Fix the create_team_member_notification function to use proper UUID cast
CREATE OR REPLACE FUNCTION public.create_team_member_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  member_name TEXT;
BEGIN
  SELECT full_name INTO member_name FROM profiles WHERE id = NEW.user_id;
  
  INSERT INTO in_app_notifications (tenant_id, type, title, message, entity_type, entity_id, metadata)
  VALUES (
    NEW.tenant_id,
    'team_member_added',
    'New Team Member',
    format('%s has joined your team.', COALESCE(member_name, 'A new member')),
    'team',
    NEW.id,
    jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role)
  );
  RETURN NEW;
END;
$function$;