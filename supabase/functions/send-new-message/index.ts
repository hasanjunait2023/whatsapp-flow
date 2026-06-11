import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WASENDER_API_BASE = "https://www.wasenderapi.com/api";

interface SendNewMessageRequest {
  phone_number: string;
  instance_id: string;
  content: string;
  content_type?: string;
  media_url?: string | null;
  media_filename?: string | null;
}

function safeJsonParse(text: string) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: text };
  }
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let normalized = phone.replace(/\D/g, "");
  
  // Handle Bangladesh numbers
  if (normalized.startsWith("0") && normalized.length === 11) {
    // Add country code for BD numbers starting with 0
    normalized = "880" + normalized.slice(1);
  } else if (normalized.length === 10 && normalized.startsWith("1")) {
    // Add country code for BD numbers without leading 0
    normalized = "880" + normalized;
  }
  
  return normalized;
}

function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // Must be at least 10 digits after normalization
  return normalized.length >= 10 && /^\d+$/.test(normalized);
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

    const payload: SendNewMessageRequest = await req.json();
    console.log("Send new message request:", JSON.stringify({
      phone_number: payload.phone_number,
      instance_id: payload.instance_id,
      content_type: payload.content_type || "text",
      hasContent: !!payload.content,
      hasMedia: !!payload.media_url,
    }));

    // Validate phone number
    if (!payload.phone_number || !isValidPhoneNumber(payload.phone_number)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Must be at least 10 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate instance_id
    if (!payload.instance_id) {
      return new Response(
        JSON.stringify({ error: "instance_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate content
    if (!payload.content && !payload.media_url) {
      return new Response(
        JSON.stringify({ error: "Content or media_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = normalizePhoneNumber(payload.phone_number);
    const waId = `${normalizedPhone}@s.whatsapp.net`;

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
        JSON.stringify({ error: "WhatsApp instance is not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = instance.api_key_encrypted;
    let contactId: string;

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("tenant_id", instance.tenant_id)
      .or(`phone_number.eq.${normalizedPhone},wa_id.eq.${waId}`)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
      console.log("Using existing contact:", contactId);
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from("contacts")
        .insert({
          tenant_id: instance.tenant_id,
          instance_id: payload.instance_id,
          phone_number: normalizedPhone,
          wa_id: waId,
          name: null,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError || !newContact) {
        console.error("Failed to create contact:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create contact" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      contactId = newContact.id;
      console.log("Created new contact:", contactId);
    }

    // Create message record
    const contentType = payload.content_type || "text";
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        tenant_id: instance.tenant_id,
        instance_id: payload.instance_id,
        contact_id: contactId,
        direction: "outbound",
        status: "pending",
        content_type: contentType,
        content: payload.content || null,
        media_url: payload.media_url || null,
        media_filename: payload.media_filename || null,
        is_from_ai: false,
      })
      .select("id")
      .single();

    if (insertError || !message) {
      console.error("Failed to create message:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create message record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build WasenderAPI request
    const endpoint = `${WASENDER_API_BASE}/send-message`;
    let body: Record<string, unknown> = { to: normalizedPhone };

    switch (contentType) {
      case "image":
        body.imageUrl = payload.media_url;
        if (payload.content) body.text = payload.content;
        break;
      case "video":
        body.videoUrl = payload.media_url;
        if (payload.content) body.text = payload.content;
        break;
      case "audio":
      case "voice":
        body.audioUrl = payload.media_url;
        break;
      case "document":
        body.documentUrl = payload.media_url;
        if (payload.media_filename) body.fileName = payload.media_filename;
        break;
      case "text":
      default:
        body.text = payload.content || "";
        break;
    }

    console.log("Sending to WasenderAPI:", JSON.stringify({
      to: normalizedPhone,
      contentType,
      hasMediaUrl: !!payload.media_url,
    }));

    // Send via WasenderAPI
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
      const responseData = parsed.ok ? parsed.data : { raw: responseText.slice(0, 300) };

      if (!response.ok) {
        const errorMsg = responseData.message || responseData.error || responseData.raw || `HTTP ${response.status}`;
        console.error("WasenderAPI error:", errorMsg);
        
        await supabase
          .from("messages")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", message.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: errorMsg,
            contact_id: contactId,
            message_id: message.id,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const waMessageId = responseData.id || responseData.message_id || responseData.messageId;
      const now = new Date().toISOString();

      // Update message status
      await supabase
        .from("messages")
        .update({
          status: "sent",
          wa_message_id: waMessageId,
          sent_at: now,
        })
        .eq("id", message.id);

      // Update contact last_message_at and instance_id
      await supabase
        .from("contacts")
        .update({ 
          last_message_at: now,
          instance_id: payload.instance_id, // Ensure correct instance_id
        })
        .eq("id", contactId);

      // Upsert contact_thread_state so the contact appears in inbox
      const textPreview = (payload.content || "").substring(0, 100) || (contentType !== "text" ? `[${contentType}]` : "");
      try {
        await supabase.from("contact_thread_state").upsert(
          {
            contact_id: contactId,
            tenant_id: instance.tenant_id,
            instance_id: payload.instance_id,
            contact_type: "whatsapp",
            contact_phone: normalizedPhone,
            contact_name: null,
            last_message_at: now,
            last_message_preview: `You: ${textPreview}`,
            last_message_direction: "outbound",
            last_message_type: contentType,
            unread_count: 0,
            total_messages: 1,
            is_archived: false,
            is_blocked: false,
            needs_handoff: false,
            updated_at: now,
          },
          { onConflict: "contact_id" }
        );
        console.log("contact_thread_state upserted for:", contactId);
      } catch (threadStateError) {
        console.log("contact_thread_state upsert error:", threadStateError);
      }

      console.log("Message sent successfully:", { contactId, messageId: message.id, waMessageId });

      return new Response(
        JSON.stringify({
          success: true,
          contact_id: contactId,
          message_id: message.id,
          wa_message_id: waMessageId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (networkError) {
      const errorMsg = networkError instanceof Error ? networkError.message : "Network error";
      console.error("Network error:", errorMsg);
      
      await supabase
        .from("messages")
        .update({ status: "failed", error_message: errorMsg })
        .eq("id", message.id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMsg,
          contact_id: contactId,
          message_id: message.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Send new message error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
