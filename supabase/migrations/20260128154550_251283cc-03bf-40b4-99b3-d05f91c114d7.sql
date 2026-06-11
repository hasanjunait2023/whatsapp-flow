-- Fix: Add missing user_role for Mazharul's tenant "Bangla Bazar"
INSERT INTO user_roles (user_id, tenant_id, role)
SELECT t.owner_id, t.id, 'owner'
FROM tenants t
LEFT JOIN user_roles ur ON ur.user_id = t.owner_id AND ur.tenant_id = t.id
WHERE ur.id IS NULL
  AND t.owner_id IS NOT NULL
  AND t.owner_id != '00000000-0000-0000-0000-000000000002'; -- Exclude demo tenant owner if it has issues