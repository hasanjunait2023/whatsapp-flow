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

    const { group_id, message, image_url, video_url, document_url } = await req.json();

    if (!group_id) {
      return new Response(JSON.stringify({ error: "group_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message && !image_url && !video_url && !document_url) {
      return new Response(JSON.stringify({ error: "Message content is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the group with instance details
    const { data: group, error: groupError } = await supabaseClient
      .from("whatsapp_groups")
      .select(`
        *,
        instance:whatsapp_instances(id, api_key_encrypted)
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

    // Build request body
    const requestBody: any = {
      groupId: group.wa_group_id,
    };

    if (message) {
      requestBody.text = message;
    }
    if (image_url) {
      requestBody.imageUrl = image_url;
    }
    if (video_url) {
      requestBody.videoUrl = video_url;
    }
    if (document_url) {
      requestBody.documentUrl = document_url;
    }

    // Send message via Wasender API
    const wasenderResponse = await fetch(
      "https://www.wasenderapi.com/api/groups/send-message",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sessionApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!wasenderResponse.ok) {
      const errorText = await wasenderResponse.text();
      console.error("Wasender API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to send message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await wasenderResponse.json();

     // Store outbound message in database
     const serviceClient = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
     );
 
     // Determine content type and media
     let contentType = "text";
     let mediaUrl: string | null = null;
     if (image_url) {
       contentType = "image";
       mediaUrl = image_url;
     } else if (video_url) {
       contentType = "video";
       mediaUrl = video_url;
     } else if (document_url) {
       contentType = "document";
       mediaUrl = document_url;
     }
 
     // Insert message record
     await serviceClient.from("messages").insert({
       tenant_id: group.tenant_id,
       instance_id: group.instance_id,
       wa_group_id: group.wa_group_id,
       contact_id: null, // Group messages don't have a single contact
       wa_message_id: result.data?.id || result.id || null,
       direction: "outbound",
       status: "sent",
       content_type: contentType,
       content: message || null,
       media_url: mediaUrl,
       sent_by_user_id: user.id,
       sent_at: new Date().toISOString(),
     });
 
     // Update group's last message info
     await serviceClient
       .from("whatsapp_groups")
       .update({
         last_message_at: new Date().toISOString(),
         last_message_preview: message ? message.substring(0, 100) : (contentType === "image" ? "📷 ছবি" : contentType === "video" ? "🎥 ভিডিও" : "📄 ডকুমেন্ট"),
       })
       .eq("id", group_id);
 
    return new Response(
      JSON.stringify({
        success: true,
        message_id: result.data?.id || result.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-send-message:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
