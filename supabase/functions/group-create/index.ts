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
 
     const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
     if (authError || !user) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const { instance_id, group_name, participant_phone_numbers } = await req.json();
 
     if (!instance_id || !group_name) {
       return new Response(JSON.stringify({ error: "instance_id and group_name are required" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Get instance with API key
     const { data: instance, error: instanceError } = await supabaseClient
       .from("whatsapp_instances")
       .select("id, tenant_id, api_key_encrypted, phone_number")
       .eq("id", instance_id)
       .single();
 
     if (instanceError || !instance) {
       return new Response(JSON.stringify({ error: "Instance not found" }), {
         status: 404,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const sessionApiKey = instance.api_key_encrypted as string | null;
     if (!sessionApiKey) {
       return new Response(JSON.stringify({ error: "Instance not connected" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Prepare participants in JID format
     const participants = (participant_phone_numbers || []).map((phone: string) => {
       const cleanPhone = phone.replace(/[^0-9]/g, "");
       return `${cleanPhone}@s.whatsapp.net`;
     });
 
     console.log("Creating group via Wasender:", { group_name, participants });
 
     // Call Wasender API to create group
     const wasenderResponse = await fetch("https://www.wasenderapi.com/api/groups", {
       method: "POST",
       headers: {
         "Authorization": `Bearer ${sessionApiKey}`,
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         name: group_name,
         participants: participants,
       }),
     });
 
     if (!wasenderResponse.ok) {
       const errorText = await wasenderResponse.text();
       console.error("Wasender API error:", errorText);
       return new Response(JSON.stringify({ error: "Failed to create group", details: errorText }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const wasenderResult = await wasenderResponse.json();
     console.log("Wasender group created:", wasenderResult);
 
     const groupData = wasenderResult.data || wasenderResult;
     const waGroupId = groupData.id; // e.g., "123456789-987654321@g.us"
     const groupSubject = groupData.subject || group_name;
     const groupParticipants = groupData.participants || [];
 
     // Insert group into database
     const { data: newGroup, error: groupError } = await supabaseClient
       .from("whatsapp_groups")
       .insert({
         tenant_id: instance.tenant_id,
         instance_id: instance.id,
         wa_group_id: waGroupId,
         name: groupSubject,
         participant_count: groupParticipants.length,
         is_admin: true, // We created it, so we're admin
         is_created_by_tenant: true,
         synced_at: new Date().toISOString(),
       })
       .select()
       .single();
 
     if (groupError) {
       console.error("Error inserting group:", groupError);
       return new Response(JSON.stringify({ error: "Failed to save group", details: groupError.message }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Insert participants and log journey events
     for (const participant of groupParticipants) {
       const participantPhone = participant.id?.replace("@s.whatsapp.net", "").replace("@lid", "") || "";
       const isAdmin = participant.admin === "superadmin" || participant.admin === "admin";
 
       // Skip if it's the instance's own number
       if (instance.phone_number && participantPhone === instance.phone_number.replace(/[^0-9]/g, "")) {
         continue;
       }
 
       // Try to find existing contact
       const { data: existingContact } = await supabaseClient
         .from("contacts")
         .select("id")
         .eq("tenant_id", instance.tenant_id)
         .eq("phone_number", participantPhone)
         .maybeSingle();
 
       // Insert participant
       await supabaseClient.from("whatsapp_group_participants").insert({
         group_id: newGroup.id,
         contact_id: existingContact?.id || null,
         phone_number: participantPhone,
         is_admin: isAdmin,
         added_at: new Date().toISOString(),
       });
 
       // Log journey event if contact exists
       if (existingContact) {
         await supabaseClient.from("customer_journey_events").insert({
           tenant_id: instance.tenant_id,
           contact_id: existingContact.id,
           event_type: "group_joined",
           event_category: "engagement",
           title: `গ্রুপে যুক্ত হয়েছেন`,
           description: `${groupSubject} গ্রুপে যুক্ত করা হয়েছে`,
           metadata: {
             group_id: newGroup.id,
             group_name: groupSubject,
             wa_group_id: waGroupId,
           },
         });
       }
     }
 
     return new Response(
       JSON.stringify({
         success: true,
         group: newGroup,
         wa_group_id: waGroupId,
       }),
       { headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error: any) {
     console.error("Error in group-create:", error);
     return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });