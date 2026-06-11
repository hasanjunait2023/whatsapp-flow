import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FollowupQueueItem {
  id: string;
  tenant_id: string;
  contact_id: string;
  instance_id: string;
  scheduled_for: string;
  status: string;
  created_at: string;
}

interface MediaItem {
  type: string;
  url: string;
  filename: string;
  caption?: string;
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    console.log("Starting follow-up cron job...");

    // Check if follow-up system is globally enabled
    const { data: globalSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "whatsapp_followup_enabled")
      .maybeSingle();

    const isGloballyEnabled = globalSetting?.value?.value === true;
    
    if (!isGloballyEnabled) {
      console.log("Follow-up system is globally disabled by admin. Skipping cron.");
      return new Response(
        JSON.stringify({ success: true, message: "Follow-up system disabled", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch pending follow-ups that are due
    const now = new Date().toISOString();
    const { data: pendingFollowups, error: fetchError } = await supabase
      .from("whatsapp_followup_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .limit(50);

    if (fetchError) {
      console.error("Error fetching pending follow-ups:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingFollowups || pendingFollowups.length === 0) {
      console.log("No pending follow-ups to process");
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${pendingFollowups.length} follow-ups...`);

    let processed = 0;
    let skipped = 0;
    let sent = 0;

    for (const item of pendingFollowups as FollowupQueueItem[]) {
      try {
        // Check if contact has placed any order since the queue was created
        const { data: orders, error: orderError } = await supabase
          .from("orders")
          .select("id")
          .eq("contact_id", item.contact_id)
          .in("status", ["confirmed", "processing", "shipped", "delivered", "completed"])
          .limit(1);

        if (!orderError && orders && orders.length > 0) {
          // Contact has placed an order, skip follow-up
          await supabase
            .from("whatsapp_followup_queue")
            .update({ status: "skipped", skip_reason: "order_placed" })
            .eq("id", item.id);
          
          console.log(`Skipped follow-up ${item.id}: order_placed`);
          skipped++;
          processed++;
          continue;
        }

        // Check if contact has sent any new messages since the queue was created
        const { data: newMessages, error: messageError } = await supabase
          .from("messages")
          .select("id")
          .eq("contact_id", item.contact_id)
          .eq("direction", "inbound")
          .gt("created_at", item.created_at)
          .limit(1);

        if (!messageError && newMessages && newMessages.length > 0) {
          // Contact has replied, skip follow-up
          await supabase
            .from("whatsapp_followup_queue")
            .update({ status: "skipped", skip_reason: "customer_replied" })
            .eq("id", item.id);
          
          console.log(`Skipped follow-up ${item.id}: customer_replied`);
          skipped++;
          processed++;
          continue;
        }

        // Get auto message settings
        const { data: settings, error: settingsError } = await supabase
          .from("whatsapp_auto_messages")
          .select("followup_message, followup_media_items")
          .eq("tenant_id", item.tenant_id)
          .maybeSingle();

        if (settingsError || !settings || !settings.followup_message) {
          // No settings or message, skip
          await supabase
            .from("whatsapp_followup_queue")
            .update({ status: "skipped", skip_reason: "no_message_configured" })
            .eq("id", item.id);
          
          console.log(`Skipped follow-up ${item.id}: no_message_configured`);
          skipped++;
          processed++;
          continue;
        }

        // Send the follow-up message
        const message = settings.followup_message;
        const mediaItems = (settings.followup_media_items || []) as MediaItem[];

        // Send text message
        if (message) {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              contact_id: item.contact_id,
              instance_id: item.instance_id,
              content: message,
              content_type: "text",
            }),
          });

          if (!response.ok) {
            console.error(`Failed to send follow-up text for ${item.id}:`, response.status);
          }
        }

        // Send media items
        for (const media of mediaItems) {
          const response = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              contact_id: item.contact_id,
              instance_id: item.instance_id,
              content: media.caption || "",
              content_type: media.type,
              media_url: media.url,
              media_filename: media.filename,
            }),
          });

          if (!response.ok) {
            console.error(`Failed to send follow-up media for ${item.id}:`, response.status);
          }
        }

        // Log the auto message
        await supabase
          .from("whatsapp_auto_message_log")
          .insert({
            tenant_id: item.tenant_id,
            contact_id: item.contact_id,
            message_type: "followup",
          });

        // Mark as sent
        await supabase
          .from("whatsapp_followup_queue")
          .update({ status: "sent" })
          .eq("id", item.id);

        console.log(`Sent follow-up ${item.id} to contact ${item.contact_id}`);
        sent++;
        processed++;
      } catch (itemError) {
        console.error(`Error processing follow-up ${item.id}:`, itemError);
        processed++;
      }
    }

    console.log(`Follow-up cron completed: processed=${processed}, sent=${sent}, skipped=${skipped}`);

    return new Response(
      JSON.stringify({ success: true, processed, sent, skipped }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Follow-up cron error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
