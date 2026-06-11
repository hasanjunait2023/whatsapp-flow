-- Create demo user in auth.users
-- Note: Password is 'demo123' - this creates the user that the Try Demo button uses

-- First, insert the demo user into auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'demo@whatscrm.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo User"}',
  false,
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = crypt('demo123', gen_salt('bf')),
  updated_at = now();

-- Create identity for the demo user
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000002', 'email', 'demo@whatscrm.com'),
  'email',
  '00000000-0000-0000-0000-000000000002',
  now(),
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create profile for demo user
INSERT INTO public.profiles (id, full_name, email, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Demo User',
  'demo@whatscrm.com',
  NULL
) ON CONFLICT (id) DO NOTHING;

-- Create user_role for demo user linking to Demo Tenant
INSERT INTO public.user_roles (user_id, tenant_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'owner'
) ON CONFLICT (user_id, tenant_id) DO NOTHING;