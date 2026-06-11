import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WASENDER_API_BASE = "https://www.wasenderapi.com/api";

interface ForwardMessageRequest {
  messages: Array<{
    content: string | null;
    content_type: string;
    media_url: string | null;
    media_filename: string | null;
    location_lat: number | null;
    location_lng: number | null;
  }>;
  instance_id: string;
  target_contact_id?: string;
  target_phone_number?: string;
}

interface ForwardResult {
  success: boolean;
  message_id?: string;
  wa_message_id?: string;
  error?: string;
}

function safeJsonParse(text: string) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: text };
  }
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

    const payload: ForwardMessageRequest = await req.json();
    console.log("Forward message request:", JSON.stringify({
      messageCount: payload.messages?.length,
      instanceId: payload.instance_id,
      hasTargetContact: !!payload.target_contact_id,
      hasTargetPhone: !!payload.target_phone_number,
    }));

    // Validate request
    if (!payload.messages || payload.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages to forward" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payload.messages.length > 20) {
      return new Response(
        JSON.stringify({ error: "Maximum 20 messages can be forwarded at once" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.instance_id) {
      return new Response(
        JSON.stringify({ error: "instance_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!payload.target_contact_id && !payload.target_phone_number) {
      return new Response(
        JSON.stringify({ error: "Either target_contact_id or target_phone_number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id, tenant_id, api_key_encrypted, status")
      .eq("id", payload.instance_id)
      .single();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (instance.status !== "active") {
      return new Response(
        JSON.stringify({ error: "Instance not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = instance.api_key_encrypted;
    let targetContactId = payload.target_contact_id;
    let phoneNumber = payload.target_phone_number;

    // If target_contact_id provided, get phone number
    if (targetContactId) {
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("phone_number, wa_id")
        .eq("id", targetContactId)
        .single();

      if (contactError || !contact) {
        return new Response(
          JSON.stringify({ error: "Target contact not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      phoneNumber = contact.phone_number || contact.wa_id?.replace(/@.*$/, "");
    } else if (phoneNumber) {
      // Check if contact already exists with this phone number
      const normalizedPhone = phoneNumber.replace(/\D/g, "");
      
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("tenant_id", instance.tenant_id)
        .or(`phone_number.eq.${normalizedPhone},wa_id.eq.${normalizedPhone}@s.whatsapp.net`)
        .maybeSingle();

      if (existingContact) {
        targetContactId = existingContact.id;
      } else {
        // Create new contact
        const { data: newContact, error: createError } = await supabase
          .from("contacts")
          .insert({
            tenant_id: instance.tenant_id,
            instance_id: payload.instance_id,
            phone_number: normalizedPhone,
            wa_id: `${normalizedPhone}@s.whatsapp.net`,
            name: null,
          })
          .select("id")
          .single();

        if (createError || !newContact) {
          console.error("Failed to create contact:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create contact for new number" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        targetContactId = newContact.id;
      }

      phoneNumber = normalizedPhone;
    }

    // Forward all messages
    const results: ForwardResult[] = [];
    let forwarded = 0;
    let failed = 0;

    for (const msg of payload.messages) {
      try {
        const result = await forwardSingleMessage(
          supabase,
          apiKey,
          instance.tenant_id,
          payload.instance_id,
          targetContactId!,
          phoneNumber!,
          msg
        );

        results.push(result);
        if (result.success) {
          forwarded++;
        } else {
          failed++;
        }
      } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error("Error forwarding message:", errorMsg);
        results.push({ success: false, error: errorMsg });
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: forwarded > 0,
        contact_id: targetContactId,
        forwarded,
        failed,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Forward message error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function forwardSingleMessage(
  supabase: any,
  apiKey: string,
  tenantId: string,
  instanceId: string,
  contactId: string,
  phoneNumber: string,
  msg: ForwardMessageRequest["messages"][0]
): Promise<ForwardResult> {
  // Create message record first
  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      tenant_id: tenantId,
      instance_id: instanceId,
      contact_id: contactId,
      direction: "outbound",
      status: "pending",
      content_type: msg.content_type || "text",
      content: msg.content || null,
      media_url: msg.media_url || null,
      media_filename: msg.media_filename || null,
      location_lat: msg.location_lat || null,
      location_lng: msg.location_lng || null,
      is_from_ai: false,
    })
    .select("id")
    .single();

  if (insertError || !message) {
    return { success: false, error: insertError?.message || "Failed to create message" };
  }

  // Build WasenderAPI request
  const endpoint = `${WASENDER_API_BASE}/send-message`;
  let body: any = { to: phoneNumber };

  switch (msg.content_type) {
    case "image":
      body.imageUrl = msg.media_url;
      if (msg.content) body.text = msg.content;
      break;
    case "video":
      body.videoUrl = msg.media_url;
      if (msg.content) body.text = msg.content;
      break;
    case "audio":
    case "voice":
      body.audioUrl = msg.media_url;
      break;
    case "document":
      body.documentUrl = msg.media_url;
      if (msg.media_filename) body.fileName = msg.media_filename;
      break;
    case "sticker":
      body.stickerUrl = msg.media_url;
      break;
    case "location":
      body.latitude = msg.location_lat;
      body.longitude = msg.location_lng;
      if (msg.content) body.text = msg.content;
      break;
    case "text":
    default:
      body.text = msg.content || "";
      break;
  }

  console.log("Sending to WasenderAPI:", JSON.stringify({ 
    to: phoneNumber, 
    contentType: msg.content_type,
    hasMediaUrl: !!msg.media_url 
  }));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    const parsed = safeJsonParse(responseText);
    const responseData: any = parsed.ok ? parsed.data : { raw: responseText.slice(0, 300) };

    if (!response.ok) {
      const errorMsg = responseData.message || responseData.error || responseData.raw || `HTTP ${response.status}`;
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", message.id);
      return { success: false, message_id: message.id, error: errorMsg };
    }

    const waMessageId = responseData.id || responseData.message_id || responseData.messageId;
    
    await supabase
      .from("messages")
      .update({
        status: "sent",
        wa_message_id: waMessageId,
        sent_at: new Date().toISOString(),
      })
      .eq("id", message.id);

    return { success: true, message_id: message.id, wa_message_id: waMessageId };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Network error";
    await supabase
      .from("messages")
      .update({ status: "failed", error_message: errorMsg })
      .eq("id", message.id);
    return { success: false, message_id: message.id, error: errorMsg };
  }
}
