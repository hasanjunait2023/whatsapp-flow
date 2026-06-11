-- Fix demo tenant ownership: should belong to demo user, not the admin

-- 1. Update demo tenant owner to demo user
UPDATE public.tenants 
SET owner_id = '00000000-0000-0000-0000-000000000002'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Delete the user_role that links admin user to demo tenant
DELETE FROM public.user_roles 
WHERE user_id = '0fa1897c-c5b7-4025-8a07-d07cf199244f' 
  AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- 3. Ensure demo user has owner role on demo tenant
INSERT INTO public.user_roles (user_id, tenant_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'owner')
ON CONFLICT (user_id, tenant_id) DO NOTHING;