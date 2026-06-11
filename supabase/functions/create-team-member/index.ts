import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for user creation
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Create client with user's token for authorization check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, password, fullName, role, tenantId } = await req.json();

    if (!email || !password || !fullName || !role || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, password, fullName, role, tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!['manager', 'agent'].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be 'manager' or 'agent'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if current user is owner of the tenant
    const { data: ownerRole, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('tenant_id', tenantId)
      .single();

    if (roleError || !ownerRole || ownerRole.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: "Only tenant owners can create team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check agent limit from subscription plan
    const { data: subWithPlan } = await adminClient
      .from('subscriptions')
      .select('plan:plans(max_agents)')
      .eq('tenant_id', tenantId)
      .single();

    const { count: memberCount } = await adminClient
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    const maxAgents = (subWithPlan?.plan as any)?.max_agents || 1;
    if (memberCount !== null && memberCount >= maxAgents) {
      return new Response(
        JSON.stringify({
          error: 'Agent limit reached',
          code: 'AGENT_LIMIT_REACHED',
          current: memberCount,
          max: maxAgents,
          upgrade_required: true
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user account
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // Auto-confirm email since owner is creating
      user_metadata: {
        full_name: fullName,
        created_by_owner: true
      }
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create user account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the profile with created_by
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ 
        created_by: currentUser.id,
        full_name: fullName
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Continue anyway, profile will be created by trigger
    }

    // Create user role for the tenant
    const { error: userRoleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        tenant_id: tenantId,
        role: role
      });

    if (userRoleError) {
      console.error("Error creating user role:", userRoleError);
      // Rollback: delete the user if role creation fails
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to assign role to user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          fullName
        },
        message: "Team member created successfully"
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
