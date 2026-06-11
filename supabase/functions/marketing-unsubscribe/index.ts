import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnsubscribeRequest {
  entity_type: "lead" | "tenant";
  entity_id: string;
  campaign_id?: string; // If not specified, unsubscribe from all
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: UnsubscribeRequest = await req.json();
    console.log("Unsubscribe request:", JSON.stringify(payload));

    if (!payload.entity_type || !payload.entity_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing entity_type or entity_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let query = supabase
      .from("admin_marketing_enrollments")
      .update({
        status: "unsubscribed",
        unsubscribed_at: new Date().toISOString(),
        metadata: {
          unsubscribe_reason: payload.reason || "User requested",
        },
      })
      .eq("entity_type", payload.entity_type)
      .eq("entity_id", payload.entity_id)
      .eq("status", "active");

    if (payload.campaign_id) {
      query = query.eq("campaign_id", payload.campaign_id);
    }

    const { data, error } = await query.select();

    if (error) {
      console.error("Unsubscribe error:", error);
      throw error;
    }

    const unsubscribedCount = data?.length || 0;

    // Log to customer journey
    await supabase.from("admin_customer_journey").insert({
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      event_type: "marketing_unsubscribed",
      event_category: "marketing",
      title_bn: "মার্কেটিং থেকে আনসাবস্ক্রাইব",
      description_bn: payload.reason || "ব্যবহারকারী আনসাবস্ক্রাইব করেছে",
      metadata: {
        campaign_id: payload.campaign_id || "all",
        reason: payload.reason,
      },
    });

    console.log(`Unsubscribed from ${unsubscribedCount} campaigns`);

    return new Response(
      JSON.stringify({
        success: true,
        unsubscribed: unsubscribedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Unsubscribe error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
