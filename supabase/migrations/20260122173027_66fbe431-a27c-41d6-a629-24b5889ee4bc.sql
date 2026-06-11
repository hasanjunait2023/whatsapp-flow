-- Grant admin role to the primary user
INSERT INTO public.system_roles (user_id, role)
VALUES ('0fa1897c-c5b7-4025-8a07-d07cf199244f', 'admin')
ON CONFLICT DO NOTHING;