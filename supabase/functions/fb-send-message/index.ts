import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FB_GRAPH_API = "https://graph.facebook.com/v18.0";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

// Retryable Facebook error codes
const RETRYABLE_ERROR_CODES = new Set([
  1, 2, 4, 17, 341, 368, -1,
]);

interface FacebookError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendWithRetry(
  url: string,
  payload: Record<string, unknown>,
  maxRetries: number = MAX_RETRIES
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: FacebookError }> {
  let lastError: FacebookError | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        return { success: true, data: result };
      }

      const fbError: FacebookError = result.error || {
        message: "Unknown Facebook API error",
        type: "OAuthException",
        code: 0,
      };

      lastError = fbError;

      if (!RETRYABLE_ERROR_CODES.has(fbError.code) || attempt === maxRetries) {
        break;
      }

      const baseDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      const jitter = Math.random() * 500;
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay + jitter;

      await sleep(delay);
    } catch (networkError) {
      lastError = {
        message: networkError instanceof Error ? networkError.message : "Network error",
        type: "NetworkError",
        code: -1,
      };

      if (attempt === maxRetries) break;
      await sleep(INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt));
    }
  }

  return { success: false, error: lastError || { message: "Unknown error", type: "Unknown", code: 0 } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body and auth in parallel
    const [bodyResult, authResult] = await Promise.all([
      req.json(),
      supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    ]);

    const { data: { user }, error: authError } = authResult;
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { contact_id, content, content_type = "text", media_url, quick_replies, attachment_id } = bodyResult;

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: "contact_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch contact and verify user access in parallel
    const [contactResult, userRoleResult] = await Promise.all([
      supabase
        .from("fb_contacts")
        .select(`
          id,
          psid,
          tenant_id,
          page_id,
          facebook_pages (
            id,
            page_id,
            page_access_token
          )
        `)
        .eq("id", contact_id)
        .single(),
      // We'll verify tenant access after we get the contact's tenant_id
      Promise.resolve(null)
    ]);

    if (contactResult.error || !contactResult.data) {
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contact = contactResult.data;

    // Verify user has access to this tenant
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", contact.tenant_id)
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pageData = contact.facebook_pages as unknown;
    const page = pageData as { id: string; page_id: string; page_access_token: string } | null;
    if (!page) {
      return new Response(
        JSON.stringify({ error: "Page not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Facebook Send API request
    const messagePayload: Record<string, unknown> = {
      recipient: { id: contact.psid },
      messaging_type: "RESPONSE",
    };

    if (content_type === "text") {
      const messageObj: Record<string, unknown> = { text: content };

      if (quick_replies && quick_replies.length > 0) {
        messageObj.quick_replies = quick_replies.map((qr: { title: string; payload?: string; image_url?: string }) => ({
          content_type: "text",
          title: qr.title.slice(0, 20),
          payload: qr.payload || qr.title,
          image_url: qr.image_url,
        }));
      }

      messagePayload.message = messageObj;
    } else if (["image", "video", "audio", "file"].includes(content_type)) {
      messagePayload.message = {
        attachment: {
          type: content_type === "file" ? "file" : content_type,
          payload: attachment_id 
            ? { attachment_id } 
            : { url: media_url, is_reusable: true },
        },
      };
    }

    // Create pending message in database
    const { data: newMessage, error: insertError } = await supabase
      .from("fb_messages")
      .insert({
        tenant_id: contact.tenant_id,
        page_id: page.id,
        contact_id: contact.id,
        direction: "outbound",
        status: "pending",
        content_type,
        content: content || "",
        media_url,
        sent_by_user_id: user.id,
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to create message:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to Facebook with retry logic
    const fbUrl = `${FB_GRAPH_API}/me/messages?access_token=${page.page_access_token}`;
    const sendResult = await sendWithRetry(fbUrl, messagePayload);

    if (!sendResult.success) {
      // Update message as failed - fire and forget
      supabase
        .from("fb_messages")
        .update({
          status: "failed",
          error_message: sendResult.error?.message || "Unknown error",
        })
        .eq("id", newMessage.id)
        .then(() => {});

      return new Response(
        JSON.stringify({ 
          error: sendResult.error?.message || "Failed to send message",
          facebook_error: sendResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fbResult = sendResult.data!;

    // Fire-and-forget: Update message status (non-blocking)
    // last_message_at is now handled by database trigger
    supabase
      .from("fb_messages")
      .update({
        mid: fbResult.message_id as string,
        status: "sent",
      })
      .eq("id", newMessage.id)
      .then(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        message_id: newMessage.id,
        mid: fbResult.message_id,
        recipient_id: fbResult.recipient_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
