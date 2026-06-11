import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Wasender messaging API (docs use /api prefix)
// Ref: https://wasenderapi.com/api-docs/messages/send-text-message
const WASENDER_API_BASE = "https://www.wasenderapi.com/api";

// Retry configuration
const MAX_RETRY_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;
const DEFAULT_PROTECTION_WAIT_MS = 5500; // 5s + small buffer

interface SendMessageRequest {
  message_id?: string;
  contact_id?: string;
  instance_id?: string;
  content?: string;
  content_type?: string;
  media_url?: string;
  media_filename?: string;
  location_lat?: number;
  location_lng?: number;
  reply_to_id?: string;
  // Process pending messages for a tenant
  process_pending?: boolean;
  tenant_id?: string;
  // User ID of the sender (passed from frontend)
  sent_by_user_id?: string;
}

function safeJsonParse(text: string) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: text };
  }
}

// Helper: Sleep for ms
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: Parse protection wait time from Wasender error message
function parseProtectionWaitMs(errorText: string): number {
  // Matches "every 5 seconds", "1 message every 5 seconds", etc.
  const match = errorText.match(/every\s+(\d+)\s+second/i);
  if (match) {
    return parseInt(match[1], 10) * 1000 + 500; // Add small buffer
  }
  return DEFAULT_PROTECTION_WAIT_MS;
}

// Helper: Check if error is retryable
function isRetryableError(status: number, responseText: string, networkError?: string): boolean {
  // Rate limit / protection errors
  if (status === 429 || status === 408) return true;
  
  // Server errors
  if (status >= 500 && status < 600) return true;
  
  // Wasender account protection
  if (responseText.toLowerCase().includes("account protection enabled")) return true;
  if (responseText.toLowerCase().includes("1 message every")) return true;
  
  // Network errors
  if (networkError) {
    const netErr = networkError.toLowerCase();
    if (netErr.includes("connection reset") ||
        netErr.includes("timed out") ||
        netErr.includes("timeout") ||
        netErr.includes("econnreset") ||
        netErr.includes("tls") ||
        netErr.includes("socket") ||
        netErr.includes("network")) {
      return true;
    }
  }
  
  return false;
}

// Helper: Check if error is non-retryable (permanent failure)
function isNonRetryableError(status: number, responseText: string): boolean {
  const lowerText = responseText.toLowerCase();
  
  // Auth errors
  if (status === 401 || status === 403) return true;
  if (lowerText.includes("invalid token") || lowerText.includes("unauthorized")) return true;
  
  // Invalid data errors
  if (lowerText.includes("invalid phone") || lowerText.includes("missing phone")) return true;
  if (lowerText.includes("instance not connected")) return true;
  
  // Subscription/limit errors (won't change with retry)
  if (lowerText.includes("subscription suspended")) return true;
  if (lowerText.includes("message limit reached")) return true;
  
  return false;
}

