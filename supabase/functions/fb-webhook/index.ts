import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// HMAC-SHA256 signature verification
async function verifySignature(appSecret: string, payload: string, signature: string): Promise<boolean> {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }

  const expectedSig = signature.slice(7); // Remove "sha256=" prefix
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computedSig = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  return expectedSig === computedSig;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const url = new URL(req.url);

    // Optional: app-level verify token (useful before any pages are connected)
    const globalVerifyToken = Deno.env.get("FB_WEBHOOK_VERIFY_TOKEN") || null;

    // GET - Webhook Verification
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("Webhook verification request:", { 
        mode, 
        receivedToken: token, 
        challengePreview: challenge?.slice(0, 30) + "...",
        fullUrl: req.url
      });

      if (mode === "subscribe" && token && challenge) {
        // 1) App-level token (optional)
        if (globalVerifyToken && token === globalVerifyToken) {
          console.log("Webhook verified successfully using global verify token");
          return new Response(challenge, {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "text/plain" },
          });
        }

        // 2) Page-level token (if pages are already connected)
        const { data: page, error } = await supabase
          .from("facebook_pages")
          .select("id, page_name, tenant_id, webhook_verify_token")
          .eq("webhook_verify_token", token)
          .maybeSingle();

        console.log("Database lookup result:", { 
          found: !!page, 
          pageId: page?.id,
          pageName: page?.page_name,
          error: error?.message 
        });

        if (error) {
          console.error("Database lookup error:", error);
        }

        if (!page) {
          // 3) No pages configured yet → allow verification so app can be set up in Meta
          // (Meta verifies webhook before any Page is subscribed, so DB can legitimately be empty here)
          const { count, error: countError } = await supabase
            .from("facebook_pages")
            .select("id", { count: "exact", head: true });

          if (countError) {
            console.error("Failed to count facebook_pages:", countError);
          }

          if ((count ?? 0) === 0) {
            console.warn(
              "No facebook_pages configured yet; allowing webhook verification for initial setup."
            );
            return new Response(challenge, {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "text/plain" },
            });
          }

          // List all available tokens for debugging (without revealing full tokens)
          const { data: allPages } = await supabase
            .from("facebook_pages")
            .select("page_name, webhook_verify_token")
            .limit(10);
          
          console.error("No page found with verify token:", token);
          console.log("Available pages:", allPages?.map(p => ({
            name: p.page_name,
            tokenPreview: p.webhook_verify_token?.slice(0, 4) + "..."
          })));
          
          return new Response("Verification failed - token not found", { status: 403, headers: corsHeaders });
        }

        console.log("Webhook verified successfully for page:", page.page_name);

        // Update page status to active
        await supabase
          .from("facebook_pages")
          .update({ status: "active", last_connected_at: new Date().toISOString() })
          .eq("id", page.id);

        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }

      console.log("Invalid verification request - missing required params:", { mode, hasToken: !!token, hasChallenge: !!challenge });
      return new Response("Invalid verification request", { status: 400, headers: corsHeaders });
    }

    // POST - Event Ingestion
    if (req.method === "POST") {
      const rawBody = await req.text();
      const signature = req.headers.get("x-hub-signature-256") || "";
      
      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
      }

      console.log("Received webhook event:", JSON.stringify(body, null, 2));

      // Must respond quickly (within 20 seconds)
      // Process events asynchronously after responding
      if (body.object !== "page") {
        return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
      }

      // Process each entry
      for (const entry of body.entry || []) {
        const fbPageId = String(entry.id).trim();

        // Find the page in our database
        const { data: page, error: pageError } = await supabase
          .from("facebook_pages")
          .select("id, tenant_id, app_secret, page_access_token")
          .eq("page_id", fbPageId)
          .single();

        if (pageError || !page) {
          console.error("Page not found for ID:", fbPageId);
          continue;
        }

        // Verify signature if app_secret is configured
        if (page.app_secret) {
          const isValid = await verifySignature(page.app_secret, rawBody, signature);
          if (!isValid) {
            console.error("Invalid webhook signature for page:", fbPageId);
            continue;
          }
        }

        // Process messaging events
        for (const messagingEvent of entry.messaging || []) {
          const senderPsid = messagingEvent.sender?.id;
          const recipientId = messagingEvent.recipient?.id;
          const timestamp = messagingEvent.timestamp;
          
          // Skip if sender is the page itself (outbound messages)
          if (senderPsid === fbPageId) {
            continue;
          }

          // Generate idempotency key
          const idempotencyKey = messagingEvent.message?.mid || `${senderPsid}-${timestamp}`;

          // Check for duplicate
          const { data: existing } = await supabase
            .from("fb_webhook_events_log")
            .select("id")
            .eq("idempotency_key", idempotencyKey)
            .single();

          if (existing) {
            console.log("Duplicate event, skipping:", idempotencyKey);
            continue;
          }

          // Log the event (skip for typing - too frequent)
          if (!messagingEvent.sender_action) {
            await supabase.from("fb_webhook_events_log").insert({
              tenant_id: page.tenant_id,
              page_id: page.id,
              event_type: messagingEvent.message ? "messages" : 
                          messagingEvent.postback ? "messaging_postbacks" :
                          messagingEvent.delivery ? "message_deliveries" :
                          messagingEvent.read ? "message_reads" : "unknown",
              sender_psid: senderPsid,
              payload: messagingEvent,
              idempotency_key: idempotencyKey,
              processed: false,
            });
          }

          // Handle typing indicator
          if (messagingEvent.sender_action === "typing_on") {
            await processTypingIndicator(supabase, page, senderPsid, true);
            continue; // Skip idempotency check for typing
          }
          if (messagingEvent.sender_action === "typing_off") {
            await processTypingIndicator(supabase, page, senderPsid, false);
            continue;
          }

          // Handle message events
          if (messagingEvent.message) {
            // Clear typing when message received
            await processTypingIndicator(supabase, page, senderPsid, false);
            await processIncomingMessage(supabase, page, senderPsid, messagingEvent.message, timestamp);
          }

          // Handle delivery receipts
          if (messagingEvent.delivery) {
            await processDeliveryReceipt(supabase, page, messagingEvent.delivery);
          }

          // Handle read receipts
          if (messagingEvent.read) {
            await processReadReceipt(supabase, page, senderPsid, messagingEvent.read);
          }

          // Handle postbacks (quick reply clicks)
          if (messagingEvent.postback) {
            await processPostback(supabase, page, senderPsid, messagingEvent.postback, timestamp);
          }
        }

        // Process feed (comment) events
        for (const feedChange of entry.changes || []) {
          if (feedChange.field === 'feed') {
            const value = feedChange.value;
            
            if (value.item === 'comment') {
              await processCommentWebhook(supabase, page, value);
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});

async function fetchFBUserProfile(
  pageAccessToken: string,
  psid: string
): Promise<{ name: string | null; profile_pic: string | null }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${psid}?fields=first_name,last_name,profile_pic&access_token=${pageAccessToken}`
    );
    
    if (!response.ok) {
      console.error("Failed to fetch FB user profile:", await response.text());
      return { name: null, profile_pic: null };
    }
    
    const data = await response.json();
    const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    
    return {
      name,
      profile_pic: data.profile_pic || null,
    };
  } catch (error) {
    console.error("Error fetching FB user profile:", error);
    return { name: null, profile_pic: null };
  }
}

async function processIncomingMessage(
  supabase: any,
  page: { id: string; tenant_id: string; page_access_token?: string },
  senderPsid: string,
  message: any,
  timestamp: number
) {
  // Find or create contact
  let { data: contact, error: contactError } = await supabase
    .from("fb_contacts")
    .select("id, unread_count")
    .eq("page_id", page.id)
    .eq("psid", senderPsid)
    .single();

  if (contactError || !contact) {
    // Fetch user profile from Facebook Graph API
    let userName = null;
    let profilePicUrl = null;
    
    if (page.page_access_token) {
      const profile = await fetchFBUserProfile(page.page_access_token, senderPsid);
      userName = profile.name;
      profilePicUrl = profile.profile_pic;
      console.log("Fetched FB user profile:", { psid: senderPsid, name: userName, hasPic: !!profilePicUrl });
    }
    
    // Create new contact
    const { data: newContact, error: insertError } = await supabase
      .from("fb_contacts")
      .insert({
        tenant_id: page.tenant_id,
        page_id: page.id,
        psid: senderPsid,
        name: userName,
        profile_pic_url: profilePicUrl,
        last_message_at: new Date(timestamp).toISOString(),
        unread_count: 1,
      })
      .select("id, unread_count")
      .single();

    if (insertError) {
      console.error("Failed to create contact:", insertError);
      return;
    }
    contact = newContact;

    // Insert into contact_thread_state for new FB contact
    try {
      await supabase.from("contact_thread_state").insert({
        tenant_id: page.tenant_id,
        contact_id: newContact.id,
        contact_type: "facebook",
        instance_id: page.id,
        contact_name: userName,
        contact_phone: senderPsid,
        contact_avatar_url: profilePicUrl,
        last_message_at: new Date(timestamp).toISOString(),
        last_message_preview: "",
        last_message_direction: "inbound",
        unread_count: 1,
        total_messages: 1,
      });
    } catch (threadStateError) {
      console.log("contact_thread_state insert error:", threadStateError);
    }

    // Update daily stats for new conversation
    try {
      await supabase.rpc("increment_daily_stats", {
        p_tenant_id: page.tenant_id,
        p_direction: "inbound",
        p_channel: "facebook",
        p_is_new_conversation: true,
      });
    } catch (rpcError) {
      console.log("increment_daily_stats RPC error:", rpcError);
    }

    // Trigger async profile fetch to store permanent avatar in Supabase Storage
    // Fire-and-forget - don't await to avoid delaying message processing
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    fetch(`${supabaseUrl}/functions/v1/fb-refresh-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ contact_id: newContact.id }),
    }).catch((err) => {
      console.error("Failed to trigger async profile refresh:", err);
    });
  } else {
    // Update existing contact
    const updateData: Record<string, any> = {
      last_message_at: new Date(timestamp).toISOString(),
      unread_count: (contact.unread_count || 0) + 1,
    };

    // Auto-fetch profile for existing contacts with null name
    if (!contact.name && page.page_access_token) {
      const profile = await fetchFBUserProfile(page.page_access_token, senderPsid);
      if (profile.name) {
        updateData.name = profile.name;
        console.log("Auto-updated name for existing contact:", { psid: senderPsid, name: profile.name });
      }
      if (profile.profile_pic) {
        updateData.profile_pic_url = profile.profile_pic;
      }
    }

    await supabase
      .from("fb_contacts")
      .update(updateData)
      .eq("id", contact.id);

    // Update contact_thread_state (optimized denormalized table)
    const textPreview = (message.text || "").substring(0, 100) || "[attachment]";
    try {
      await supabase.rpc("update_thread_state_on_message", {
        p_contact_id: contact.id,
        p_last_message_at: new Date(timestamp).toISOString(),
        p_last_message_preview: textPreview,
        p_last_message_direction: "inbound",
        p_last_message_type: "text",
        p_unread_delta: 1,
      });
    } catch (rpcError) {
      console.log("update_thread_state_on_message RPC error:", rpcError);
    }

    // Update daily stats
    try {
      await supabase.rpc("increment_daily_stats", {
        p_tenant_id: page.tenant_id,
        p_direction: "inbound",
        p_channel: "facebook",
        p_is_new_conversation: false,
      });
    } catch (rpcError) {
      console.log("increment_daily_stats RPC error:", rpcError);
    }
  }

  // Determine content type and extract content
  let contentType = "text";
  let content = message.text || "";
  let mediaUrl = null;
  let mediaMimeType = null;
  let mediaFilename = null;

  if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0];
    contentType = attachment.type; // image, video, audio, file
    mediaUrl = attachment.payload?.url;
    
    if (attachment.type === "fallback") {
      contentType = "text";
      content = attachment.title || message.text || "[Unsupported attachment]";
    }
  }

  // Check for quick reply payload
  const quickReplyPayload = message.quick_reply?.payload || null;

  // Insert message
  await supabase.from("fb_messages").insert({
    tenant_id: page.tenant_id,
    page_id: page.id,
    contact_id: contact.id,
    mid: message.mid,
    direction: "inbound",
    status: "delivered",
    content_type: contentType,
    content: content,
    media_url: mediaUrl,
    original_media_url: mediaUrl,
    media_mime_type: mediaMimeType,
    media_filename: mediaFilename,
    quick_reply_payload: quickReplyPayload,
    sent_at: new Date(timestamp).toISOString(),
  });

  console.log("Processed incoming message:", message.mid);
}

