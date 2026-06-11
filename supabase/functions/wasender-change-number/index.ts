import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WASENDER_API_BASE = "https://www.wasenderapi.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { instance_id, new_phone_number } = await req.json();

    if (!instance_id) {
      return new Response(
        JSON.stringify({ error: "Instance ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!new_phone_number) {
      return new Response(
        JSON.stringify({ error: "New phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone number format (E.164 or common formats)
    const cleanedPhone = new_phone_number.replace(/[\s\-\(\)]/g, '');
    if (!/^\+?[1-9]\d{6,14}$/.test(cleanedPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format. Use international format (e.g., +8801xxxxxxxxx)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id, tenant_id, name, session_id, wasender_session_id")
      .eq("id", instance_id)
      .single();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sessionId = instance.session_id;
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Instance has no session ID. Please create a connection first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wasenderToken = Deno.env.get("WASENDER_PERSONAL_TOKEN");
    if (!wasenderToken) {
      return new Response(
        JSON.stringify({ error: "Wasender API token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating phone number for session ${sessionId} to ${cleanedPhone}`);

    // Call Wasender API to update session phone number
    const updateResponse = await fetch(
      `${WASENDER_API_BASE}/whatsapp-sessions/${sessionId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${wasenderToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: cleanedPhone,
        }),
      }
    );

    const responseText = await updateResponse.text();
    console.log("Wasender update response:", updateResponse.status, responseText);

    if (!updateResponse.ok) {
      // Try to parse error
      let errorMessage = "Failed to update phone number";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        errorMessage = responseText || errorMessage;
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: updateResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update local database with new phone number
    await supabase
      .from("whatsapp_instances")
      .update({
        phone_number: cleanedPhone,
        status: "disconnected", // Will need re-scan
        updated_at: new Date().toISOString(),
      })
      .eq("id", instance_id);

    // Create notification for the tenant
    await supabase.from("in_app_notifications").insert({
      tenant_id: instance.tenant_id,
      type: "instance_disconnected",
      title: "Phone Number Changed - QR Scan Required",
      message: `${instance.name} phone number updated to ${cleanedPhone}. Please scan QR code to reconnect.`,
      entity_type: "instance",
      entity_id: instance_id,
      metadata: {
        instance_id: instance_id,
        instance_name: instance.name,
        new_phone_number: cleanedPhone,
        action: "scan_qr",
      },
    });

    // Trigger reconnection to get new QR code
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/wasender-connect-session`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ instance_id }),
        });
        console.log("Reconnect triggered after phone number change");
      } catch (reconnectError) {
        console.error("Failed to trigger reconnect:", reconnectError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Phone number updated. Please scan the QR code to connect with the new number.",
        new_phone_number: cleanedPhone,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Change number error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
