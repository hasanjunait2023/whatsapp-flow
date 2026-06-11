

## Fix: Team Member Creation Edge Function Error

The "Edge Function returned a non-2xx status code" error when creating team members is caused by **two issues**:

### Root Causes

1. **Missing CORS headers** -- The `create-team-member` edge function uses an outdated set of allowed headers that doesn't include the newer Supabase client headers (`x-supabase-client-platform`, etc.). This causes the browser's preflight (OPTIONS) request to fail.

2. **No JWT bypass in config.toml** -- The function validates auth manually in code, but `config.toml` doesn't disable automatic JWT verification. This can cause the function to reject requests before the code even runs.

3. **Same issue in `reset-team-member-password`** -- This function has the identical CORS and config problems.

---

### Changes

**1. Update `supabase/config.toml`**
Add JWT bypass entries for both team member functions:
```
[functions.create-team-member]
verify_jwt = false

[functions.reset-team-member-password]
verify_jwt = false
```

**2. Update `supabase/functions/create-team-member/index.ts`**
Fix the CORS headers to include all required Supabase client headers:
```
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

**3. Update `supabase/functions/reset-team-member-password/index.ts`**
Apply the same CORS header fix.

---

### Why This Fixes It
- The updated CORS headers allow the browser preflight request to succeed
- Setting `verify_jwt = false` lets the function handle auth manually (which it already does), preventing Supabase from rejecting the request before the code runs
- Both functions already validate the user's authorization in code, so security is maintained

