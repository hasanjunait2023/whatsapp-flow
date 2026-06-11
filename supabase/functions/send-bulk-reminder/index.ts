import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Wasender messaging API
const WASENDER_API_BASE = "https://www.wasenderapi.com/api";

interface BulkReminderRequest {
  subscription_ids: string[];
  template_id?: string | null;
  custom_message?: string | null;
}

interface SubscriptionInfo {
  id: string;
  tenant_id: string;
  tenant_name: string;
  plan_name: string;
  current_period_end: string;
  owner_phone?: string;
  owner_name?: string;
}

function safeJsonParse(text: string) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: text };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the caller is a system admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is system admin
    const { data: adminRole } = await supabase
      .from("system_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: BulkReminderRequest = await req.json();
    console.log("Bulk reminder request:", JSON.stringify(payload));

    if (!payload.subscription_ids || payload.subscription_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "No subscriptions specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch subscription details with tenant and plan info
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select(`
        id,
        tenant_id,
        current_period_end,
        tenant:tenants(id, name),
        plan:plans(name)
      `)
      .in("id", payload.subscription_ids);

    if (subError || !subscriptions) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch template if provided
    let templateContent: string | null = null;
    if (payload.template_id) {
      const { data: template } = await supabase
        .from("message_templates")
        .select("content")
        .eq("id", payload.template_id)
        .single();
      
      templateContent = template?.content || null;
    }

    // Use custom message or template
    const messageTemplate = payload.custom_message || templateContent;
    
    if (!messageTemplate) {
      return new Response(
        JSON.stringify({ error: "No message template or custom message provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin's default WhatsApp instance for sending
    // We'll use the WASENDER_PERSONAL_TOKEN for admin bulk sends
    const wasenderToken = Deno.env.get("WASENDER_PERSONAL_TOKEN");
    if (!wasenderToken) {
      return new Response(
        JSON.stringify({ error: "WhatsApp API not configured for admin messaging" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each subscription
    const results: Array<{
      subscription_id: string;
      tenant_name: string;
      status: "sent" | "failed" | "skipped";
      error?: string;
    }> = [];

    for (const sub of subscriptions) {
      const tenantName = (sub.tenant as any)?.name || "Unknown";
      const planName = (sub.plan as any)?.name || "Unknown";
      
      // Get tenant owner's phone number
      const { data: ownerRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("tenant_id", sub.tenant_id)
        .eq("role", "owner")
        .maybeSingle();

      if (!ownerRole) {
        results.push({
          subscription_id: sub.id,
          tenant_name: tenantName,
          status: "skipped",
          error: "No owner found",
        });
        
        // Log to reminder_logs
        await supabase.from("reminder_logs").insert({
          subscription_id: sub.id,
          tenant_id: sub.tenant_id,
          reminder_type: "manual_bulk",
          channel: "whatsapp",
          status: "failed",
          error_message: "No owner found",
        });
        
        continue;
      }

      // Get owner's profile for phone number
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_number, full_name")
        .eq("id", ownerRole.user_id)
        .maybeSingle();

      if (!profile?.phone_number) {
        results.push({
          subscription_id: sub.id,
          tenant_name: tenantName,
          status: "skipped",
          error: "Owner has no phone number",
        });
        
        await supabase.from("reminder_logs").insert({
          subscription_id: sub.id,
          tenant_id: sub.tenant_id,
          reminder_type: "manual_bulk",
          channel: "whatsapp",
          status: "failed",
          error_message: "Owner has no phone number",
        });
        
        continue;
      }

      // Replace placeholders in message
      const expiryDate = new Date(sub.current_period_end);
      const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      
      const personalizedMessage = messageTemplate
        .replace(/\{\{tenant_name\}\}/g, tenantName)
        .replace(/\{\{plan_name\}\}/g, planName)
        .replace(/\{\{expiry_date\}\}/g, expiryDate.toLocaleDateString("en-US", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        }))
        .replace(/\{\{days_remaining\}\}/g, String(daysRemaining))
        .replace(/\{\{owner_name\}\}/g, profile.full_name || "Customer");

      // Send WhatsApp message via Wasender
      try {
        const response = await fetch(`${WASENDER_API_BASE}/send-message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${wasenderToken}`,
            "Accept": "application/json",
          },
          body: JSON.stringify({
            to: profile.phone_number,
            text: personalizedMessage,
          }),
        });

        const responseText = await response.text();
        const parsed = safeJsonParse(responseText);

        if (!response.ok) {
          const errorMsg = parsed.ok 
            ? (parsed.data.message || parsed.data.error || `HTTP ${response.status}`)
            : `HTTP ${response.status}`;
          
          results.push({
            subscription_id: sub.id,
            tenant_name: tenantName,
            status: "failed",
            error: errorMsg,
          });
          
          await supabase.from("reminder_logs").insert({
            subscription_id: sub.id,
            tenant_id: sub.tenant_id,
            reminder_type: "manual_bulk",
            channel: "whatsapp",
            status: "failed",
            error_message: errorMsg,
          });
        } else {
          results.push({
            subscription_id: sub.id,
            tenant_name: tenantName,
            status: "sent",
          });
          
          await supabase.from("reminder_logs").insert({
            subscription_id: sub.id,
            tenant_id: sub.tenant_id,
            reminder_type: "manual_bulk",
            channel: "whatsapp",
            status: "sent",
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Network error";
        results.push({
          subscription_id: sub.id,
          tenant_name: tenantName,
          status: "failed",
          error: errorMsg,
        });
        
        await supabase.from("reminder_logs").insert({
          subscription_id: sub.id,
          tenant_id: sub.tenant_id,
          reminder_type: "manual_bulk",
          channel: "whatsapp",
          status: "failed",
          error_message: errorMsg,
        });
      }
    }

    // Log admin action
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      action: "bulk_send_reminder",
      target_type: "subscription",
      target_id: payload.subscription_ids[0],
      metadata: {
        subscription_count: payload.subscription_ids.length,
        template_id: payload.template_id,
        results_summary: {
          sent: results.filter(r => r.status === "sent").length,
          failed: results.filter(r => r.status === "failed").length,
          skipped: results.filter(r => r.status === "skipped").length,
        },
      },
    });

    const summary = {
      total: results.length,
      sent: results.filter(r => r.status === "sent").length,
      failed: results.filter(r => r.status === "failed").length,
      skipped: results.filter(r => r.status === "skipped").length,
    };

    console.log("Bulk reminder completed:", JSON.stringify(summary));

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Bulk reminder error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