async function processDeliveryReceipt(
  supabase: any,
  page: { id: string },
  delivery: any
) {
  const mids = delivery.mids || [];
  const watermark = delivery.watermark;

  for (const mid of mids) {
    await supabase
      .from("fb_messages")
      .update({ 
        status: "delivered", 
        delivered_at: new Date(watermark).toISOString() 
      })
      .eq("mid", mid)
      .eq("page_id", page.id);
  }
}

async function processReadReceipt(
  supabase: any,
  page: { id: string },
  senderPsid: string,
  read: any
) {
  const watermark = read.watermark;

  // Mark all messages as read that were sent before the watermark
  await supabase
    .from("fb_messages")
    .update({ 
      status: "read", 
      read_at: new Date(watermark).toISOString() 
    })
    .eq("page_id", page.id)
    .eq("direction", "outbound")
    .lte("sent_at", new Date(watermark).toISOString());
}

async function processPostback(
  supabase: any,
  page: { id: string; tenant_id: string },
  senderPsid: string,
  postback: any,
  timestamp: number
) {
  // Find contact
  const { data: contact } = await supabase
    .from("fb_contacts")
    .select("id")
    .eq("page_id", page.id)
    .eq("psid", senderPsid)
    .single();

  if (!contact) return;

  // Insert postback as a message
  await supabase.from("fb_messages").insert({
    tenant_id: page.tenant_id,
    page_id: page.id,
    contact_id: contact.id,
    direction: "inbound",
    status: "delivered",
    content_type: "text",
    content: postback.title || postback.payload,
    quick_reply_payload: postback.payload,
    sent_at: new Date(timestamp).toISOString(),
  });
}

