import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const WASENDER_API_BASE = "https://www.wasenderapi.com/api";

interface WasenderMessage {
  id?: string;
  from?: string;
  to?: string;
  pushName?: string;
  type?: string;
  text?: { body?: string };
  image?: { url?: string; caption?: string; mime_type?: string; mediaKey?: string };
  video?: { url?: string; caption?: string; mime_type?: string; mediaKey?: string };
  audio?: { url?: string; mime_type?: string; ptt?: boolean; mediaKey?: string };
  document?: { url?: string; filename?: string; mime_type?: string; mediaKey?: string };
  sticker?: { url?: string; mime_type?: string; mediaKey?: string };
  location?: { lat?: number; lng?: number; name?: string; address?: string };
  timestamp?: string;
  status?: string;
}

interface WasenderMessagesData {
  key?: {
    id?: string;
    fromMe?: boolean;
    remoteJid?: string;
    senderPn?: string;
    cleanedSenderPn?: string;
    senderLid?: string;
    addressingMode?: string; // 'lid' or 'pn'
  };
  messageTimestamp?: number | string;
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string; contextInfo?: { quotedMessage?: any } };
    imageMessage?: { url?: string; caption?: string; mimetype?: string; mediaKey?: string; directPath?: string };
    videoMessage?: { url?: string; caption?: string; mimetype?: string; mediaKey?: string; directPath?: string };
    audioMessage?: { url?: string; mimetype?: string; ptt?: boolean; mediaKey?: string; directPath?: string };
    documentMessage?: { url?: string; fileName?: string; mimetype?: string; mediaKey?: string; directPath?: string };
    stickerMessage?: { url?: string; mimetype?: string; mediaKey?: string; directPath?: string };
    locationMessage?: { degreesLatitude?: number; degreesLongitude?: number; name?: string; address?: string };
  };
  messageBody?: string;
}

interface WebhookPayload {
  event?: string;
  instance_id?: string;
  session_id?: string;
  sessionId?: string;
  message?: WasenderMessage;
  data?: {
    messages?: WasenderMessagesData;
    sessionId?: string;
    // Read receipt data
    keys?: Array<{
      id?: string;
      remoteJid?: string;
      fromMe?: boolean;
    }>;
    // Alternative read receipt format / status update key
    key?: {
      id?: string;
      remoteJid?: string;
      fromMe?: boolean;
    };
    type?: string; // 'read-receipt'
    participant?: string;
    // Session status from payload.data (alternative location)
    status?: string | number; // Can be string for session status, or numeric for message status (1=pending, 2=sent, 3=delivered, 4=read)
    // QR code from payload.data (alternative location)
    qr?: string;
    qrcode?: string;
    // Message timestamp for status updates
    messageTimestamp?: number | string;
  };
  // Presence/typing data
  presence?: {
    id?: string; // remoteJid
    type?: 'composing' | 'paused' | 'available' | 'unavailable';
    lastKnownPresence?: string;
  };
  status?: {
    id?: string;
    status?: string;
    timestamp?: string;
  };
  qrcode?: {
    qr?: string;
    qrcode?: string;
    expires_at?: string;
  };
  session?: {
    id?: string;
    status?: string;
    phone?: string;
    device_info?: Record<string, unknown>;
  };
}

// Get file extension from mime type - strip codec info
function getExtension(mimeType: string): string {
  const cleanMime = mimeType.split(";")[0].trim();
  
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return map[cleanMime] || cleanMime.split("/")[1] || "bin";
}

// Decrypt media using WasenderAPI and store in Supabase
async function decryptAndStoreMedia(
  supabase: any,
  tenantId: string,
  messagesData: WasenderMessagesData,
  contentType: string,
  mimeType: string
): Promise<string | null> {
  try {
    const wasenderToken = Deno.env.get("WASENDER_PERSONAL_TOKEN");
    if (!wasenderToken) {
      console.error("WASENDER_PERSONAL_TOKEN not configured");
      return null;
    }

    console.log("Decrypting media via WasenderAPI for type:", contentType);

    // Call WasenderAPI decrypt-media endpoint with the full message structure
    const decryptResponse = await fetch(`${WASENDER_API_BASE}/decrypt-media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${wasenderToken}`,
        "Accept": "application/json",
      },
      body: JSON.stringify({
        data: {
          messages: messagesData
        }
      }),
    });

    if (!decryptResponse.ok) {
      const errorText = await decryptResponse.text();
      console.error("Decrypt API failed:", decryptResponse.status, errorText);
      return null;
    }

    const decryptResult = await decryptResponse.json();
    console.log("Decrypt result:", JSON.stringify(decryptResult));

    const publicUrl = decryptResult.publicUrl || decryptResult.url;
    if (!publicUrl) {
      console.error("No publicUrl in decrypt response:", decryptResult);
      return null;
    }

    console.log("Downloading decrypted media from:", publicUrl);

    // Download the decrypted media
    const mediaResponse = await fetch(publicUrl);
    if (!mediaResponse.ok) {
      console.error("Failed to download decrypted media:", mediaResponse.status);
      return null;
    }

    const blob = await mediaResponse.blob();
    const cleanMime = mimeType.split(";")[0].trim();
    const ext = getExtension(mimeType);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${tenantId}/${contentType}/${fileName}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(filePath, blob, { contentType: cleanMime });

    if (uploadError) {
      console.error("Failed to upload media:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(filePath);

    console.log("Media stored at:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Media decrypt/store failed:", error);
    return null;
  }
}

