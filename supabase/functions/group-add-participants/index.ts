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

    // Check daily limit
    const today = new Date().toISOString().split("T")[0];
    const { data: limitRecord } = await serviceClient
      .from("tenant_daily_group_limits")
      .select("*")
      .eq("tenant_id", instance.tenant_id)
      .eq("date", today)
      .single();

    const currentCount = limitRecord?.members_added || 0;
    const maxLimit = limitRecord?.max_daily_limit || 50;

    if (currentCount >= maxLimit) {
      return new Response(JSON.stringify({ 
        error: "Daily limit reached",
        limit: maxLimit,
        used: currentCount,
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const availableSlots = maxLimit - currentCount;
    const numbersToAdd = phone_numbers.slice(0, availableSlots);

    // Format phone numbers for Wasender API (digits only)
    const formattedNumbers = numbersToAdd.map((num: string) => {
      const cleaned = num.replace(/\D/g, "");
      return cleaned;
    });

    console.log("Adding participants to group:", group.wa_group_id);
    console.log("Formatted numbers:", formattedNumbers);

    // Add participants via Wasender API
    // Docs: POST /api/groups/{groupJid}/participants/add
    const apiUrl = `https://www.wasenderapi.com/api/groups/${group.wa_group_id}/participants/add`;
    console.log("API URL:", apiUrl);

    const wasenderResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sessionApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        participants: formattedNumbers,
      }),
    });

    const rawText = await wasenderResponse.text();
    console.log("Wasender response status:", wasenderResponse.status);
    console.log("Wasender raw response:", rawText);

    let result: any = null;
    try {
      result = rawText ? JSON.parse(rawText) : null;
    } catch {
      result = { message: rawText };
    }
    
    let addedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const addedNumbers: string[] = [];

    // Check if API call was successful
    if (!wasenderResponse.ok) {
      // API returned an error status
      const errorMsg = result?.error || result?.message || `API Error: ${wasenderResponse.status}`;
      console.error("Wasender API error:", errorMsg);
      return new Response(
        JSON.stringify({
          success: false,
          added: 0,
          failed: formattedNumbers.length,
          remaining_today: availableSlots,
          errors: [errorMsg],
          debug: { status: wasenderResponse.status, response: rawText.substring(0, 500) }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the response according to Wasender docs:
    // { success: true, data: [{ status: 200 or "200", jid: "...", message: "added" }, ...] }
    if (result?.success && Array.isArray(result?.data)) {
      for (let i = 0; i < result.data.length; i++) {
        const item = result.data[i];
        // Status can be number or string, convert to number for comparison
        const statusCode = parseInt(String(item.status), 10);
        
        // 200 = added, 409 = already in group (both count as success)
        if (statusCode === 200 || statusCode === 409 || item.message === "added") {
          addedCount++;
          // Try to match the jid back to our phone number
          if (formattedNumbers[i]) {
            addedNumbers.push(formattedNumbers[i]);
          }
          // For 409, note that user was already in group
          if (statusCode === 409) {
            console.log(`Participant ${formattedNumbers[i]} already in group`);
          }
        } else {
          failedCount++;
          const errorMsg = item.error || item.message || `status ${statusCode}`;
          errors.push(`${formattedNumbers[i] || item.jid}: ${errorMsg}`);
        }
      }
    } else if (result?.success === true) {
      // Simple success without data array - assume all added
      addedCount = formattedNumbers.length;
      addedNumbers.push(...formattedNumbers);
    } else {
      // Failed
      failedCount = formattedNumbers.length;
      errors.push(result?.error || result?.message || "Unknown error from Wasender");
    }

    console.log("Added count:", addedCount, "Failed count:", failedCount);

    // Only update database if some were added
    if (addedCount > 0) {
      // Update daily limit counter
      await serviceClient
        .from("tenant_daily_group_limits")
        .upsert({
          tenant_id: instance.tenant_id,
          date: today,
          members_added: currentCount + addedCount,
          max_daily_limit: maxLimit,
        }, {
          onConflict: "tenant_id,date",
        });

      // Get contacts for journey logging
      if (log_journey && addedNumbers.length > 0) {
        const { data: contacts } = await supabaseClient
          .from("contacts")
          .select("id, phone_number")
          .eq("tenant_id", instance.tenant_id)
          .in("phone_number", addedNumbers);

        // Log customer journey events
        for (const contact of contacts || []) {
          await serviceClient
            .from("customer_journey_events")
            .insert({
              contact_id: contact.id,
              tenant_id: instance.tenant_id,
              event_type: "group_joined",
              event_category: "communication",
              title: "গ্রুপে যোগ হয়েছেন",
              description: `"${group.name}" গ্রুপে যোগ করা হয়েছে`,
              metadata: {
                group_id: group.id,
                group_name: group.name,
                added_by: user.id,
              },
              created_by: user.id,
            });
        }
      }

      // Add to participants table
      for (const phoneNumber of addedNumbers) {
        const { data: contact } = await supabaseClient
          .from("contacts")
          .select("id")
          .eq("tenant_id", instance.tenant_id)
          .eq("phone_number", phoneNumber)
          .single();

        await serviceClient
          .from("whatsapp_group_participants")
          .upsert({
            group_id: group_id,
            contact_id: contact?.id || null,
            phone_number: phoneNumber,
            is_admin: false,
            added_at: new Date().toISOString(),
            added_by: user.id,
          }, {
            onConflict: "group_id,phone_number",
          });
      }

      // Update group participant count
      await serviceClient
        .from("whatsapp_groups")
        .update({
          participant_count: (group.participant_count || 0) + addedCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", group_id);
    }

    return new Response(
      JSON.stringify({
        success: addedCount > 0,
        added: addedCount,
        failed: failedCount,
        remaining_today: maxLimit - currentCount - addedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-add-participants:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
