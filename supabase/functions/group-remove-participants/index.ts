import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { group_id, phone_numbers, log_journey = true } = await req.json();

    if (!group_id || !phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return new Response(JSON.stringify({ error: "group_id and phone_numbers array are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the group with instance details
    const { data: group, error: groupError } = await supabaseClient
      .from("whatsapp_groups")
      .select(`
        *,
        instance:whatsapp_instances(id, api_key_encrypted, tenant_id)
      `)
      .eq("id", group_id)
      .single();

    if (groupError || !group) {
      return new Response(JSON.stringify({ error: "Group not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instance = group.instance as any;
    const sessionApiKey = instance?.api_key_encrypted as string | null;
    if (!sessionApiKey) {
      return new Response(JSON.stringify({ error: "Instance not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone numbers
    const formattedNumbers = phone_numbers.map((num: string) => {
      const cleaned = num.replace(/\D/g, "");
      return cleaned;
    });

    // Remove participants via Wasender API
    const wasenderResponse = await fetch(
      `https://www.wasenderapi.com/api/groups/${encodeURIComponent(group.wa_group_id)}/remove-participants`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sessionApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participants: formattedNumbers,
        }),
      }
    );

    const result = await wasenderResponse.json();
    
    let removedCount = 0;
    let failedCount = 0;

    if (wasenderResponse.ok && result.success !== false) {
      removedCount = formattedNumbers.length;

      // Log customer journey events
      if (log_journey) {
        const { data: contacts } = await supabaseClient
          .from("contacts")
          .select("id, phone_number")
          .eq("tenant_id", instance.tenant_id)
          .in("phone_number", formattedNumbers);

        for (const contact of contacts || []) {
          await serviceClient
            .from("customer_journey_events")
            .insert({
              contact_id: contact.id,
              tenant_id: instance.tenant_id,
              event_type: "group_left",
              event_category: "communication",
              title: "গ্রুপ থেকে সরানো হয়েছে",
              description: `"${group.name}" গ্রুপ থেকে সরিয়ে দেওয়া হয়েছে`,
              metadata: {
                group_id: group.id,
                group_name: group.name,
                removed_by: user.id,
              },
              created_by: user.id,
            });
        }
      }

      // Remove from participants table
      await serviceClient
        .from("whatsapp_group_participants")
        .delete()
        .eq("group_id", group_id)
        .in("phone_number", formattedNumbers);

      // Update group participant count
      await serviceClient
        .from("whatsapp_groups")
        .update({
          participant_count: Math.max(0, (group.participant_count || 0) - removedCount),
          updated_at: new Date().toISOString(),
        })
        .eq("id", group_id);
    } else {
      failedCount = formattedNumbers.length;
    }

    return new Response(
      JSON.stringify({
        success: removedCount > 0,
        removed: removedCount,
        failed: failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-remove-participants:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