async function processTypingIndicator(
  supabase: any,
  page: { id: string; tenant_id: string },
  senderPsid: string,
  isTyping: boolean
) {
  // Update contact's typing_at field
  await supabase
    .from("fb_contacts")
    .update({ 
      typing_at: isTyping ? new Date().toISOString() : null 
    })
    .eq("page_id", page.id)
    .eq("psid", senderPsid);
}

async function processCommentWebhook(
  supabase: any,
  page: { id: string; tenant_id: string; page_access_token?: string },
  value: {
    comment_id: string;
    parent_id?: string;
    post_id: string;
    verb: string; // add, edited, remove
    from?: { id: string; name: string };
    message?: string;
    created_time?: number;
    photo?: string;
  }
) {
  console.log("Processing comment webhook:", JSON.stringify(value, null, 2));

  // Extract Facebook IDs
  const fbPostId = value.post_id;
  const fbCommentId = value.comment_id;
  const verb = value.verb;

  // Handle comment removal
  if (verb === "remove") {
    await supabase
      .from("fb_post_comments")
      .delete()
      .eq("fb_comment_id", fbCommentId);
    console.log("Removed comment:", fbCommentId);
    return;
  }

  // Find or create post
  let { data: post, error: postError } = await supabase
    .from("fb_posts")
    .select("id")
    .eq("page_id", page.id)
    .eq("fb_post_id", fbPostId)
    .single();

  if (postError || !post) {
    // Create post entry (we'll sync full details later)
    const { data: newPost, error: createError } = await supabase
      .from("fb_posts")
      .insert({
        tenant_id: page.tenant_id,
        page_id: page.id,
        fb_post_id: fbPostId,
        post_type: "status",
        created_time: value.created_time 
          ? new Date(value.created_time * 1000).toISOString() 
          : new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) {
      console.error("Failed to create post:", createError);
      return;
    }
    post = newPost;
  }

  // Check if comment already exists (for edited)
  const { data: existingComment } = await supabase
    .from("fb_post_comments")
    .select("id")
    .eq("fb_comment_id", fbCommentId)
    .single();

  if (existingComment && verb === "edited") {
    // Update existing comment
    await supabase
      .from("fb_post_comments")
      .update({
        message: value.message || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingComment.id);
    console.log("Updated comment:", fbCommentId);
    return;
  }

  if (existingComment) {
    console.log("Comment already exists, skipping:", fbCommentId);
    return;
  }

  // Find parent comment if this is a reply
  let parentCommentId = null;
  if (value.parent_id && value.parent_id !== fbPostId) {
    const { data: parentComment } = await supabase
      .from("fb_post_comments")
      .select("id")
      .eq("fb_comment_id", value.parent_id)
      .single();
    
    if (parentComment) {
      parentCommentId = parentComment.id;
    }
  }

  // Determine if comment is from the page itself
  const isFromPage = value.from?.id === page.id.split('_')[0]; // Compare with FB page ID

  // Insert new comment
  const { error: insertError } = await supabase
    .from("fb_post_comments")
    .insert({
      tenant_id: page.tenant_id,
      page_id: page.id,
      post_id: post.id,
      fb_comment_id: fbCommentId,
      parent_comment_id: parentCommentId,
      commenter_fb_id: value.from?.id || "unknown",
      commenter_name: value.from?.name || null,
      message: value.message || null,
      attachment_url: value.photo || null,
      attachment_type: value.photo ? "photo" : null,
      is_from_page: isFromPage,
      is_read: isFromPage, // Page's own comments are automatically read
      created_time: value.created_time 
        ? new Date(value.created_time * 1000).toISOString() 
        : new Date().toISOString(),
    });

  if (insertError) {
    console.error("Failed to insert comment:", insertError);
    return;
  }

  console.log("Processed new comment:", fbCommentId);
}
