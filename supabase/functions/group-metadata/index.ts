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

    const { group_id } = await req.json();

    if (!group_id) {
      return new Response(JSON.stringify({ error: "group_id is required" }), {
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

    // Fetch group metadata from Wasender API
    const wasenderResponse = await fetch(
      `https://www.wasenderapi.com/api/groups/${encodeURIComponent(group.wa_group_id)}/metadata`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${sessionApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!wasenderResponse.ok) {
      const errorText = await wasenderResponse.text();
      console.error("Wasender API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch group metadata" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = await wasenderResponse.json();
    const groupData = metadata.data || metadata;

    // Update group record
    await supabaseClient
      .from("whatsapp_groups")
      .update({
        name: groupData.subject || group.name,
        description: groupData.desc || group.description,
        invite_link: groupData.inviteCode 
          ? `https://chat.whatsapp.com/${groupData.inviteCode}` 
          : group.invite_link,
        participant_count: (groupData.participants || []).length,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", group_id);

    // Sync participants
    const participants = groupData.participants || [];
    
    // Get existing contacts for this tenant
    const phoneNumbers = participants.map((p: any) => {
      const phone = p.id?.replace("@c.us", "") || "";
      return phone;
    }).filter(Boolean);

    const { data: contacts } = await supabaseClient
      .from("contacts")
      .select("id, phone_number")
      .eq("tenant_id", instance.tenant_id)
      .in("phone_number", phoneNumbers);

    const contactMap = new Map((contacts || []).map(c => [c.phone_number, c.id]));

    // Upsert participants
    for (const participant of participants) {
      const phoneNumber = participant.id?.replace("@c.us", "") || "";
      if (!phoneNumber) continue;

      const contactId = contactMap.get(phoneNumber) || null;

        await supabaseClient
        .from("whatsapp_group_participants")
        .upsert({
          group_id: group_id,
          contact_id: contactId,
          phone_number: phoneNumber,
            is_admin: participant.admin === true ||
              participant.admin === "admin" ||
              participant.admin === "superadmin" ||
              participant.isAdmin === true ||
              participant.superAdmin === true ||
              participant.isSuperAdmin === true,
          added_at: new Date().toISOString(),
        }, {
          onConflict: "group_id,phone_number",
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        group: {
          ...group,
          name: groupData.subject || group.name,
          description: groupData.desc || group.description,
          participant_count: participants.length,
        },
        participants_synced: participants.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-metadata:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