// Calculate backoff with jitter
function calculateBackoff(attempt: number, isProtectionError: boolean, protectionWaitMs: number): number {
  if (isProtectionError) {
    // For protection errors, use the parsed wait time + small jitter
    return protectionWaitMs + Math.random() * 500;
  }
  // Exponential backoff: 1s, 2s, 4s, 8s... with jitter
  const exponentialWait = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 500;
  return Math.min(exponentialWait + jitter, 15000); // Cap at 15s
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: SendMessageRequest = await req.json();
    console.log("Send message request:", JSON.stringify(payload));

    // Extract user ID from auth header if available
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id || null;
      } catch (e) {
        // Ignore auth errors, user ID is optional
      }
    }

    // Mode 1: Process all pending messages for a tenant
    if (payload.process_pending && payload.tenant_id) {
      const result = await processPendingMessages(supabase, payload.tenant_id);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode 2: Send a specific message
    if (payload.message_id) {
      const result = await sendMessageById(supabase, payload.message_id);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode 3: Create and send a new message (OPTIMIZED)
    if (payload.contact_id && (payload.content || payload.media_url || payload.location_lat)) {
      const result = await createAndSendMessage(supabase, payload, userId);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request. Provide message_id, or contact_id + content/media_url, or process_pending + tenant_id" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Send message error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processPendingMessages(supabase: any, tenantId: string) {
  // Check subscription status
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (subscription?.status === "suspended") {
    return { success: false, error: "Subscription suspended", processed: 0 };
  }

  // Fetch pending outbound messages - limit reduced to avoid timeout with protection delays
  // Order by created_at ASC to process oldest first
  const { data: messages, error: fetchError } = await supabase
    .from("messages")
    .select(`
      id,
      instance_id,
      contact_id,
      content,
      content_type,
      media_url,
      media_filename,
      location_lat,
      location_lng,
      reply_to_id,
      contacts!inner (
        wa_id,
        phone_number
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("direction", "outbound")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10); // Reduced from 50 to account for protection delays

  if (fetchError) {
    console.error("Error fetching pending messages:", fetchError);
    return { success: false, error: fetchError.message, processed: 0 };
  }

  if (!messages || messages.length === 0) {
    return { success: true, processed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const message of messages) {
    try {
      const result = await sendMessage(supabase, message);
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error("Error processing message:", message.id, error);
      failed++;
    }
  }

  // Update usage counter (non-blocking)
  if (processed > 0) {
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    
    supabase.rpc("increment_usage_counter", {
      p_tenant_id: tenantId,
      p_period_start: periodStart,
      p_counter: "messages_sent",
      p_amount: processed,
    }).catch(() => {
      // RPC might not exist
    });
  }

  return { success: true, processed, failed };
}

async function sendMessageById(supabase: any, messageId: string) {
  // Fetch the message with contact info AND instance info (JOIN optimization)
  const { data: message, error: fetchError } = await supabase
    .from("messages")
    .select(`
      id,
      tenant_id,
      instance_id,
      contact_id,
      content,
      content_type,
      media_url,
      media_filename,
      location_lat,
      location_lng,
      reply_to_id,
      status,
      wa_message_id,
      contacts!inner (
        wa_id,
        phone_number
      ),
      instance:whatsapp_instances!instance_id (
        api_key_encrypted,
        session_id,
        status
      )
    `)
    .eq("id", messageId)
    .single();

  if (fetchError || !message) {
    return { success: false, error: "Message not found" };
  }

  // Allow retry if pending OR if failed but no wa_message_id (never actually sent)
  if (message.status !== "pending" && !(message.status === "failed" && !message.wa_message_id)) {
    return { success: false, error: "Message already processed" };
  }

  // Check subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("tenant_id", message.tenant_id)
    .maybeSingle();

  if (subscription?.status === "suspended") {
    return { success: false, error: "Subscription suspended" };
  }

  return sendMessage(supabase, message);
}

// OPTIMIZED: Parallel fetching of contact, subscription, and usage
async function createAndSendMessage(supabase: any, payload: SendMessageRequest, userId?: string | null) {
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

  // PARALLEL: Fetch contact with instance info + all subscriptions + all usage
  const [contactResult, subscriptionsResult, usageResult] = await Promise.all([
    // Fetch contact WITH instance info (join to avoid extra query later)
    supabase
      .from("contacts")
      .select(`
        id, tenant_id, instance_id, wa_id, phone_number,
        instance:whatsapp_instances!instance_id (
          api_key_encrypted,
          session_id,
          status
        )
      `)
      .eq("id", payload.contact_id)
      .single(),
    
    // Fetch all active subscriptions (filter after contact)
    supabase
      .from("subscriptions")
      .select("tenant_id, status, plan:plans(max_messages_per_month)"),
    
    // Fetch usage for this period (filter after contact)
    supabase
      .from("usage_counters")
      .select("tenant_id, messages_sent")
      .eq("period_start", periodStart)
  ]);

  const { data: contact, error: contactError } = contactResult;

  if (contactError || !contact) {
    return { success: false, error: "Contact not found" };
  }

  // Filter subscription for this tenant
  const subscription = subscriptionsResult.data?.find((s: any) => s.tenant_id === contact.tenant_id);

  if (subscription?.status === "suspended") {
    return { success: false, error: "Subscription suspended" };
  }

  // Check message limit from plan
  const maxMessages = (subscription?.plan as any)?.max_messages_per_month || 1000;
  
  // Filter usage for this tenant
  const usageData = usageResult.data?.find((u: any) => u.tenant_id === contact.tenant_id);
  const currentUsage = usageData?.messages_sent || 0;
  
  if (currentUsage >= maxMessages) {
    return {
      success: false,
      error: "Message limit reached",
      code: "MESSAGE_LIMIT_REACHED",
      current: currentUsage,
      max: maxMessages,
      upgrade_required: true
    };
  }

  // Check instance status - use contact's instance or fallback to any active instance
  let instance = contact.instance;

  // If contact has no instance or it's inactive, find any active instance for this tenant
  if (!instance || instance.status !== "active") {
    console.log("Contact has no active instance, looking for fallback...");
    const { data: activeInstance } = await supabase
      .from("whatsapp_instances")
      .select("id, api_key_encrypted, session_id, status")
      .eq("tenant_id", contact.tenant_id)
      .eq("status", "active")
      .eq("is_deleted", false)
      .order("is_default", { ascending: false }) // Prefer default instance
      .limit(1)
      .maybeSingle();

    if (activeInstance) {
      console.log("Using fallback instance:", activeInstance.id);
      instance = activeInstance;
    }
  }

  if (!instance || instance.status !== "active") {
    return { success: false, error: "No active instance available" };
  }

  // Create message record with sent_by_user_id
  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      tenant_id: contact.tenant_id,
      instance_id: payload.instance_id || contact.instance_id,
      contact_id: contact.id,
      direction: "outbound",
      status: "pending",
      content_type: payload.content_type || "text",
      content: payload.content || null,
      media_url: payload.media_url || null,
      media_filename: payload.media_filename || null,
      location_lat: payload.location_lat || null,
      location_lng: payload.location_lng || null,
      reply_to_id: payload.reply_to_id || null,
      sent_by_user_id: userId || null,
    })
    .select("id")
    .single();

  if (insertError || !message) {
    return { success: false, error: insertError?.message || "Failed to create message" };
  }

  // Build message object for sending (with all info we already have)
  const messageWithContact = {
    id: message.id,
    instance_id: payload.instance_id || contact.instance_id,
    contact_id: contact.id,
    content: payload.content || null,
    content_type: payload.content_type || "text",
    media_url: payload.media_url || null,
    media_filename: payload.media_filename || null,
    location_lat: payload.location_lat || null,
    location_lng: payload.location_lng || null,
    reply_to_id: payload.reply_to_id || null,
    contacts: {
      wa_id: contact.wa_id,
      phone_number: contact.phone_number,
    },
    instance: instance, // Already have instance info
  };

  return sendMessageOptimized(supabase, messageWithContact);
}

// OPTIMIZED: Uses pre-fetched instance, parallel reply lookup, protection-aware retry
async function sendMessageOptimized(supabase: any, message: any) {
  const phoneNumber = message.contacts?.phone_number || message.contacts?.wa_id?.replace(/@.*$/, "");
  
  if (!phoneNumber) {
    updateMessageStatusNonBlocking(supabase, message.id, "failed", "No phone number");
    return { success: false, error: "No phone number" };
  }

  // Instance info already available from join
  const instance = message.instance;
  if (!instance) {
    updateMessageStatusNonBlocking(supabase, message.id, "failed", "Instance not found");
    return { success: false, error: "Instance not found" };
  }

  if (instance.status !== "active") {
    updateMessageStatusNonBlocking(supabase, message.id, "failed", "Instance not connected");
    return { success: false, error: "Instance not connected" };
  }

  const apiKey = instance.api_key_encrypted;

  // Start reply lookup in parallel while building body
  const replyPromise = message.reply_to_id
    ? supabase.from("messages").select("wa_message_id").eq("id", message.reply_to_id).maybeSingle()
    : Promise.resolve({ data: null });

  // Build WasenderAPI request body
  const endpoint = `${WASENDER_API_BASE}/send-message`;
  let body: any = { to: phoneNumber };

  switch (message.content_type) {
    case "image":
      body.imageUrl = message.media_url;
      if (message.content) body.text = message.content;
      break;
    case "video":
      body.videoUrl = message.media_url;
      if (message.content) body.text = message.content;
      break;
    case "audio":
    case "voice":
    case "ptt":
      body.audioUrl = message.media_url;
      break;
    case "document":
      body.documentUrl = message.media_url;
      if (message.media_filename) body.fileName = message.media_filename;
      break;
    case "sticker":
      body.stickerUrl = message.media_url;
      break;
    case "location":
      body.latitude = message.location_lat;
      body.longitude = message.location_lng;
      if (message.content) body.text = message.content;
      break;
    case "text":
    default:
      body.text = message.content || "";
      break;
  }

  // Now await reply lookup result
  const { data: replied } = await replyPromise;
  if (replied?.wa_message_id) {
    body.replyTo = replied.wa_message_id;
  }

  console.log("Sending to WasenderAPI:", JSON.stringify({ endpoint, to: phoneNumber, contentType: message.content_type }));

  // RETRY LOOP with protection-awareness
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
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
      console.log(`WasenderAPI response (attempt ${attempt}):`, JSON.stringify({ status: response.status, ok: response.ok }));

      if (response.ok) {
        // SUCCESS! Parse wa_message_id from various possible response formats
        console.log("WasenderAPI full response data:", JSON.stringify(responseData));
        const waMessageId = 
          responseData.id || 
          responseData.message_id || 
          responseData.messageId ||
          responseData.key?.id ||           // Wasender format
          responseData.data?.key?.id ||     // Nested format
          responseData.sentMessageId ||     // Alternative
          responseData.msgId;               // Legacy format
        console.log("Extracted wa_message_id:", waMessageId);
        
        // NON-BLOCKING: Update status without awaiting
        supabase
          .from("messages")
          .update({
            status: "sent",
            wa_message_id: waMessageId,
            sent_at: new Date().toISOString(),
            error_message: null, // Clear any previous error
          })
          .eq("id", message.id)
          .then(() => {})
          .catch((err: any) => console.error("Status update failed:", err));

        return { success: true, message_id: message.id, wa_message_id: waMessageId };
      }

      // FAILURE - check if retryable
      const errorMsg = responseData.message || responseData.error || responseData.raw || `HTTP ${response.status}`;
      lastError = errorMsg;

      // Check for non-retryable errors
      if (isNonRetryableError(response.status, responseText)) {
        console.log(`Non-retryable error on attempt ${attempt}: ${errorMsg}`);
        updateMessageStatusNonBlocking(supabase, message.id, "failed", errorMsg);
        return { success: false, error: errorMsg };
      }

      // Check if retryable
      if (isRetryableError(response.status, responseText, undefined)) {
        const isProtectionError = responseText.toLowerCase().includes("account protection") || 
                                  responseText.toLowerCase().includes("1 message every");
        const protectionWaitMs = isProtectionError ? parseProtectionWaitMs(responseText) : 0;
        const waitMs = calculateBackoff(attempt, isProtectionError, protectionWaitMs);
        
        console.log(`Retryable error on attempt ${attempt}, waiting ${waitMs}ms: ${errorMsg}`);
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(waitMs);
          continue; // Retry
        }
      }

      // Not retryable or exhausted retries
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        // Keep as pending for future process_pending to retry
        console.log(`Exhausted retries, keeping pending: ${errorMsg}`);
        updateMessageStatusNonBlocking(supabase, message.id, "pending", errorMsg);
        return { success: false, error: errorMsg, will_retry: true };
      }

      // Unknown error, mark as failed
      updateMessageStatusNonBlocking(supabase, message.id, "failed", errorMsg);
      return { success: false, error: errorMsg };

    } catch (networkError: unknown) {
      const errorMsg = networkError instanceof Error ? networkError.message : "Network error";
      lastError = errorMsg;
      console.error(`Network error on attempt ${attempt}:`, errorMsg);

      // Check if network error is retryable
      if (isRetryableError(0, "", errorMsg)) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const waitMs = calculateBackoff(attempt, false, 0);
          console.log(`Retryable network error, waiting ${waitMs}ms`);
          await sleep(waitMs);
          continue; // Retry
        }
      }

      // Exhausted retries or non-retryable network error
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        // Keep as pending for future retry
        console.log(`Exhausted retries after network errors, keeping pending`);
        updateMessageStatusNonBlocking(supabase, message.id, "pending", errorMsg);
        return { success: false, error: errorMsg, will_retry: true };
      }
    }
  }

  // Fallback (should not reach here normally)
  updateMessageStatusNonBlocking(supabase, message.id, "pending", lastError);
  return { success: false, error: lastError, will_retry: true };
}

// Original sendMessage with retry support (used by processPendingMessages and sendMessageById)
async function sendMessage(supabase: any, message: any) {
  const phoneNumber = message.contacts?.phone_number || message.contacts?.wa_id?.replace(/@.*$/, "");
  
  if (!phoneNumber) {
    await updateMessageStatus(supabase, message.id, "failed", "No phone number");
    return { success: false, error: "No phone number" };
  }

  // Check if instance info already included
  let instance = message.instance;
  
  if (!instance) {
    // Fetch instance API key
    const { data: instanceData, error: instanceError } = await supabase
      .from("whatsapp_instances")
      .select("api_key_encrypted, session_id, status")
      .eq("id", message.instance_id)
      .single();

    if (instanceError || !instanceData) {
      await updateMessageStatus(supabase, message.id, "failed", "Instance not found");
      return { success: false, error: "Instance not found" };
    }
    instance = instanceData;
  }

  if (instance.status !== "active") {
    await updateMessageStatus(supabase, message.id, "failed", "Instance not connected");
    return { success: false, error: "Instance not connected" };
  }

  const apiKey = instance.api_key_encrypted;
  const endpoint = `${WASENDER_API_BASE}/send-message`;
  let body: any = { to: phoneNumber };

  // Reply lookup
  if (message.reply_to_id) {
    const { data: replied } = await supabase
      .from("messages")
      .select("wa_message_id")
      .eq("id", message.reply_to_id)
      .maybeSingle();

    if (replied?.wa_message_id) {
      body.replyTo = replied.wa_message_id;
    }
  }

  switch (message.content_type) {
    case "image":
      body.imageUrl = message.media_url;
      if (message.content) body.text = message.content;
      break;
    case "video":
      body.videoUrl = message.media_url;
      if (message.content) body.text = message.content;
      break;
    case "audio":
    case "voice":
    case "ptt":
      body.audioUrl = message.media_url;
      break;
    case "document":
      body.documentUrl = message.media_url;
      if (message.media_filename) body.fileName = message.media_filename;
      break;
    case "sticker":
      body.stickerUrl = message.media_url;
      break;
    case "location":
      body.latitude = message.location_lat;
      body.longitude = message.location_lng;
      if (message.content) body.text = message.content;
      break;
    case "text":
    default:
      body.text = message.content || "";
      break;
  }

  console.log("Sending to WasenderAPI:", JSON.stringify({ endpoint, to: phoneNumber, contentType: message.content_type }));

  // RETRY LOOP with protection-awareness
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
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
      console.log(`WasenderAPI response (attempt ${attempt}):`, JSON.stringify({ status: response.status, ok: response.ok }));

      if (response.ok) {
        const waMessageId = responseData.id || responseData.message_id || responseData.messageId;
        
        await supabase
          .from("messages")
          .update({
            status: "sent",
            wa_message_id: waMessageId,
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq("id", message.id);

        return { success: true, message_id: message.id, wa_message_id: waMessageId };
      }

      const errorMsg = responseData.message || responseData.error || responseData.raw || `HTTP ${response.status}`;
      lastError = errorMsg;

      // Check for non-retryable errors
      if (isNonRetryableError(response.status, responseText)) {
        console.log(`Non-retryable error on attempt ${attempt}: ${errorMsg}`);
        await updateMessageStatus(supabase, message.id, "failed", errorMsg);
        return { success: false, error: errorMsg };
      }

      // Check if retryable
      if (isRetryableError(response.status, responseText, undefined)) {
        const isProtectionError = responseText.toLowerCase().includes("account protection") || 
                                  responseText.toLowerCase().includes("1 message every");
        const protectionWaitMs = isProtectionError ? parseProtectionWaitMs(responseText) : 0;
        const waitMs = calculateBackoff(attempt, isProtectionError, protectionWaitMs);
        
        console.log(`Retryable error on attempt ${attempt}, waiting ${waitMs}ms: ${errorMsg}`);
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(waitMs);
          continue;
        }
      }

      // Exhausted retries - keep pending for future retry
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        console.log(`Exhausted retries, keeping pending: ${errorMsg}`);
        await updateMessageStatus(supabase, message.id, "pending", errorMsg);
        return { success: false, error: errorMsg, will_retry: true };
      }

    } catch (networkError: unknown) {
      const errorMsg = networkError instanceof Error ? networkError.message : "Network error";
      lastError = errorMsg;
      console.error(`Network error on attempt ${attempt}:`, errorMsg);

      if (isRetryableError(0, "", errorMsg)) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const waitMs = calculateBackoff(attempt, false, 0);
          console.log(`Retryable network error, waiting ${waitMs}ms`);
          await sleep(waitMs);
          continue;
        }
      }

      // Exhausted retries - keep pending for future retry
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        console.log(`Exhausted retries after network errors, keeping pending`);
        await updateMessageStatus(supabase, message.id, "pending", errorMsg);
        return { success: false, error: errorMsg, will_retry: true };
      }
    }
  }

  // Fallback
  await updateMessageStatus(supabase, message.id, "pending", lastError);
  return { success: false, error: lastError, will_retry: true };
}

async function updateMessageStatus(supabase: any, messageId: string, status: string, errorMessage?: string) {
  await supabase
    .from("messages")
    .update({
      status,
      error_message: errorMessage || null,
    })
    .eq("id", messageId);
}

// Non-blocking version for optimized flow
function updateMessageStatusNonBlocking(supabase: any, messageId: string, status: string, errorMessage?: string) {
  supabase
    .from("messages")
    .update({
      status,
      error_message: errorMessage || null,
    })
    .eq("id", messageId)
    .then(() => {})
    .catch((err: any) => console.error("Non-blocking status update failed:", err));
}
