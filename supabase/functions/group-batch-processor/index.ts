import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function is triggered by a CRON job to process queued group member additions
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date().toISOString().split("T")[0];
    
    // Get pending queue items for today
    const { data: queueItems, error: fetchError } = await serviceClient
      .from("group_add_queue")
      .select(`
        *,
        group:whatsapp_groups(
          id,
          wa_group_id,
          name,
          tenant_id,
          instance:whatsapp_instances(id, api_key_encrypted, tenant_id)
        )
      `)
      .eq("scheduled_for", today)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("Error fetching queue:", fetchError);
      throw fetchError;
    }

    let totalProcessed = 0;
    let totalFailed = 0;

    for (const queueItem of queueItems || []) {
      const group = queueItem.group as any;
      const instance = group?.instance;

      const sessionApiKey = instance?.api_key_encrypted as string | null;
      if (!sessionApiKey) {
        console.error(`No API key for queue item ${queueItem.id}`);
        continue;
      }

      // Check tenant daily limit
      const { data: limitRecord } = await serviceClient
        .from("tenant_daily_group_limits")
        .select("*")
        .eq("tenant_id", instance.tenant_id)
        .eq("date", today)
        .single();

      const currentCount = limitRecord?.members_added || 0;
      const maxLimit = limitRecord?.max_daily_limit || 50;

      if (currentCount >= maxLimit) {
        console.log(`Tenant ${instance.tenant_id} hit daily limit`);
        continue;
      }

      // Calculate how many to add in this batch
      const remainingInQueue = queueItem.phone_numbers.length - queueItem.processed_count;
      const availableSlots = maxLimit - currentCount;
      const batchSize = Math.min(queueItem.batch_size, remainingInQueue, availableSlots);

      if (batchSize <= 0) continue;

      // Get the next batch of phone numbers
      const startIndex = queueItem.processed_count;
      const numbersToAdd = queueItem.phone_numbers.slice(startIndex, startIndex + batchSize);

      // Update status to processing
      await serviceClient
        .from("group_add_queue")
        .update({ status: "processing" })
        .eq("id", queueItem.id);

      try {
        // Add participants via Wasender API
        const wasenderResponse = await fetch(
          `https://www.wasenderapi.com/api/groups/${group.wa_group_id}/participants/add`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${sessionApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              participants: numbersToAdd,
            }),
          }
        );

        const result = await wasenderResponse.json();

        if (wasenderResponse.ok && result.success !== false) {
          // Update queue processed count
          const newProcessedCount = queueItem.processed_count + numbersToAdd.length;
          const isComplete = newProcessedCount >= queueItem.phone_numbers.length;

          await serviceClient
            .from("group_add_queue")
            .update({
              processed_count: newProcessedCount,
              status: isComplete ? "completed" : "pending",
              completed_at: isComplete ? new Date().toISOString() : null,
            })
            .eq("id", queueItem.id);

          // Update daily limit counter
          await serviceClient
            .from("tenant_daily_group_limits")
            .upsert({
              tenant_id: instance.tenant_id,
              date: today,
              members_added: currentCount + numbersToAdd.length,
              max_daily_limit: maxLimit,
            }, {
              onConflict: "tenant_id,date",
            });

          // Add to participants table
          for (const phoneNumber of numbersToAdd) {
            await serviceClient
              .from("whatsapp_group_participants")
              .upsert({
                group_id: group.id,
                phone_number: phoneNumber,
                is_admin: false,
                added_at: new Date().toISOString(),
                added_by: "cron_batch_processor",
              }, {
                onConflict: "group_id,phone_number",
              });
          }

          // Log customer journey events
          const { data: contacts } = await serviceClient
            .from("contacts")
            .select("id, phone_number")
            .eq("tenant_id", instance.tenant_id)
            .in("phone_number", numbersToAdd);

          for (const contact of contacts || []) {
            await serviceClient
              .from("customer_journey_events")
              .insert({
                contact_id: contact.id,
                tenant_id: instance.tenant_id,
                event_type: "group_joined",
                event_category: "communication",
                title: "গ্রুপে যোগ হয়েছেন",
                description: `"${group.name}" গ্রুপে যোগ করা হয়েছে (স্বয়ংক্রিয়)`,
                metadata: {
                  group_id: group.id,
                  group_name: group.name,
                  added_by: "batch_processor",
                },
              });
          }

          totalProcessed += numbersToAdd.length;
        } else {
          // Log the error
          const errorLog = [...(queueItem.error_log || []), {
            timestamp: new Date().toISOString(),
            error: result.error || result.message || "Unknown error",
            batch: numbersToAdd,
          }];

          await serviceClient
            .from("group_add_queue")
            .update({
              failed_count: queueItem.failed_count + numbersToAdd.length,
              error_log: errorLog,
              status: "pending", // Keep as pending to retry later
            })
            .eq("id", queueItem.id);

          totalFailed += numbersToAdd.length;
        }
      } catch (err: any) {
        console.error(`Error processing queue ${queueItem.id}:`, err);
        
        const errorLog = [...(queueItem.error_log || []), {
          timestamp: new Date().toISOString(),
          error: err?.message || "Unknown error",
        }];

        await serviceClient
          .from("group_add_queue")
          .update({
            error_log: errorLog,
            status: "pending",
          })
          .eq("id", queueItem.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        failed: totalFailed,
        queue_items_checked: queueItems?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-batch-processor:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
