import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollRequest {
  entity_type: "lead" | "tenant";
  entity_id: string;
  campaign_type?: "prospect_nurture" | "subscriber_retention" | "pro_ai_onboard";
  campaign_id?: string;
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

    const payload: EnrollRequest = await req.json();
    console.log("Enroll request:", JSON.stringify(payload));

    if (!payload.entity_type || !payload.entity_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing entity_type or entity_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine campaign type based on entity type if not specified
    const campaignType = payload.campaign_type || (
      payload.entity_type === "lead" ? "prospect_nurture" : "subscriber_retention"
    );

    // Get active campaign of the specified type
    let campaignQuery = supabase
      .from("admin_marketing_campaigns")
      .select("*")
      .eq("status", "active");

    if (payload.campaign_id) {
      campaignQuery = campaignQuery.eq("id", payload.campaign_id);
    } else {
      campaignQuery = campaignQuery.eq("type", campaignType);
    }

    const { data: campaigns, error: campaignsError } = await campaignQuery;

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("No active campaigns found for type:", campaignType);
      return new Response(
        JSON.stringify({ success: true, message: "No active campaigns", enrolled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enrolledCampaigns: string[] = [];

    for (const campaign of campaigns) {
      // Check if already enrolled
      const { data: existing } = await supabase
        .from("admin_marketing_enrollments")
        .select("id, status")
        .eq("campaign_id", campaign.id)
        .eq("entity_type", payload.entity_type)
        .eq("entity_id", payload.entity_id)
        .single();

      if (existing) {
        // Re-activate if unsubscribed and explicitly re-enrolling
        if (existing.status === "unsubscribed" && payload.campaign_id) {
          await supabase
            .from("admin_marketing_enrollments")
            .update({
              status: "active",
              current_week: 1,
              current_step: 0,
              next_message_at: new Date().toISOString(),
              messages_this_week: 0,
              messages_this_month: 0,
            })
            .eq("id", existing.id);

          enrolledCampaigns.push(campaign.id);
        }
        continue; // Skip if already enrolled
      }

      // Create enrollment
      const { error: enrollError } = await supabase
        .from("admin_marketing_enrollments")
        .insert({
          campaign_id: campaign.id,
          entity_type: payload.entity_type,
          entity_id: payload.entity_id,
          status: "active",
          current_week: 1,
          current_step: 0,
          next_message_at: new Date().toISOString(), // Start immediately
          messages_this_week: 0,
          messages_this_month: 0,
          week_reset_at: new Date().toISOString(),
          month_reset_at: new Date().toISOString(),
        });

      if (enrollError) {
        console.error("Error enrolling:", enrollError);
        continue;
      }

      enrolledCampaigns.push(campaign.id);

      // Log to customer journey
      await supabase.from("admin_customer_journey").insert({
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        event_type: "marketing_enrolled",
        event_category: "marketing",
        title_bn: `মার্কেটিং ক্যাম্পেইনে এনরোল হয়েছে`,
        description_bn: campaign.name_bn || campaign.name,
        metadata: {
          campaign_id: campaign.id,
          campaign_type: campaign.type,
        },
      });
    }

    console.log(`Enrolled in ${enrolledCampaigns.length} campaigns`);

    return new Response(
      JSON.stringify({
        success: true,
        enrolled: enrolledCampaigns.length,
        campaigns: enrolledCampaigns,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Enrollment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