// Transform Wasender message format to our standard format
function transformWasenderMessage(messages: WasenderMessagesData | undefined): WasenderMessage & { phone?: string } {
  if (!messages) return {};
  
  // Detect LID mode - used by WhatsApp Business for linked devices
  const isLidMode = messages.key?.addressingMode === 'lid' || messages.key?.remoteJid?.endsWith('@lid');
  
  let phoneNumber: string;
  let waId: string;
  
  if (isLidMode) {
    // For LID mode: use cleanedSenderPn for phone, remoteJid for wa_id
    phoneNumber = messages.key?.cleanedSenderPn || '';
    waId = messages.key?.remoteJid || messages.key?.senderLid || '';
  } else {
    // For normal mode: use senderPn
    phoneNumber = messages.key?.cleanedSenderPn || messages.key?.senderPn?.replace("@s.whatsapp.net", "") || "";
    waId = messages.key?.senderPn || `${phoneNumber}@s.whatsapp.net`;
  }
  
  const ts = Number(messages.messageTimestamp);
  const timestamp = ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString();
  
  let text: { body?: string } | undefined;
  let image: { url?: string; caption?: string; mime_type?: string; mediaKey?: string } | undefined;
  let video: { url?: string; caption?: string; mime_type?: string; mediaKey?: string } | undefined;
  let audio: { url?: string; mime_type?: string; ptt?: boolean; mediaKey?: string } | undefined;
  let document: { url?: string; filename?: string; mime_type?: string; mediaKey?: string } | undefined;
  let sticker: { url?: string; mime_type?: string; mediaKey?: string } | undefined;
  let location: { lat?: number; lng?: number; name?: string; address?: string } | undefined;
  let type = "unknown";
  
  if (messages.messageBody || messages.message?.conversation) {
    text = { body: messages.messageBody || messages.message?.conversation };
    type = "text";
  } else if (messages.message?.extendedTextMessage) {
    text = { body: messages.message.extendedTextMessage.text };
    type = "text";
  }
  
  if (messages.message?.imageMessage) {
    const img = messages.message.imageMessage;
    image = {
      url: img.url || img.directPath,
      caption: img.caption,
      mime_type: img.mimetype,
      mediaKey: img.mediaKey,
    };
    type = "image";
  }
  
  if (messages.message?.videoMessage) {
    const vid = messages.message.videoMessage;
    video = {
      url: vid.url || vid.directPath,
      caption: vid.caption,
      mime_type: vid.mimetype,
      mediaKey: vid.mediaKey,
    };
    type = "video";
  }
  
  if (messages.message?.audioMessage) {
    const aud = messages.message.audioMessage;
    audio = {
      url: aud.url || aud.directPath,
      mime_type: aud.mimetype,
      ptt: aud.ptt,
      mediaKey: aud.mediaKey,
    };
    type = aud.ptt ? "voice" : "audio";
  }
  
  if (messages.message?.documentMessage) {
    const doc = messages.message.documentMessage;
    document = {
      url: doc.url || doc.directPath,
      filename: doc.fileName,
      mime_type: doc.mimetype,
      mediaKey: doc.mediaKey,
    };
    type = "document";
  }
  
  if (messages.message?.stickerMessage) {
    const stk = messages.message.stickerMessage;
    sticker = {
      url: stk.url || stk.directPath,
      mime_type: stk.mimetype,
      mediaKey: stk.mediaKey,
    };
    type = "sticker";
  }
  
  if (messages.message?.locationMessage) {
    const loc = messages.message.locationMessage;
    location = {
      lat: loc.degreesLatitude,
      lng: loc.degreesLongitude,
      name: loc.name,
      address: loc.address,
    };
    type = "location";
  }
  
  return {
    id: messages.key?.id,
    from: waId,
    pushName: messages.pushName,
    phone: phoneNumber, // Add explicit phone number for LID mode
    type,
    text,
    image,
    video,
    audio,
    document,
    sticker,
    location,
    timestamp,
  };
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const instanceId = pathParts[pathParts.length - 1] || url.searchParams.get("instance_id");

    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: "Instance ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookSecret = req.headers.get("x-webhook-secret");
    
    const { data: instance, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("id, tenant_id, webhook_secret, wasender_session_id, phone_number, status")
      .eq("id", instanceId)
      .maybeSingle();

    if (instanceError || !instance) {
      console.error("Instance not found:", instanceId, instanceError);
      return new Response(
        JSON.stringify({ error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (webhookSecret && instance.webhook_secret && webhookSecret !== instance.webhook_secret) {
      console.error("Invalid webhook secret for instance:", instanceId);
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse payload early to validate session ID
    const payload: WebhookPayload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload));

    // Validate that the webhook is from the correct Wasender session
    // This prevents messages from unregistered instances being recorded
    const payloadSessionId = payload.sessionId || payload.session?.id || payload.data?.sessionId;
    if (payloadSessionId && instance.wasender_session_id) {
      if (payloadSessionId !== instance.wasender_session_id) {
        console.warn(`Session ID mismatch: expected ${instance.wasender_session_id}, got ${payloadSessionId}. Rejecting webhook.`);
        return new Response(
          JSON.stringify({ success: false, reason: "session_mismatch", message: "Webhook session ID does not match registered instance" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


    await supabase
      .from("webhook_events_log")
      .insert({
        tenant_id: instance.tenant_id,
        instance_id: instance.id,
        event_type: payload.event || "unknown",
        payload: payload,
        processed: false
      });

    if ((payload.event === "message" || payload.event === "messages.received" || payload.event === "messages.upsert") && (payload.message || payload.data?.messages)) {
      const rawMessagesData = payload.data?.messages;
      const isFromMe = rawMessagesData?.key?.fromMe === true;
      
      if (isFromMe) {
        // Message sent from phone/WhatsApp Web - sync to CRM
        const messageData = payload.message || transformWasenderMessage(rawMessagesData);
        await handleOutboundSync(supabase, instance, messageData, rawMessagesData);
      } else {
        // Incoming message from customer
        const messageData = payload.message || transformWasenderMessage(rawMessagesData);
        const pushName = rawMessagesData?.pushName || payload.message?.pushName;
        await handleIncomingMessage(supabase, instance, messageData, pushName, rawMessagesData);
      }
    } else if (payload.event === "messages.update") {
      // Handle status updates - can be in payload.status or payload.data
      if (payload.status) {
        await handleStatusUpdate(supabase, payload.status);
      } else if (payload.data?.status !== undefined && payload.data?.key?.id) {
        // Wasender sends status in data.status with numeric codes
        // 1=pending, 2=sent, 3=delivered, 4=read
        const numericStatusMap: Record<number, string> = {
          1: 'pending',
          2: 'sent', 
          3: 'delivered',
          4: 'read',
        };
        const statusNum = typeof payload.data.status === 'number' ? payload.data.status : parseInt(String(payload.data.status), 10);
        const newStatus = numericStatusMap[statusNum] || 'sent';
        console.log(`Handling messages.update: message_id=${payload.data.key.id}, numeric_status=${statusNum}, mapped_status=${newStatus}`);
        await handleStatusUpdate(supabase, {
          id: payload.data.key.id,
          status: newStatus,
          timestamp: payload.data.messageTimestamp?.toString(),
        });
      }
    } else if (payload.event === "status" && payload.status) {
      await handleStatusUpdate(supabase, payload.status);
    } else if (payload.event === "message-receipt.update" || payload.event === "messages.read" || payload.event === "read-receipt") {
      // Handle read receipts - when user reads messages on their phone
      await handleReadReceipt(supabase, instance, payload);
    } else if (payload.event === "qrcode.updated" || payload.event === "qrcode") {
      await handleQRCodeUpdate(supabase, instance, payload.qrcode, payload);
    } else if (payload.event === "session.status" || payload.event === "session") {
      await handleSessionStatus(supabase, instance, payload.session, payload);
    } else if (payload.event === "presence" || payload.event === "presence.update") {
      // Handle typing indicators from phone/WhatsApp Web
      await handleTypingPresence(supabase, instance, payload);
    } else {
      console.log("Unhandled event type:", payload.event);
    }

    await supabase
      .from("webhook_events_log")
      .update({ processed: true })
      .eq("instance_id", instance.id)
      .eq("event_type", payload.event || "unknown")
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleIncomingMessage(
  supabase: any,
  instance: { id: string; tenant_id: string },
  message: WasenderMessage & { phone?: string },
  pushName?: string,
  rawMessagesData?: WasenderMessagesData
) {
  const waId = message.from || "";
  
  // Handle LID mode - get real phone number from rawMessagesData or message.phone
  const isLidMode = rawMessagesData?.key?.addressingMode === 'lid' || waId.endsWith('@lid');
  let phoneNumber: string;
  
  if (isLidMode && rawMessagesData?.key?.cleanedSenderPn) {
    phoneNumber = rawMessagesData.key.cleanedSenderPn;
  } else if (message.phone) {
    phoneNumber = message.phone;
  } else {
    phoneNumber = waId.replace("@s.whatsapp.net", "").replace("@c.us", "").replace("@lid", "");
  }
  
  // Use pushName from rawMessagesData if available
  const contactName = pushName || rawMessagesData?.pushName || null;
  
  console.log("Processing incoming message - waId:", waId, "phoneNumber:", phoneNumber, "pushName:", contactName, "isLidMode:", isLidMode);

  let contact: { id: string; unread_count: number; name?: string | null; profile_pic_synced_at?: string | null } | null = null;
  let isNewContact = false;
  
  // Try to find contact by wa_id first
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("id, unread_count, name, phone_number, profile_pic_synced_at")
    .eq("instance_id", instance.id)
    .eq("wa_id", waId)
    .maybeSingle();

  if (existingContact) {
    const updateData: any = { last_message_at: new Date().toISOString() };
    // Update name if we have pushName and current name is missing or is the LID format
    if (contactName && (!existingContact.name || existingContact.name.endsWith('@lid'))) {
      updateData.name = contactName;
    }
    // Update phone_number if it's wrong (contains @lid)
    if (existingContact.phone_number?.includes('@lid') && phoneNumber && !phoneNumber.includes('@lid')) {
      updateData.phone_number = phoneNumber;
    }
    await supabase
      .from("contacts")
      .update(updateData)
      .eq("id", existingContact.id);
    contact = existingContact;
  } else {
    // Also try to find by phone number (in case wa_id changed)
    if (phoneNumber && !phoneNumber.includes('@lid')) {
      const { data: contactByPhone } = await supabase
        .from("contacts")
        .select("id, unread_count, name, profile_pic_synced_at")
        .eq("instance_id", instance.id)
        .eq("phone_number", phoneNumber)
        .maybeSingle();
      
      if (contactByPhone) {
        // Update wa_id and name
        const updateData: any = { 
          wa_id: waId, 
          last_message_at: new Date().toISOString() 
        };
        if (contactName && (!contactByPhone.name || contactByPhone.name.endsWith('@lid'))) {
          updateData.name = contactName;
        }
        await supabase
          .from("contacts")
          .update(updateData)
          .eq("id", contactByPhone.id);
        contact = contactByPhone;
      }
    }
    
    if (!contact) {
      const { data: newContact, error: insertError } = await supabase
        .from("contacts")
        .insert({
          tenant_id: instance.tenant_id,
          instance_id: instance.id,
          wa_id: waId,
          phone_number: phoneNumber,
          name: contactName,
          last_message_at: new Date().toISOString(),
        })
        .select("id, unread_count, name, profile_pic_synced_at")
        .single();

      if (insertError) {
        console.error("Error inserting contact:", insertError);
        throw insertError;
      }
      contact = newContact;
      isNewContact = true; // Mark as new contact for auto messages

      // Insert into contact_thread_state for new WA contact
      try {
        await supabase.from("contact_thread_state").insert({
          tenant_id: instance.tenant_id,
          contact_id: newContact.id,
          contact_type: "whatsapp",
          instance_id: instance.id,
          contact_name: contactName,
          contact_phone: phoneNumber,
          last_message_at: new Date().toISOString(),
          last_message_direction: "inbound",
          unread_count: 1,
          total_messages: 1,
        });
      } catch (threadStateError) {
        console.log("contact_thread_state insert error:", threadStateError);
      }
    }
  }

  if (!contact) {
    throw new Error("Failed to get or create contact");
  }

  // Trigger profile picture fetch if never attempted (async, non-blocking)
  if (!contact.profile_pic_synced_at) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey) {
      fetch(`${supabaseUrl}/functions/v1/whatsapp-refresh-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ contact_id: contact.id }),
      }).catch((err) => console.error("Profile refresh trigger failed:", err));
    }
  }

  let contentType = "text";
  let content = "";
  let mediaUrl: string | null = null;
  let mediaMimeType = "";
  let mediaFilename: string | null = null;
  let locationLat: number | null = null;
  let locationLng: number | null = null;

  if (message.text?.body) {
    contentType = "text";
    content = message.text.body;
  } else if (message.image) {
    contentType = "image";
    content = message.image.caption || "";
    mediaMimeType = message.image.mime_type || "image/jpeg";
    // Use WasenderAPI to decrypt media
    if (rawMessagesData && rawMessagesData.message?.imageMessage) {
      mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "image", mediaMimeType);
    }
  } else if (message.video) {
    contentType = "video";
    content = message.video.caption || "";
    mediaMimeType = message.video.mime_type || "video/mp4";
    if (rawMessagesData && rawMessagesData.message?.videoMessage) {
      mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "video", mediaMimeType);
    }
  } else if (message.audio) {
    contentType = message.audio.ptt ? "voice" : "audio";
    mediaMimeType = message.audio.mime_type || "audio/ogg";
    if (rawMessagesData && rawMessagesData.message?.audioMessage) {
      mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "audio", mediaMimeType);
    }
  } else if (message.document) {
    contentType = "document";
    content = message.document.filename || "";
    mediaFilename = message.document.filename || null;
    mediaMimeType = message.document.mime_type || "application/octet-stream";
    if (rawMessagesData && rawMessagesData.message?.documentMessage) {
      mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "document", mediaMimeType);
    }
  } else if (message.sticker) {
    contentType = "sticker";
    mediaMimeType = message.sticker.mime_type || "image/webp";
    if (rawMessagesData && rawMessagesData.message?.stickerMessage) {
      mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "sticker", mediaMimeType);
    }
  } else if (message.location) {
    contentType = "location";
    content = message.location.name || message.location.address || "";
    locationLat = message.location.lat || null;
    locationLng = message.location.lng || null;
  }

  // Check for duplicates
  if (message.id) {
    const { data: existingMessage } = await supabase
      .from("messages")
      .select("id")
      .eq("wa_message_id", message.id)
      .maybeSingle();

    if (existingMessage) {
      console.log("Message already exists, skipping:", message.id);
      return;
    }
  }

  // Insert message
  const { error: messageError } = await supabase
    .from("messages")
    .insert({
      tenant_id: instance.tenant_id,
      instance_id: instance.id,
      contact_id: contact.id,
      wa_message_id: message.id || null,
      direction: "inbound",
      status: "delivered",
      content_type: contentType,
      content: content,
      media_url: mediaUrl,
      media_mime_type: mediaMimeType.split(";")[0].trim() || null,
      media_filename: mediaFilename,
      location_lat: locationLat,
      location_lng: locationLng,
      sent_at: message.timestamp || new Date().toISOString(),
    });

  if (messageError) {
    console.error("Error inserting message:", messageError);
    throw messageError;
  }

  // Update unread count on contact
  await supabase
    .from("contacts")
    .update({ 
      unread_count: (contact.unread_count || 0) + 1,
      last_message_at: new Date().toISOString()
    })
    .eq("id", contact.id);

  // Update contact_thread_state (optimized denormalized table)
  const textPreview = content ? content.substring(0, 100) : (contentType !== 'text' ? `[${contentType}]` : '');
  try {
    await supabase.rpc("update_thread_state_on_message", {
      p_contact_id: contact.id,
      p_last_message_at: message.timestamp || new Date().toISOString(),
      p_last_message_preview: textPreview,
      p_last_message_direction: "inbound",
      p_last_message_type: contentType,
      p_unread_delta: 1,
    });
  } catch (rpcError) {
    console.log("update_thread_state_on_message RPC error:", rpcError);
  }

  // Update daily stats
  try {
    await supabase.rpc("increment_daily_stats", {
      p_tenant_id: instance.tenant_id,
      p_direction: "inbound",
      p_channel: "whatsapp",
      p_is_new_conversation: isNewContact,
    });
  } catch (rpcError) {
    console.log("increment_daily_stats RPC error:", rpcError);
  }

  // Update usage counter
  try {
    await supabase.rpc("increment_usage_counter", {
      p_tenant_id: instance.tenant_id,
      p_field: "messages_received",
      p_amount: 1,
    });
  } catch (rpcError) {
    console.log("increment_usage_counter RPC error, skipping:", rpcError);
  }

  console.log("Message stored successfully:", message.id, "type:", contentType, "mediaUrl:", mediaUrl);

  // Execute legacy automation rules (pass isNewContact to control new_message trigger)
  await executeAutomationRules(supabase, instance, contact.id, content, isNewContact);

  // Trigger visual workflows
  await triggerWorkflows(supabase, instance, contact.id, content);

  // Trigger auto messages (welcome, away, follow-up scheduling)
  await triggerAutoMessages(supabase, instance, contact.id, isNewContact);
}

// Trigger visual workflows from workflow builder
async function triggerWorkflows(
  supabase: any,
  instance: { id: string; tenant_id: string },
  contactId: string,
  messageContent: string
) {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for workflow execution");
      return;
    }

    // Trigger for message_received
    const messageReceivedResponse = await fetch(
      `${supabaseUrl}/functions/v1/workflow-execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify({
          trigger_type: "message_received",
          tenant_id: instance.tenant_id,
          contact_id: contactId,
          data: {
            message_content: messageContent,
            instance_id: instance.id
          }
        })
      }
    );
    
    if (messageReceivedResponse.ok) {
      const result = await messageReceivedResponse.json();
      console.log("Workflow execution result (message_received):", JSON.stringify(result));
    } else {
      console.error("Workflow execution failed (message_received):", messageReceivedResponse.status);
    }

    // Also trigger keyword-based workflows if there's content
    if (messageContent && messageContent.trim()) {
      const keywordResponse = await fetch(
        `${supabaseUrl}/functions/v1/workflow-execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({
            trigger_type: "keyword",
            tenant_id: instance.tenant_id,
            contact_id: contactId,
            data: {
              message_content: messageContent,
              instance_id: instance.id,
              keyword: messageContent.trim().toLowerCase()
            }
          })
        }
      );
      
      if (keywordResponse.ok) {
        const keywordResult = await keywordResponse.json();
        console.log("Workflow execution result (keyword):", JSON.stringify(keywordResult));
      }
    }
  } catch (error) {
    console.error("Error triggering workflows:", error);
  }
}

// Trigger auto messages (welcome, away, follow-up scheduling)
async function triggerAutoMessages(
  supabase: any,
  instance: { id: string; tenant_id: string },
  contactId: string,
  isNewContact: boolean
) {
  try {
    // Fetch auto message settings for this tenant
    const { data: settings, error: settingsError } = await supabase
      .from("whatsapp_auto_messages")
      .select("*")
      .eq("tenant_id", instance.tenant_id)
      .maybeSingle();

    if (settingsError || !settings) {
      // No settings configured, skip
      return;
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for auto messages");
      return;
    }

    // 1. WELCOME MESSAGE (for new contacts only) - Always available
    // TRIPLE PROTECTION against duplicates:
    // 1) isNewContact flag from contact upsert
    // 2) Database check for existing welcome log
    // 3) 60-second dedup window check
    if (isNewContact && settings.welcome_enabled && settings.welcome_message) {
      // Check if welcome already sent to this contact
      const { data: existingWelcome } = await supabase
        .from('whatsapp_auto_message_log')
        .select('id')
        .eq('contact_id', contactId)
        .eq('message_type', 'welcome')
        .maybeSingle();

      if (existingWelcome) {
        console.log(`Welcome already sent to contact ${contactId}, skipping duplicate`);
      } else {
        // Also check for very recent welcome (within 60 seconds) to prevent race conditions
        const recentTime = new Date(Date.now() - 60000).toISOString();
        const { data: recentWelcome } = await supabase
          .from('whatsapp_auto_message_log')
          .select('id')
          .eq('contact_id', contactId)
          .eq('message_type', 'welcome')
          .gte('sent_at', recentTime)
          .maybeSingle();

        if (recentWelcome) {
          console.log(`Welcome sent very recently to contact ${contactId}, skipping duplicate`);
        } else {
          // Insert log FIRST to prevent race conditions, then send message
          const { error: logError } = await supabase
            .from('whatsapp_auto_message_log')
            .insert({
              tenant_id: instance.tenant_id,
              contact_id: contactId,
              message_type: 'welcome',
            });

          if (logError) {
            // If insert fails (likely duplicate), skip sending
            console.log(`Welcome log insert failed (likely duplicate), skipping: ${logError.message}`);
          } else {
            console.log("Sending welcome message to new contact:", contactId);
            await sendAutoMessage(supabase, instance, contactId, "welcome", settings, supabaseUrl, serviceRoleKey);
          }
        }
      }
    }

    // 2. AWAY MESSAGE (if no team member is online)
    if (settings.away_enabled && settings.away_message) {
      // Check if any team member is online (last_seen within 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { count, error: presenceError } = await supabase
        .from("user_presence")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", instance.tenant_id)
        .eq("status", "online")
        .gte("last_seen_at", twoMinutesAgo);

      if (!presenceError && count === 0) {
        // No one online - check cooldown
        const cooldownHours = settings.away_cooldown_hours || 24;
        const cooldownTime = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

        const { data: recentAway, error: logError } = await supabase
          .from("whatsapp_auto_message_log")
          .select("id")
          .eq("contact_id", contactId)
          .eq("message_type", "away")
          .gte("sent_at", cooldownTime)
          .maybeSingle();

        if (!logError && !recentAway) {
          console.log("Sending away message to contact:", contactId);
          await sendAutoMessage(supabase, instance, contactId, "away", settings, supabaseUrl, serviceRoleKey);
        }
      }
    }

    // 3. SCHEDULE FOLLOW-UP (if enabled, Pro plan, AND globally enabled by admin)
    if (settings.followup_enabled && settings.followup_message) {
      // Check if follow-up system is globally enabled
      const { data: globalFollowupSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "whatsapp_followup_enabled")
        .maybeSingle();

      const isFollowupGloballyEnabled = globalFollowupSetting?.value?.value === true;
      
      if (!isFollowupGloballyEnabled) {
        console.log("Follow-up system is globally disabled by admin");
      } else {
        // Check if tenant has Pro plan
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan:plans(name, features)")
          .eq("tenant_id", instance.tenant_id)
          .eq("status", "active")
          .maybeSingle();

        const planFeatures = subscription?.plan?.features || {};
        const hasFollowupAccess = planFeatures.followup_messages_enabled === true;

        if (hasFollowupAccess) {
          // Cancel any existing pending follow-up for this contact
          await supabase
            .from("whatsapp_followup_queue")
            .update({ status: "cancelled", skip_reason: "new_message" })
            .eq("contact_id", contactId)
            .eq("status", "pending");

          // Schedule new follow-up
          const delayHours = settings.followup_delay_hours || 6;
          const scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

          await supabase
            .from("whatsapp_followup_queue")
            .insert({
              tenant_id: instance.tenant_id,
              contact_id: contactId,
              instance_id: instance.id,
              scheduled_for: scheduledFor,
              status: "pending",
            });

          console.log("Scheduled follow-up message for:", contactId, "at:", scheduledFor);
        }
      }
    }
  } catch (error) {
    console.error("Error triggering auto messages:", error);
  }
}

// Helper: Sleep for ms
function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Send an automated message (welcome, away, or follow-up)
async function sendAutoMessage(
  supabase: any,
  instance: { id: string; tenant_id: string },
  contactId: string,
  messageType: "welcome" | "away" | "followup",
  settings: any,
  supabaseUrl: string,
  serviceRoleKey: string
) {
  try {
    const messageField = `${messageType}_message`;
    const mediaField = `${messageType}_media_items`;

    const message = settings[messageField];
    const mediaItems = settings[mediaField] || [];

    console.log(`[sendAutoMessage] Starting ${messageType} for contact ${contactId}, hasText: ${!!message}, mediaItems: ${mediaItems.length}`);

    let sentAnyMessage = false;

    // Send text message first (if any)
    if (message) {
      console.log(`[sendAutoMessage] Sending ${messageType} text message...`);
      const response = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          contact_id: contactId,
          instance_id: instance.id,
          content: message,
          content_type: "text",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[sendAutoMessage] Failed to send ${messageType} text message:`, response.status, errorText);
      } else {
        console.log(`[sendAutoMessage] ${messageType} text message sent successfully`);
        sentAnyMessage = true;
      }
    }

    // Send media items with delay between messages to avoid rate limiting
    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      
      // Wait 6 seconds before sending next message to avoid Wasender's rate limit
      // (Wasender has "account protection" limiting to 1 message per 5 seconds)
      if (sentAnyMessage || i > 0) {
        console.log(`[sendAutoMessage] Waiting 6 seconds before sending media ${i + 1}/${mediaItems.length}...`);
        await sleepMs(6000);
      }

      console.log(`[sendAutoMessage] Sending ${messageType} media ${i + 1}/${mediaItems.length}: type=${item.type}, url=${item.url?.substring(0, 50)}...`);
      
      // Map voice/ptt to audio for content_type
      const contentType = (item.type === 'voice' || item.type === 'ptt') ? 'audio' : item.type;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          contact_id: contactId,
          instance_id: instance.id,
          content: item.caption || "",
          content_type: contentType,
          media_url: item.url,
          media_filename: item.filename,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[sendAutoMessage] Failed to send ${messageType} media ${i + 1}:`, response.status, errorText);
      } else {
        console.log(`[sendAutoMessage] ${messageType} media ${i + 1} sent successfully`);
        sentAnyMessage = true;
      }
    }

    // Log the auto message (skip for welcome - already logged before sending to prevent race conditions)
    if (messageType !== 'welcome') {
      await supabase
        .from("whatsapp_auto_message_log")
        .insert({
          tenant_id: instance.tenant_id,
          contact_id: contactId,
          message_type: messageType,
        });
    }

    console.log(`[sendAutoMessage] Auto message complete: ${messageType} to contact ${contactId}`);
  } catch (error) {
    console.error(`[sendAutoMessage] Error sending ${messageType} message:`, error);
  }
}

// Handle outbound messages sent from phone/WhatsApp Web
async function handleOutboundSync(
  supabase: any,
  instance: { id: string; tenant_id: string },
  message: WasenderMessage & { phone?: string },
  rawMessagesData?: WasenderMessagesData
) {
  // Extract recipient from remoteJid (the contact's WhatsApp ID)
  const recipientWaId = rawMessagesData?.key?.remoteJid || message.to || "";
  
   // Handle group messages separately
  if (recipientWaId.endsWith("@g.us")) {
     console.log("Processing group message:", recipientWaId);
     await handleGroupMessage(supabase, instance, message, rawMessagesData, recipientWaId);
    return;
  }
  
  // Handle LID mode - strip all suffixes to get phone number
  const isLidMode = recipientWaId.endsWith('@lid');
  let phoneNumber: string;
  
  if (isLidMode) {
    // For outbound LID mode: try message.phone, then strip all suffixes
    // Note: outbound messages don't have cleanedSenderPn, so we rely on message.phone or fallback
    phoneNumber = message.phone || 
                  message.to?.replace(/@.*$/, "") || 
                  recipientWaId.replace("@lid", ""); // Fallback - will be numeric LID
    console.log("Outbound LID mode detected - recipientWaId:", recipientWaId, "extracted phone:", phoneNumber);
  } else {
    phoneNumber = recipientWaId.replace("@s.whatsapp.net", "").replace("@c.us", "");
  }
  
  if (!phoneNumber) {
    console.log("No phone number found for outbound sync");
    return;
  }

  const waMessageId = rawMessagesData?.key?.id || message.id;

  // Check for duplicate by wa_message_id first
  if (waMessageId) {
    const { data: existingByWaId } = await supabase
      .from("messages")
      .select("id")
      .eq("wa_message_id", waMessageId)
      .maybeSingle();

    if (existingByWaId) {
      console.log("Outbound message already exists by wa_message_id, skipping:", waMessageId);
      return;
    }
  }

  // Parse message content
  let contentType = "text";
  let content = "";
  let mediaMimeType = "";
  let mediaFilename: string | null = null;
  let locationLat: number | null = null;
  let locationLng: number | null = null;

  if (message.text?.body) {
    contentType = "text";
    content = message.text.body;
  } else if (message.image) {
    contentType = "image";
    content = message.image.caption || "";
    mediaMimeType = message.image.mime_type || "image/jpeg";
  } else if (message.video) {
    contentType = "video";
    content = message.video.caption || "";
    mediaMimeType = message.video.mime_type || "video/mp4";
  } else if (message.audio) {
    contentType = message.audio.ptt ? "voice" : "audio";
    mediaMimeType = message.audio.mime_type || "audio/ogg";
  } else if (message.document) {
    contentType = "document";
    content = message.document.filename || "";
    mediaFilename = message.document.filename || null;
    mediaMimeType = message.document.mime_type || "application/octet-stream";
  } else if (message.sticker) {
    contentType = "sticker";
    mediaMimeType = message.sticker.mime_type || "image/webp";
  } else if (message.location) {
    contentType = "location";
    content = message.location.name || message.location.address || "";
    locationLat = message.location.lat || null;
    locationLng = message.location.lng || null;
  }

  // Find or create contact - Enhanced logic to handle LID/phone mismatches
  let contact: { id: string; phone_number?: string } | null = null;
  
  // Step 1: Try to find contact by exact wa_id match
  const { data: existingContact } = await supabase
    .from("contacts")
    .select("id, phone_number")
    .eq("instance_id", instance.id)
    .eq("wa_id", recipientWaId)
    .maybeSingle();

  if (existingContact) {
    contact = existingContact;
    console.log("Found contact by wa_id:", recipientWaId);
  } else {
    // Step 2: Try to find by phone_number (handles wa_id format changes like @lid vs @s.whatsapp.net)
    const { data: contactByPhone } = await supabase
      .from("contacts")
      .select("id, wa_id, phone_number")
      .eq("instance_id", instance.id)
      .eq("phone_number", phoneNumber)
      .maybeSingle();
    
    if (contactByPhone) {
      contact = contactByPhone;
      console.log("Found contact by phone_number:", phoneNumber, "updating wa_id from", contactByPhone.wa_id, "to", recipientWaId);
      // Update the wa_id to current format
      await supabase
        .from("contacts")
        .update({ wa_id: recipientWaId })
        .eq("id", contactByPhone.id);
    } else if (isLidMode) {
      // Step 3: For LID mode, also try to find contacts where phone looks like a real phone (not LID format)
      // This handles the case where contact was created via inbound with real phone
      const { data: contactByLidSearch } = await supabase
        .from("contacts")
        .select("id, wa_id, phone_number")
        .eq("instance_id", instance.id)
        .or(`wa_id.eq.${recipientWaId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (contactByLidSearch) {
        contact = contactByLidSearch;
        console.log("Found contact by LID search:", contactByLidSearch.id);
        // Update wa_id if different
        if (contactByLidSearch.wa_id !== recipientWaId) {
          await supabase
            .from("contacts")
            .update({ wa_id: recipientWaId })
            .eq("id", contactByLidSearch.id);
        }
      }
    }
    
    // Step 4: Create new contact if not found
    if (!contact) {
      console.log("Creating new contact for outbound sync - wa_id:", recipientWaId, "phone:", phoneNumber);
      const { data: newContact, error: insertError } = await supabase
        .from("contacts")
        .insert({
          tenant_id: instance.tenant_id,
          instance_id: instance.id,
          wa_id: recipientWaId,
          phone_number: phoneNumber,
          name: null,
          last_message_at: new Date().toISOString(),
        })
        .select("id, phone_number")
        .single();

      if (insertError) {
        console.error("Error creating contact for outbound sync:", insertError);
        return;
      }
      contact = newContact;
    }
  }

  if (!contact) {
    console.error("Failed to get or create contact for outbound sync");
    return;
  }

  // CRITICAL: Enhanced duplicate detection - check by phone_number across all related contacts
  // This handles wa_id format mismatches between CRM-sent messages and webhook events
  const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
  
  // Find all contact IDs with the same phone number in this instance
  const { data: relatedContacts } = await supabase
    .from("contacts")
    .select("id")
    .eq("instance_id", instance.id)
    .eq("phone_number", phoneNumber);
  
  const contactIds = relatedContacts?.map((c: { id: string }) => c.id) || [contact.id];
  console.log("Checking for duplicates across contacts:", contactIds, "for phone:", phoneNumber);
  
  // Build query for recent duplicate check - search across all related contacts
  let duplicateQuery = supabase
    .from("messages")
    .select("id, wa_message_id, contact_id")
    .in("contact_id", contactIds)
    .eq("direction", "outbound")
    .eq("content_type", contentType)
    .in("status", ["pending", "sent", "delivered"])
    // CRM-sent messages typically have is_synced_from_device = false (not null)
    // We only want to exclude messages that are *already* marked as device-synced.
    .or("is_synced_from_device.is.null,is_synced_from_device.eq.false")
    .gte("created_at", thirtySecondsAgo)
    .order("created_at", { ascending: false })
    .limit(5);

  // For text messages, also match content
  if (contentType === "text" && content) {
    duplicateQuery = duplicateQuery.eq("content", content);
  }

  const { data: recentDuplicates } = await duplicateQuery;

  if (recentDuplicates && recentDuplicates.length > 0) {
    const recentDuplicate = recentDuplicates[0];
    // Found a recent message from CRM - update it with wa_message_id instead of creating duplicate
    console.log("Found recent CRM message (cross-contact search), updating wa_message_id instead of creating duplicate:", recentDuplicate.id);
    
    if (waMessageId && !recentDuplicate.wa_message_id) {
      await supabase
        .from("messages")
        .update({ 
          wa_message_id: waMessageId,
          status: "sent",
          sent_at: message.timestamp || new Date().toISOString()
        })
        .eq("id", recentDuplicate.id);
    }
    return;
  }

  // No duplicate found - this is truly a message sent from phone/WhatsApp Web
  // Decrypt and store media if needed
  let mediaUrl: string | null = null;

  if (message.image && rawMessagesData?.message?.imageMessage) {
    mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "image", mediaMimeType);
  } else if (message.video && rawMessagesData?.message?.videoMessage) {
    mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "video", mediaMimeType);
  } else if (message.audio && rawMessagesData?.message?.audioMessage) {
    mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "audio", mediaMimeType);
  } else if (message.document && rawMessagesData?.message?.documentMessage) {
    mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "document", mediaMimeType);
  } else if (message.sticker && rawMessagesData?.message?.stickerMessage) {
    mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "sticker", mediaMimeType);
  }

  // Insert as outbound message (already sent from device)
  const { error: messageError } = await supabase
    .from("messages")
    .insert({
      tenant_id: instance.tenant_id,
      instance_id: instance.id,
      contact_id: contact.id,
      wa_message_id: waMessageId || null,
      direction: "outbound",
      status: "sent", // Already sent from device
      content_type: contentType,
      content: content,
      media_url: mediaUrl,
      media_mime_type: mediaMimeType.split(";")[0].trim() || null,
      media_filename: mediaFilename,
      location_lat: locationLat,
      location_lng: locationLng,
      sent_at: message.timestamp || new Date().toISOString(),
      is_synced_from_device: true, // Mark as synced from device
    });

  if (messageError) {
    console.error("Error inserting synced outbound message:", messageError);
    return;
  }

  // Update contact's last_message_at
  await supabase
    .from("contacts")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", contact.id);


  // Update usage counter for messages sent
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  await supabase
    .from("usage_counters")
    .upsert(
      {
        tenant_id: instance.tenant_id,
        period_start: periodStart,
        period_end: periodEnd,
        messages_sent: 1,
      },
      { onConflict: "tenant_id,period_start" }
    );

  try {
    await supabase.rpc("increment_usage_counter", {
      p_tenant_id: instance.tenant_id,
      p_field: "messages_sent",
      p_amount: 1,
    });
  } catch (rpcError) {
    console.log("increment_usage_counter RPC error, skipping:", rpcError);
  }

  console.log("Outbound message synced from device:", waMessageId, "type:", contentType, "to:", phoneNumber, "isLidMode:", isLidMode);
}

async function executeAutomationRules(
  supabase: any,
  instance: { id: string; tenant_id: string },
  contactId: string,
  messageContent: string,
  isNewContact: boolean = false
) {
  try {
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("tenant_id", instance.tenant_id)
      .maybeSingle();

    if (subscription?.status === "suspended") {
      console.log("Subscription suspended, skipping automation");
      return;
    }

    const { data: rules, error: rulesError } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("tenant_id", instance.tenant_id)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (rulesError || !rules || rules.length === 0) {
      return;
    }

    for (const rule of rules) {
      // For "new_message" trigger type, only execute on FIRST contact (new contact)
      // This prevents welcome/auto-reply from being sent on every single message
      const shouldExecute = checkTrigger(rule, messageContent, isNewContact);
      
      if (shouldExecute) {
        // EXTRA SAFETY: For new_message/first_contact triggers, also check the database
        // to ensure we haven't already sent a welcome message to this contact
        if (rule.trigger_type === 'new_message' || rule.trigger_type === 'first_contact') {
          const { data: existingWelcome } = await supabase
            .from('whatsapp_auto_message_log')
            .select('id')
            .eq('contact_id', contactId)
            .eq('message_type', 'welcome')
            .maybeSingle();
          
          if (existingWelcome) {
            console.log(`Welcome already sent to contact ${contactId}, skipping automation rule: ${rule.name}`);
            continue;
          }
          
          // Also check if we've already sent this exact auto-reply to prevent duplicates
          const { data: recentAutoReply } = await supabase
            .from('messages')
            .select('id')
            .eq('contact_id', contactId)
            .eq('content', rule.action_config?.reply_message || '')
            .eq('is_from_ai', true)
            .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 1 minute
            .maybeSingle();
          
          if (recentAutoReply) {
            console.log(`Auto-reply already sent recently to contact ${contactId}, skipping rule: ${rule.name}`);
            continue;
          }
        }
        
        console.log(`Executing automation rule: ${rule.name} for contact ${contactId}`);
        await executeAction(supabase, instance, contactId, rule);
        
        // Log the automation execution for new_message triggers
        if (rule.trigger_type === 'new_message' || rule.trigger_type === 'first_contact') {
          await supabase
            .from('whatsapp_auto_message_log')
            .insert({
              tenant_id: instance.tenant_id,
              contact_id: contactId,
              message_type: 'welcome', // Log as welcome for dedup purposes
            });
        }
        
        break;
      }
    }
  } catch (error) {
    console.error("Error executing automation rules:", error);
  }
}

function checkTrigger(rule: any, messageContent: string, isNewContact: boolean = false): boolean {
  switch (rule.trigger_type) {
    case "new_message":
      // "new_message" trigger should ONLY fire for brand new contacts (first-time messaging)
      // This prevents welcome/auto-reply from being sent on every single incoming message
      return isNewContact;
    
    case "first_contact":
      // Explicit alias for clarity - only on first contact
      return isNewContact;
    
    case "keyword_match":
      const keywords = rule.trigger_config?.keywords || [];
      const matchType = rule.trigger_config?.match_type || "contains";
      const caseSensitive = rule.trigger_config?.case_sensitive || false;
      
      const content = caseSensitive ? messageContent : messageContent.toLowerCase();
      
      for (const keyword of keywords) {
        const kw = caseSensitive ? keyword : keyword.toLowerCase();
        
        switch (matchType) {
          case "exact":
            if (content === kw) return true;
            break;
          case "starts_with":
            if (content.startsWith(kw)) return true;
            break;
          case "contains":
          default:
            if (content.includes(kw)) return true;
            break;
        }
      }
      return false;
    
    case "any_message":
      // New trigger type: fires on EVERY message (use with caution)
      return true;
    
    default:
      return false;
  }
}

async function executeAction(
  supabase: any,
  instance: { id: string; tenant_id: string },
  contactId: string,
  rule: any
) {
  switch (rule.action_type) {
    case "auto_reply":
      const replyMessage = rule.action_config?.reply_message;
      if (replyMessage) {
        const { data: newMessage, error: insertError } = await supabase
          .from("messages")
          .insert({
            tenant_id: instance.tenant_id,
            instance_id: instance.id,
            contact_id: contactId,
            direction: "outbound",
            status: "pending",
            content_type: "text",
            content: replyMessage,
            is_from_ai: true,
          })
          .select("id")
          .single();

        if (!insertError && newMessage) {
          console.log("Auto-reply created:", newMessage.id);
          
          try {
            const sendMessageUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-message`;
            const response = await fetch(sendMessageUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ message_id: newMessage.id }),
            });
            
            const result = await response.json();
            console.log("Send message result:", JSON.stringify(result));
          } catch (sendError) {
            console.error("Error calling send-message:", sendError);
          }
        } else {
          console.error("Error creating auto-reply:", insertError);
        }
      }
      break;
    
    case "assign_agent":
      const agentId = rule.action_config?.agent_id;
      if (agentId) {
        await supabase
          .from("contacts")
          .update({ assigned_to: agentId })
          .eq("id", contactId);
        console.log("Contact assigned to agent:", agentId);
      }
      break;
    
    default:
      console.log("Unknown action type:", rule.action_type);
  }
}

async function handleStatusUpdate(supabase: any, status: { id?: string; status?: string; timestamp?: string }) {
  if (!status.id) return;

  const statusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };

  const newStatus = statusMap[status.status || ""] || status.status;

  const updateData: any = { status: newStatus };
  
  if (newStatus === "delivered") {
    const ts = Number(status.timestamp);
    updateData.delivered_at = ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString();
  } else if (newStatus === "read") {
    const ts = Number(status.timestamp);
    updateData.read_at = ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString();
  }

  const { error } = await supabase
    .from("messages")
    .update(updateData)
    .eq("wa_message_id", status.id);

  if (error) {
    console.error("Error updating message status:", error);
  }
}

// Handle read receipts - when user reads inbound messages on their phone/WhatsApp Web
async function handleReadReceipt(
  supabase: any,
  instance: { id: string; tenant_id: string },
  payload: WebhookPayload
) {
  try {
    // Extract the keys array from the payload - contains message IDs that were read
    const keys = payload.data?.keys || (payload.data?.key ? [payload.data.key] : []);
    
    if (keys.length === 0) {
      console.log("No keys found in read receipt payload");
      return;
    }

    console.log("Processing read receipt for", keys.length, "messages");

    for (const key of keys) {
      const remoteJid = key.remoteJid;
      const fromMe = key.fromMe;
      
      if (!remoteJid) continue;
      
      // Skip group chats
      if (remoteJid.endsWith("@g.us")) continue;
      
      // We care about read receipts for inbound messages (fromMe: false)
      // This means the user read a message FROM the customer on their phone
      if (fromMe === false || fromMe === undefined) {
        const waId = remoteJid;
        
        // Find the contact by wa_id
        const { data: contact, error: contactError } = await supabase
          .from("contacts")
          .select("id, unread_count")
          .eq("instance_id", instance.id)
          .eq("wa_id", waId)
          .maybeSingle();
        
        if (contactError) {
          console.error("Error finding contact for read receipt:", contactError);
          continue;
        }
        
        if (contact && contact.unread_count > 0) {
          // Mark all messages from this contact as read
          const { error: updateError } = await supabase
            .from("messages")
            .update({ 
              status: "read",
              read_at: new Date().toISOString()
            })
            .eq("contact_id", contact.id)
            .eq("direction", "inbound")
            .in("status", ["delivered", "sent"]);
          
          if (updateError) {
            console.error("Error updating messages as read:", updateError);
          }
          
          // Reset unread count for the contact
          const { error: contactUpdateError } = await supabase
            .from("contacts")
            .update({ unread_count: 0 })
            .eq("id", contact.id);
          
          if (contactUpdateError) {
            console.error("Error resetting unread count:", contactUpdateError);
          } else {
            console.log("Read receipt synced: Reset unread count for contact:", contact.id, "wa_id:", waId);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error handling read receipt:", error);
  }
}

// Handle typing presence - when user types on phone/WhatsApp Web to a contact
async function handleTypingPresence(
  supabase: any,
  instance: { id: string; tenant_id: string },
  payload: WebhookPayload
) {
  try {
    const presence = payload.presence;
    if (!presence) {
      console.log("No presence data in payload");
      return;
    }

    const remoteJid = presence.id;
    const presenceType = presence.type || presence.lastKnownPresence;
    
    if (!remoteJid) {
      console.log("No remoteJid in presence payload");
      return;
    }

    // Skip group chats
    if (remoteJid.endsWith("@g.us")) return;

    const waId = remoteJid;

    // Find the contact
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id")
      .eq("instance_id", instance.id)
      .eq("wa_id", waId)
      .maybeSingle();

    if (contactError) {
      console.error("Error finding contact for typing:", contactError);
      return;
    }

    if (!contact) {
      console.log("Contact not found for typing indicator:", waId);
      return;
    }

    // Update the contact's device_typing_at based on presence type
    if (presenceType === "composing") {
      // User is typing
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ device_typing_at: new Date().toISOString() })
        .eq("id", contact.id);

      if (updateError) {
        console.error("Error updating typing status:", updateError);
      } else {
        console.log("Typing indicator synced: User is typing to contact:", contact.id);
      }
    } else if (presenceType === "paused" || presenceType === "available" || presenceType === "unavailable") {
      // User stopped typing
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ device_typing_at: null })
        .eq("id", contact.id);

      if (updateError) {
        console.error("Error clearing typing status:", updateError);
      } else {
        console.log("Typing indicator cleared for contact:", contact.id);
      }
    }
  } catch (error) {
    console.error("Error handling typing presence:", error);
  }
}

const MIN_QR_NOTIFICATION_INTERVAL = 2 * 60 * 1000;

async function handleQRCodeUpdate(
  supabase: any,
  instance: { id: string; tenant_id: string },
  qrcode?: { qr?: string; qrcode?: string; expires_at?: string },
  payload?: WebhookPayload
) {
  // Try multiple sources for QR code - handle payload.data.qr fallback
  const qrCode = qrcode?.qr || qrcode?.qrcode || payload?.data?.qr || payload?.data?.qrcode;
  
  if (!qrCode) {
    console.log("No QR code found in payload");
    return;
  }
  
  const expiresAt = qrcode?.expires_at || new Date(Date.now() + 60000).toISOString();

  const { data: currentInstance } = await supabase
    .from("whatsapp_instances")
    .select("last_qr_sent_at")
    .eq("id", instance.id)
    .single();

  await supabase
    .from("whatsapp_instances")
    .update({
      qr_code: qrCode,
      qr_expires_at: expiresAt,
      status: "disconnected",
      last_status_at: new Date().toISOString()
    })
    .eq("id", instance.id);

  await supabase
    .from("onboarding_jobs")
    .update({ status: "awaiting_scan", step: "qr_updated" })
    .eq("instance_id", instance.id)
    .in("status", ["connecting", "awaiting_scan"]);

  const lastSent = currentInstance?.last_qr_sent_at 
    ? new Date(currentInstance.last_qr_sent_at).getTime() 
    : 0;
  
  if (Date.now() - lastSent >= MIN_QR_NOTIFICATION_INTERVAL) {
    await supabase
      .from("notifications")
      .insert({
        tenant_id: instance.tenant_id,
        instance_id: instance.id,
        type: "qr_updated",
        channel: "in_app",
        status: "sent",
        sent_at: new Date().toISOString()
      });

    await supabase
      .from("whatsapp_instances")
      .update({ last_qr_sent_at: new Date().toISOString() })
      .eq("id", instance.id);
  }

  console.log("QR code updated for instance:", instance.id);
}

async function handleSessionStatus(
  supabase: any,
  instance: { id: string; tenant_id: string },
  session?: { status?: string; phone?: string; device_info?: Record<string, unknown> },
  payload?: WebhookPayload
) {
  // Try multiple sources for status - handle payload.data.status fallback
  // Note: payload.data.status can be a number for message status updates, so only use string values here
  const rawStatus = session?.status || 
    (typeof payload?.data?.status === 'string' ? payload.data.status : undefined) ||
    payload?.session?.status;
  const status = rawStatus?.toLowerCase();
  
  if (!status) {
    console.log("No status found in session payload");
    return;
  }
  
  console.log("Session status update:", status);

  if (status === "connected" || status === "ready" || status === "logged_in" || status === "open") {
    await supabase
      .from("whatsapp_instances")
      .update({
        status: "active",
        phone_number: session?.phone || null,
        device_info: session?.device_info || null,
        connection_error: null,
        last_connected_at: new Date().toISOString(),
        last_status_at: new Date().toISOString(),
        qr_code: null,
        qr_expires_at: null
      })
      .eq("id", instance.id);

    await supabase
      .from("onboarding_jobs")
      .update({ status: "connected", step: "completed" })
      .eq("instance_id", instance.id)
      .in("status", ["awaiting_scan", "connecting"]);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl && supabaseServiceKey) {
      await fetch(`${supabaseUrl}/functions/v1/send-telegram-notification`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tenant_id: instance.tenant_id,
          instance_id: instance.id,
          type: "connected"
        })
      });
    }

    console.log("Instance connected:", instance.id);

  } else if (status === "disconnected" || status === "logged_out" || status === "expired" || status === "close") {
    // Fetch instance name and tenant name for notifications
    const { data: instanceData } = await supabase
      .from("whatsapp_instances")
      .select("name, tenant_id")
      .eq("id", instance.id)
      .single();
    
    const instanceName = instanceData?.name || "Your instance";
    
    // Fetch tenant name for admin notification
    const { data: tenantData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", instance.tenant_id)
      .single();
    
    const tenantName = tenantData?.name || "Unknown Tenant";

    await supabase
      .from("whatsapp_instances")
      .update({
        status: "disconnected",
        connection_error: `Session ${status}`,
        last_status_at: new Date().toISOString()
      })
      .eq("id", instance.id);

    const supabaseUrl2 = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (supabaseUrl2 && supabaseServiceKey2) {
      // Create actionable in-app notification for TENANT with reconnect metadata
      await supabase.from("in_app_notifications").insert({
        tenant_id: instance.tenant_id,
        type: "instance_disconnected",
        title: "WhatsApp Disconnected - Action Required",
        message: `${instanceName} has been disconnected. Click Reconnect to restore connection.`,
        entity_type: "instance",
        entity_id: instance.id,
        metadata: {
          instance_id: instance.id,
          instance_name: instanceName,
          action: "reconnect",
          auto_reconnect_triggered: true,
          disconnected_at: new Date().toISOString(),
          reason: status
        }
      });
      console.log("Created actionable disconnect notification for tenant instance:", instance.id);

      // Create ADMIN notification for disconnect monitoring
      await supabase.from("admin_notifications").insert({
        type: "instance_disconnected",
        title: `WhatsApp Disconnected: ${instanceName}`,
        message: `${tenantName}'s instance "${instanceName}" went ${status}`,
        tenant_id: instance.tenant_id,
        entity_type: "instance",
        entity_id: instance.id,
        metadata: {
          instance_id: instance.id,
          instance_name: instanceName,
          tenant_name: tenantName,
          status: status,
          disconnected_at: new Date().toISOString()
        }
      });
      console.log("Created admin disconnect notification for instance:", instance.id);

      // Send Telegram notification
      await fetch(`${supabaseUrl2}/functions/v1/send-telegram-notification`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey2}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tenant_id: instance.tenant_id,
          instance_id: instance.id,
          type: "disconnected"
        })
      });

      // Auto-reconnect attempt
      try {
        await fetch(`${supabaseUrl2}/functions/v1/wasender-connect-session`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey2}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ instance_id: instance.id })
        });
        console.log("Auto-reconnect triggered for instance:", instance.id);
      } catch (reconnectError) {
        console.error("Failed to trigger auto-reconnect:", reconnectError);
      }
    }

  } else if (status === "banned") {
    // Fetch instance name and tenant name for notifications
    const { data: bannedInstanceData } = await supabase
      .from("whatsapp_instances")
      .select("name")
      .eq("id", instance.id)
      .single();
    
    const bannedInstanceName = bannedInstanceData?.name || "Your instance";
    
    const { data: bannedTenantData } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", instance.tenant_id)
      .single();
    
    const bannedTenantName = bannedTenantData?.name || "Unknown Tenant";

    await supabase
      .from("whatsapp_instances")
      .update({
        status: "banned",
        connection_error: "Account banned by WhatsApp",
        last_status_at: new Date().toISOString()
      })
      .eq("id", instance.id);

    await supabase
      .from("onboarding_jobs")
      .update({ status: "failed", error_message: "Account banned by WhatsApp" })
      .eq("instance_id", instance.id);

    // Create tenant notification for banned account
    await supabase.from("in_app_notifications").insert({
      tenant_id: instance.tenant_id,
      type: "instance_disconnected",
      title: "WhatsApp Account Banned",
      message: `${bannedInstanceName} has been banned by WhatsApp. Please contact support.`,
      entity_type: "instance",
      entity_id: instance.id,
      metadata: {
        instance_id: instance.id,
        instance_name: bannedInstanceName,
        status: "banned"
      }
    });

    // Create ADMIN notification for banned account
    await supabase.from("admin_notifications").insert({
      type: "instance_banned",
      title: `WhatsApp BANNED: ${bannedInstanceName}`,
      message: `${bannedTenantName}'s instance "${bannedInstanceName}" was banned by WhatsApp`,
      tenant_id: instance.tenant_id,
      entity_type: "instance",
      entity_id: instance.id,
      metadata: {
        instance_id: instance.id,
        instance_name: bannedInstanceName,
        tenant_name: bannedTenantName,
        banned_at: new Date().toISOString()
      }
    });

    console.log("Instance banned:", instance.id);
  } else if (status === "need_scan" || status === "qr" || status === "connecting") {
    // Fetch instance name for notification
    const { data: instanceData } = await supabase
      .from("whatsapp_instances")
      .select("name")
      .eq("id", instance.id)
      .single();
    
    const instanceName = instanceData?.name || "Your instance";

    // Session needs QR scan - mark as disconnected but don't trigger reconnect
    await supabase
      .from("whatsapp_instances")
      .update({
        status: "disconnected",
        last_status_at: new Date().toISOString()
      })
      .eq("id", instance.id);

    // Create QR Ready notification
    await supabase.from("in_app_notifications").insert({
      tenant_id: instance.tenant_id,
      type: "instance_disconnected",
      title: "QR Code Ready - Scan Required",
      message: `${instanceName} needs QR code scanning. Go to Instances page to reconnect.`,
      entity_type: "instance",
      entity_id: instance.id,
      metadata: {
        instance_id: instance.id,
        instance_name: instanceName,
        action: "scan_qr",
        status: status
      }
    });
    
    console.log("Instance waiting for QR scan:", instance.id);
  }
 }
 
 // Handle group messages (both inbound and outbound sync)
 async function handleGroupMessage(
   supabase: any,
   instance: { id: string; tenant_id: string; phone_number?: string },
   message: WasenderMessage & { phone?: string },
   rawMessagesData: WasenderMessagesData | undefined,
   waGroupId: string
 ) {
   console.log("Processing group message for:", waGroupId);
   
   // Find the group in our database
   const { data: group, error: groupError } = await supabase
     .from("whatsapp_groups")
     .select("id, tenant_id, wa_group_id, name")
     .eq("instance_id", instance.id)
     .eq("wa_group_id", waGroupId)
     .maybeSingle();
   
   if (groupError || !group) {
     console.log("Group not found in database, skipping:", waGroupId);
     return;
   }
   
   const waMessageId = rawMessagesData?.key?.id || message.id;
   const isFromMe = rawMessagesData?.key?.fromMe === true;
   
   // Check for duplicates
   if (waMessageId) {
     const { data: existingMessage } = await supabase
       .from("messages")
       .select("id")
       .eq("wa_message_id", waMessageId)
       .maybeSingle();
     
     if (existingMessage) {
       console.log("Group message already exists, skipping:", waMessageId);
       return;
     }
   }
   
   // Parse message content
   let contentType = "text";
   let content = "";
   let mediaMimeType = "";
   let mediaFilename: string | null = null;
   let mediaUrl: string | null = null;
   
   if (message.text?.body) {
     contentType = "text";
     content = message.text.body;
   } else if (message.image) {
     contentType = "image";
     content = message.image.caption || "";
     mediaMimeType = message.image.mime_type || "image/jpeg";
     if (rawMessagesData?.message?.imageMessage) {
       mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "image", mediaMimeType);
     }
   } else if (message.video) {
     contentType = "video";
     content = message.video.caption || "";
     mediaMimeType = message.video.mime_type || "video/mp4";
     if (rawMessagesData?.message?.videoMessage) {
       mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "video", mediaMimeType);
     }
   } else if (message.audio) {
     contentType = message.audio.ptt ? "voice" : "audio";
     mediaMimeType = message.audio.mime_type || "audio/ogg";
     if (rawMessagesData?.message?.audioMessage) {
       mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "audio", mediaMimeType);
     }
   } else if (message.document) {
     contentType = "document";
     content = message.document.filename || "";
     mediaFilename = message.document.filename || null;
     mediaMimeType = message.document.mime_type || "application/octet-stream";
     if (rawMessagesData?.message?.documentMessage) {
       mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "document", mediaMimeType);
     }
   } else if (message.sticker) {
     contentType = "sticker";
     mediaMimeType = message.sticker.mime_type || "image/webp";
     if (rawMessagesData?.message?.stickerMessage) {
       mediaUrl = await decryptAndStoreMedia(supabase, instance.tenant_id, rawMessagesData, "sticker", mediaMimeType);
     }
   } else if (message.location) {
     contentType = "location";
     content = message.location.name || message.location.address || "";
   }
   
   // Get sender phone for inbound group messages
   let senderPhone: string | null = null;
   if (!isFromMe) {
     senderPhone = rawMessagesData?.key?.cleanedSenderPn || 
                   rawMessagesData?.key?.senderPn?.replace("@s.whatsapp.net", "") || 
                   message.phone || null;
   }
   
   // Insert message
   const { error: messageError } = await supabase
     .from("messages")
     .insert({
       tenant_id: instance.tenant_id,
       instance_id: instance.id,
       contact_id: null, // Group messages don't have a single contact
       wa_group_id: waGroupId,
       wa_message_id: waMessageId || null,
       direction: isFromMe ? "outbound" : "inbound",
       status: isFromMe ? "sent" : "delivered",
       content_type: contentType,
       content: content,
       media_url: mediaUrl,
       media_mime_type: mediaMimeType.split(";")[0].trim() || null,
       media_filename: mediaFilename,
       sender_phone: senderPhone,
       sent_at: message.timestamp || new Date().toISOString(),
       is_synced_from_device: isFromMe,
     });
   
   if (messageError) {
     console.error("Error inserting group message:", messageError);
     return;
   }
   
   // Update group's last message info
   const lastMessagePreview = content ? content.substring(0, 100) : 
     (contentType === "image" ? "📷 ছবি" : 
      contentType === "video" ? "🎥 ভিডিও" : 
      contentType === "audio" || contentType === "voice" ? "🎵 অডিও" :
      contentType === "document" ? "📄 ডকুমেন্ট" : "📩 মেসেজ");
   
   const updateData: any = {
     last_message_at: new Date().toISOString(),
     last_message_preview: lastMessagePreview,
   };
   
   // Increment unread count for inbound messages
   if (!isFromMe) {
     const { data: currentGroup } = await supabase
       .from("whatsapp_groups")
       .select("unread_count")
       .eq("id", group.id)
       .single();
     
     updateData.unread_count = (currentGroup?.unread_count || 0) + 1;
   }
   
   await supabase
     .from("whatsapp_groups")
     .update(updateData)
     .eq("id", group.id);
   
   console.log("Group message stored successfully:", waMessageId);
 }
