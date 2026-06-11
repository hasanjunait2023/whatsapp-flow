-- Create a trigger function to automatically create user_role when a tenant is created
CREATE OR REPLACE FUNCTION public.create_owner_role_for_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create role if owner_id is set and role doesn't already exist
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, tenant_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign owner role when tenant is created
DROP TRIGGER IF EXISTS auto_create_owner_role ON tenants;
CREATE TRIGGER auto_create_owner_role
  AFTER INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_owner_role_for_tenant();

-- Also handle when owner_id is updated on an existing tenant
CREATE OR REPLACE FUNCTION public.update_owner_role_for_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If owner_id changed, create role for new owner
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, tenant_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT (user_id, tenant_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_update_owner_role ON tenants;
CREATE TRIGGER auto_update_owner_role
  AFTER UPDATE OF owner_id ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_owner_role_for_tenant();