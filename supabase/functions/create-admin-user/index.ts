import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client for checking requester
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user: currentUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if current user is super admin
    const { data: isSuperAdmin } = await anonClient.rpc('is_super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: "Only super admins can create admin users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, fullName, permissions, isSuperAdmin: makeSuperAdmin } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin client with service role for user creation
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if user already exists
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      // User exists, check if already admin
      const { data: existingRole } = await adminClient
        .from('system_roles')
        .select('id')
        .eq('user_id', existingProfile.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: "This user is already an administrator" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add existing user as admin
      const { error: roleError } = await adminClient
        .from('system_roles')
        .insert({
          user_id: existingProfile.id,
          role: 'admin',
          is_super_admin: makeSuperAdmin || false,
          permissions: permissions || null,
          granted_by: currentUser.id,
          granted_at: new Date().toISOString(),
        });

      if (roleError) {
        console.error("Error adding admin role:", roleError);
        return new Response(
          JSON.stringify({ error: "Failed to grant admin access" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log to audit
      await adminClient.from('admin_audit_logs').insert({
        admin_id: currentUser.id,
        action: 'admin_granted',
        entity_type: 'system_role',
        entity_id: existingProfile.id,
        details: { email, fullName, is_super_admin: makeSuperAdmin || false },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: existingProfile.id,
          message: "Existing user promoted to admin"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        created_by_admin: true,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newUser?.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wait for profile trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update profile with full name if provided
    if (fullName) {
      await adminClient
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', newUser.user.id);
    }

    // Add admin role
    const { error: roleError } = await adminClient
      .from('system_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'admin',
        is_super_admin: makeSuperAdmin || false,
        permissions: permissions || null,
        granted_by: currentUser.id,
        granted_at: new Date().toISOString(),
      });

    if (roleError) {
      console.error("Error creating admin role:", roleError);
      // Rollback: delete the user
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign admin role" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log to audit
    await adminClient.from('admin_audit_logs').insert({
      admin_id: currentUser.id,
      action: 'admin_created',
      entity_type: 'system_role',
      entity_id: newUser.user.id,
      details: { email, fullName, is_super_admin: makeSuperAdmin || false },
    });

    console.log(`Admin user created: ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: "Admin user created successfully"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
