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

    const { group_id, phone_numbers, batch_size = 5, interval_minutes = 30 } = await req.json();

    if (!group_id || !phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return new Response(JSON.stringify({ error: "group_id and phone_numbers array are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get group to verify access
    const { data: group, error: groupError } = await supabaseClient
      .from("whatsapp_groups")
      .select("id, tenant_id")
      .eq("id", group_id)
      .single();

    if (groupError || !group) {
      return new Response(JSON.stringify({ error: "Group not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate how many days needed based on 50/day limit
    const totalNumbers = phone_numbers.length;
    const daysNeeded = Math.ceil(totalNumbers / 50);

    // Create queue entries for each day
    const queueEntries = [];
    let remainingNumbers = [...phone_numbers];
    const today = new Date();

    for (let day = 0; day < daysNeeded && remainingNumbers.length > 0; day++) {
      const numbersForDay = remainingNumbers.splice(0, 50);
      const scheduledDate = new Date(today);
      scheduledDate.setDate(scheduledDate.getDate() + day);

      queueEntries.push({
        tenant_id: group.tenant_id,
        group_id: group_id,
        phone_numbers: numbersForDay,
        batch_size: batch_size,
        interval_minutes: interval_minutes,
        status: "pending",
        scheduled_for: scheduledDate.toISOString().split("T")[0],
        processed_count: 0,
        failed_count: 0,
        error_log: [],
        created_by: user.id,
      });
    }

    // Insert queue entries
    const { error: insertError } = await supabaseClient
      .from("group_add_queue")
      .insert(queueEntries);

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create queue" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_numbers: totalNumbers,
        days_needed: daysNeeded,
        queue_entries: queueEntries.length,
        estimated_completion: new Date(today.getTime() + (daysNeeded - 1) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-queue-batch:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
