import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  frequency_per_week: number;
  frequency_per_month: number;
  min_days_between_messages: number;
  use_whatsapp: boolean;
  use_email: boolean;
  alternate_channels: boolean;
  blackout_hours: { start: string; end: string } | null;
  target_tier: string[] | null;
}

interface Enrollment {
  id: string;
  campaign_id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  current_week: number;
  current_step: number;
  next_message_at: string | null;
  last_message_at: string | null;
  messages_this_week: number;
  messages_this_month: number;
  week_reset_at: string | null;
  month_reset_at: string | null;
}

interface Sequence {
  id: string;
  campaign_id: string;
  week_number: number;
  day_of_week: number | null;
  step_order: number;
  name: string;
  theme: string;
  channel: string;
  content_template: {
    subject_bn?: string;
    body_bn?: string;
    wa_message_bn?: string;
  };
  discount_percent: number;
  is_active: boolean;
}

interface SendResult {
  success: boolean;
  error?: string;
  shouldRetry?: boolean;
}

// Rate limit: 5 seconds between messages
const MESSAGE_DELAY_MS = 5000;
// Max retry attempts for rate-limited messages
const MAX_RETRY_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Marketing automation cron started at:", new Date().toISOString());

    // Get all active campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("admin_marketing_campaigns")
      .select("*")
      .eq("status", "active");

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("No active campaigns found");
      return new Response(
        JSON.stringify({ success: true, message: "No active campaigns", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${campaigns.length} active campaigns`);

    let totalProcessed = 0;
    let totalSent = 0;
    let totalSkipped = 0;
    let totalRetried = 0;

    for (const campaign of campaigns as Campaign[]) {
      const result = await processCampaign(supabase, campaign);
      totalProcessed += result.processed;
      totalSent += result.sent;
      totalSkipped += result.skipped;
      totalRetried += result.retried;
    }

    // Reset weekly/monthly counters if needed
    await resetCounters(supabase);

    // Process retry queue (failed messages from previous runs)
    const retryResult = await processRetryQueue(supabase);
    totalRetried += retryResult.retried;
    totalSent += retryResult.sent;

    console.log(`Marketing cron completed. Processed: ${totalProcessed}, Sent: ${totalSent}, Skipped: ${totalSkipped}, Retried: ${totalRetried}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        sent: totalSent,
        skipped: totalSkipped,
        retried: totalRetried,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Marketing automation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processCampaign(supabase: any, campaign: Campaign) {
  console.log(`Processing campaign: ${campaign.name} (${campaign.id})`);

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let retried = 0;

  // Get enrollments that are due for a message
  const now = new Date();
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from("admin_marketing_enrollments")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("status", "active")
    .or(`next_message_at.is.null,next_message_at.lte.${now.toISOString()}`);

  if (enrollmentsError) {
    console.error("Error fetching enrollments:", enrollmentsError);
    return { processed: 0, sent: 0, skipped: 0, retried: 0 };
  }

  if (!enrollments || enrollments.length === 0) {
    console.log(`No due enrollments for campaign ${campaign.name}`);
    return { processed: 0, sent: 0, skipped: 0, retried: 0 };
  }

  console.log(`Found ${enrollments.length} due enrollments`);

  // Get sequences for this campaign
  const { data: sequences, error: sequencesError } = await supabase
    .from("admin_marketing_sequences")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("is_active", true)
    .order("week_number", { ascending: true })
    .order("step_order", { ascending: true });

  if (sequencesError || !sequences || sequences.length === 0) {
    console.log(`No sequences for campaign ${campaign.name}`);
    return { processed: 0, sent: 0, skipped: 0, retried: 0 };
  }

  for (const enrollment of enrollments as Enrollment[]) {
    processed++;

    // Check frequency limits
    const frequencyCheck = checkFrequencyLimits(campaign, enrollment);
    if (!frequencyCheck.canSend) {
      console.log(`Skipping enrollment ${enrollment.id}: ${frequencyCheck.reason}`);
      skipped++;
      continue;
    }

    // Check blackout hours
    if (isBlackoutTime(campaign.blackout_hours)) {
      console.log(`Skipping enrollment ${enrollment.id}: Blackout hours`);
      skipped++;
      continue;
    }

    // Find the next sequence to send
    const nextSequence = findNextSequence(sequences, enrollment);
    if (!nextSequence) {
      // Campaign completed for this enrollment
      await supabase
        .from("admin_marketing_enrollments")
        .update({ status: "completed", completed_at: now.toISOString() })
        .eq("id", enrollment.id);
      console.log(`Enrollment ${enrollment.id} completed`);
      continue;
    }

    // Get entity details
    const entityDetails = await getEntityDetails(supabase, enrollment.entity_type, enrollment.entity_id);
    if (!entityDetails) {
      console.log(`Entity not found for enrollment ${enrollment.id}`);
      skipped++;
      continue;
    }

    // Determine channel to use
    const channel = determineChannel(campaign, nextSequence, enrollment);

    // Send the message with retry logic
    const sendResult = await sendMarketingMessageWithRetry(
      supabase,
      enrollment,
      nextSequence,
      entityDetails,
      channel,
      campaign
    );

    if (sendResult.success) {
      sent++;

      // Update enrollment
      await updateEnrollmentAfterSend(supabase, enrollment, nextSequence, channel);

      // Log to customer journey
      await logToJourney(supabase, enrollment, nextSequence, channel);

      // Rate limit protection: wait 5 seconds before next message
      console.log(`Message sent successfully. Waiting ${MESSAGE_DELAY_MS}ms before next...`);
      await sleep(MESSAGE_DELAY_MS);
    } else if (sendResult.shouldRetry) {
      console.log(`Message queued for retry: enrollment ${enrollment.id}`);
      retried++;
    } else {
      console.error(`Failed to send message for enrollment ${enrollment.id}:`, sendResult.error);
      skipped++;
    }
  }

  return { processed, sent, skipped, retried };
}

async function sendMarketingMessageWithRetry(
  supabase: any,
  enrollment: Enrollment,
  sequence: Sequence,
  entityDetails: any,
  channel: "whatsapp" | "email",
  campaign: Campaign,
  retryCount = 0
): Promise<SendResult> {
  const result = await sendMarketingMessage(
    supabase,
    enrollment,
    sequence,
    entityDetails,
    channel,
    campaign
  );

  // If rate limited and haven't exceeded max retries
  if (!result.success && result.shouldRetry && retryCount < MAX_RETRY_ATTEMPTS) {
    console.log(`Retry attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS} for enrollment ${enrollment.id}`);
    
    // Wait before retrying (exponential backoff: 5s, 10s, 20s)
    const backoffMs = MESSAGE_DELAY_MS * Math.pow(2, retryCount);
    console.log(`Waiting ${backoffMs}ms before retry...`);
    await sleep(backoffMs);
    
    return sendMarketingMessageWithRetry(
      supabase,
      enrollment,
      sequence,
      entityDetails,
      channel,
      campaign,
      retryCount + 1
    );
  }

  return result;
}

async function processRetryQueue(supabase: any): Promise<{ retried: number; sent: number }> {
  let retried = 0;
  let sent = 0;

  // Get failed sends that should be retried
  const { data: failedSends, error } = await supabase
    .from("admin_marketing_sends")
    .select(`
      *,
      enrollment:admin_marketing_enrollments(*),
      sequence:admin_marketing_sequences(*)
    `)
    .eq("status", "failed")
    .lt("retry_count", MAX_RETRY_ATTEMPTS)
    .or(`retry_after.is.null,retry_after.lte.${new Date().toISOString()}`)
    .limit(10);

  if (error || !failedSends || failedSends.length === 0) {
    return { retried: 0, sent: 0 };
  }

  console.log(`Found ${failedSends.length} messages to retry`);

  for (const send of failedSends) {
    retried++;
    
    // Get entity details
    const entityDetails = await getEntityDetails(
      supabase,
      send.enrollment.entity_type,
      send.enrollment.entity_id
    );

    if (!entityDetails) {
      // Mark as permanently failed
      await supabase
        .from("admin_marketing_sends")
        .update({ 
          retry_count: MAX_RETRY_ATTEMPTS,
          error_message: "Entity not found" 
        })
        .eq("id", send.id);
      continue;
    }

    // Retry the send
    let sendSuccess = false;
    if (send.channel === "whatsapp" && entityDetails.phone) {
      const result = await sendWhatsAppMessage(supabase, entityDetails.phone, send.content.message);
      sendSuccess = result.success;

      // Update retry count
      await supabase
        .from("admin_marketing_sends")
        .update({
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.error || null,
          retry_count: send.retry_count + 1,
          retry_after: result.success ? null : new Date(Date.now() + MESSAGE_DELAY_MS * 2).toISOString(),
        })
        .eq("id", send.id);

      if (result.success) {
        sent++;
      }
    }

    // Rate limit between retries
    await sleep(MESSAGE_DELAY_MS);
  }

  return { retried, sent };
}

function checkFrequencyLimits(campaign: Campaign, enrollment: Enrollment): { canSend: boolean; reason: string } {
  // Check weekly limit
  if (enrollment.messages_this_week >= campaign.frequency_per_week) {
    return { canSend: false, reason: "Weekly limit reached" };
  }

  // Check monthly limit
  if (enrollment.messages_this_month >= campaign.frequency_per_month) {
    return { canSend: false, reason: "Monthly limit reached" };
  }

  // Check minimum days between messages
  if (enrollment.last_message_at) {
    const lastMessage = new Date(enrollment.last_message_at);
    const now = new Date();
    const daysSinceLastMessage = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastMessage < campaign.min_days_between_messages) {
      return { canSend: false, reason: `Minimum ${campaign.min_days_between_messages} days gap not met` };
    }
  }

  return { canSend: true, reason: "OK" };
}

function isBlackoutTime(blackoutHours: { start: string; end: string } | null): boolean {
  if (!blackoutHours) return false;

  // Use Bangladesh timezone (UTC+6)
  const now = new Date();
  const bdTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
  const currentHour = bdTime.getHours();
  const currentMinutes = bdTime.getMinutes();
  const currentTime = currentHour * 60 + currentMinutes;

  const [startHour, startMin] = blackoutHours.start.split(":").map(Number);
  const [endHour, endMin] = blackoutHours.end.split(":").map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle overnight blackout (e.g., 22:00 - 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}

function findNextSequence(sequences: Sequence[], enrollment: Enrollment): Sequence | null {
  // Find sequence for current week and next step
  const currentWeekSequences = sequences.filter(
    (s) => s.week_number === enrollment.current_week
  );

  // Find next step in current week
  const nextInWeek = currentWeekSequences.find(
    (s) => s.step_order > enrollment.current_step
  );

  if (nextInWeek) {
    return nextInWeek;
  }

  // Move to next week
  const nextWeekSequences = sequences.filter(
    (s) => s.week_number > enrollment.current_week
  );

  if (nextWeekSequences.length > 0) {
    return nextWeekSequences[0];
  }

  return null; // Campaign completed
}

function determineChannel(campaign: Campaign, sequence: Sequence, enrollment: Enrollment): "whatsapp" | "email" {
  // If sequence specifies a channel, use it
  if (sequence.channel === "whatsapp") return "whatsapp";
  if (sequence.channel === "email") return "email";

  // If both channels enabled and alternating
  if (campaign.use_whatsapp && campaign.use_email && campaign.alternate_channels) {
    // Alternate based on total messages sent
    const totalSent = enrollment.messages_this_week + enrollment.messages_this_month;
    return totalSent % 2 === 0 ? "whatsapp" : "email";
  }

  // Default to WhatsApp if enabled
  if (campaign.use_whatsapp) return "whatsapp";
  return "email";
}

async function getEntityDetails(supabase: any, entityType: string, entityId: string) {
  if (entityType === "lead") {
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, email, phone, business_name, status")
      .eq("id", entityId)
      .single();

    if (error || !data) return null;
    return { ...data, type: "lead" };
  }

  if (entityType === "tenant") {
    // Fetch tenant with owner info from profiles and auth.users
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, owner_id")
      .eq("id", entityId)
      .single();

    if (tenantError || !tenant) {
      console.log(`Tenant not found: ${entityId}`);
      return null;
    }

    // Get owner's profile and email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone_number, email")
      .eq("id", tenant.owner_id)
      .single();

    // Get owner's email from auth.users if not in profile
    let email = profile?.email;
    let phone = profile?.phone_number;

    if (!email) {
      const { data: userData } = await supabase.auth.admin.getUserById(tenant.owner_id);
      email = userData?.user?.email || null;
      phone = phone || userData?.user?.phone || null;
    }

    return {
      id: tenant.id,
      name: profile?.full_name || tenant.name,
      business_name: tenant.name,
      email: email,
      phone: phone,
      is_activated: true,
      type: "tenant"
    };
  }

  return null;
}

async function sendMarketingMessage(
  supabase: any,
  enrollment: Enrollment,
  sequence: Sequence,
  entityDetails: any,
  channel: "whatsapp" | "email",
  campaign: Campaign
): Promise<SendResult> {
  const template = sequence.content_template;

  // Process template variables
  const variables: Record<string, string> = {
    name: entityDetails.name || "ভাই/আপা",
    business_name: entityDetails.business_name || "আপনার ব্যবসা",
    sender_name: "Ecomex টিম",
    offer_end_date: getOfferEndDate(),
    signup_link: "https://whaatapp.lovable.app/auth/register",
  };

  if (channel === "whatsapp" && entityDetails.phone) {
    const message = processTemplate(template.wa_message_bn || "", variables);

    // Record the send attempt
    const { data: sendRecord, error: recordError } = await supabase
      .from("admin_marketing_sends")
      .insert({
        enrollment_id: enrollment.id,
        sequence_id: sequence.id,
        channel: "whatsapp",
        content: { message },
        status: "pending",
        retry_count: 0,
      })
      .select()
      .single();

    if (recordError) {
      console.error("Error recording send:", recordError);
      return { success: false, error: recordError.message };
    }

    // Call WhatsApp sender (using admin instance)
    const sendResult = await sendWhatsAppMessage(supabase, entityDetails.phone, message);

    // Update send record
    await supabase
      .from("admin_marketing_sends")
      .update({
        status: sendResult.success ? "sent" : "failed",
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.error || null,
        retry_after: sendResult.shouldRetry ? new Date(Date.now() + MESSAGE_DELAY_MS * 2).toISOString() : null,
      })
      .eq("id", sendRecord.id);

    return sendResult;
  }

  if (channel === "email" && entityDetails.email) {
    const subject = processTemplate(template.subject_bn || "Ecomex Automation", variables);
    const body = processTemplate(template.body_bn || "", variables);

    // Record the send attempt
    const { data: sendRecord, error: recordError } = await supabase
      .from("admin_marketing_sends")
      .insert({
        enrollment_id: enrollment.id,
        sequence_id: sequence.id,
        channel: "email",
        content: { subject, body },
        status: "pending",
        retry_count: 0,
      })
      .select()
      .single();

    if (recordError) {
      console.error("Error recording send:", recordError);
      return { success: false, error: recordError.message };
    }

    // Call email sender
    const sendResult = await sendMarketingEmail(entityDetails.email, entityDetails.name, subject, body);

    // Update send record
    await supabase
      .from("admin_marketing_sends")
      .update({
        status: sendResult.success ? "sent" : "failed",
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.error || null,
      })
      .eq("id", sendRecord.id);

    return sendResult;
  }

  return { success: false, error: "No valid contact method" };
}

function processTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

function getOfferEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
}

async function sendWhatsAppMessage(supabase: any, phone: string, message: string): Promise<SendResult> {
  try {
    // Get default admin WhatsApp instance
    const { data: instance, error: instanceError } = await supabase
      .from("admin_whatsapp_instances")
      .select("id, api_key_encrypted, phone_number, status")
      .eq("is_default", true)
      .eq("status", "active")
      .single();

    if (instanceError || !instance) {
      console.log("No active admin WhatsApp instance found");
      return { success: false, error: "No active WhatsApp instance" };
    }

    // Normalize phone number
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("880") ? cleanPhone : `880${cleanPhone}`;

    // Find or create contact in messages system for tracking
    const SYSTEM_TENANT_ID = "5a0ad1d5-588a-473a-af82-724e69890074";
    
    // Get the corresponding whatsapp_instances record for this admin instance
    const { data: waInstance } = await supabase
      .from("whatsapp_instances")
      .select("id")
      .eq("phone_number", instance.phone_number)
      .eq("tenant_id", SYSTEM_TENANT_ID)
      .single();

    let contactId: string | null = null;
    if (waInstance) {
      // Find or create contact
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("phone_number", formattedPhone)
        .eq("instance_id", waInstance.id)
        .single();

      if (existingContact) {
        contactId = existingContact.id;
      } else {
        // Create contact
        const { data: newContact } = await supabase
          .from("contacts")
          .insert({
            tenant_id: SYSTEM_TENANT_ID,
            instance_id: waInstance.id,
            phone_number: formattedPhone,
            wa_id: formattedPhone,
            name: null,
          })
          .select("id")
          .single();
        contactId = newContact?.id || null;
      }
    }

    // Send via Wasender API
    const response = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instance.api_key_encrypted}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        text: message,
      }),
    });

    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
      console.log(`Rate limited (429). Retry-After: ${retryAfter}s`);
      
      // Wait for the specified time
      await sleep(retryAfter * 1000);
      
      // Retry the request
      const retryResponse = await fetch("https://www.wasenderapi.com/api/send-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${instance.api_key_encrypted}`,
        },
        body: JSON.stringify({
          to: formattedPhone,
          text: message,
        }),
      });

      if (!retryResponse.ok) {
        const retryError = await retryResponse.text();
        console.error("WhatsApp API retry error:", retryError);
        return { success: false, error: `Rate limit retry failed: ${retryResponse.status}`, shouldRetry: true };
      }

      // Continue with success flow using retry response
      const retryData = await retryResponse.json();
      return await handleSuccessfulSend(supabase, contactId, waInstance, retryData, message, formattedPhone);
    }

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API error:", error);
      
      // Check if it's a rate limit error in the response body
      if (error.toLowerCase().includes("rate") || error.toLowerCase().includes("limit")) {
        return { success: false, error: `WhatsApp API error: ${response.status}`, shouldRetry: true };
      }
      
      return { success: false, error: `WhatsApp API error: ${response.status}` };
    }

    const responseData = await response.json();
    return await handleSuccessfulSend(supabase, contactId, waInstance, responseData, message, formattedPhone);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("WhatsApp send error:", msg);
    return { success: false, error: msg };
  }
}

async function handleSuccessfulSend(
  supabase: any,
  contactId: string | null,
  waInstance: any,
  responseData: any,
  message: string,
  formattedPhone: string
): Promise<SendResult> {
  const waMessageId = responseData?.id || responseData?.key?.id || responseData?.data?.key?.id || null;
  const SYSTEM_TENANT_ID = "5a0ad1d5-588a-473a-af82-724e69890074";

  // Insert into messages table for visibility in Admin Inbox
  if (contactId && waInstance) {
    const { error: insertError } = await supabase
      .from("messages")
      .insert({
        tenant_id: SYSTEM_TENANT_ID,
        instance_id: waInstance.id,
        contact_id: contactId,
        wa_message_id: waMessageId,
        direction: "outbound",
        status: "sent",
        content_type: "text",
        content: message,
        is_from_ai: false,
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to insert message record:", insertError);
    } else {
      console.log(`Marketing message recorded in inbox for contact ${contactId}`);
    }
  }

  return { success: true };
}

async function sendMarketingEmail(to: string, name: string, subject: string, body: string): Promise<SendResult> {
  try {
    const clientId = Deno.env.get("GMAIL_CLIENT_ID");
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
    const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");

    if (!clientId || !clientSecret || !refreshToken) {
      console.log("Gmail credentials not configured");
      return { success: false, error: "Gmail not configured" };
    }

    // Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      return { success: false, error: "Failed to get Gmail token" };
    }

    const { access_token } = await tokenResponse.json();

    // Create HTML email
    const htmlContent = createMarketingEmailHtml(name, body);
    const rawMessage = createMimeMessage(to, subject, htmlContent);

    // Send email
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gmail API error:", error);
      return { success: false, error: `Gmail API error: ${response.status}` };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Email send error:", message);
    return { success: false, error: message };
  }
}

function createMarketingEmailHtml(name: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Noto Serif Bengali', 'Segoe UI', sans-serif; background: #f4f7fa; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 25px; text-align: center; }
    .header img { width: 48px; height: 48px; margin-bottom: 10px; }
    .content { padding: 30px; line-height: 1.8; color: #333; white-space: pre-wrap; }
    .footer { background: #f8f9fc; padding: 20px; text-align: center; color: #888; font-size: 13px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Ecomex Automation</h1>
    </div>
    <div class="content">
${body}
    </div>
    <div class="footer">
      <p>সাহায্য প্রয়োজন? support@myecomex.com</p>
      <p>© 2025 Ecomex Automation</p>
      <p style="font-size: 11px; margin-top: 10px;">
        আর মেসেজ পেতে না চাইলে "unsubscribe" রিপ্লাই করুন।
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function createMimeMessage(to: string, subject: string, htmlContent: string): string {
  const fromEmail = "myecomex23@gmail.com";
  const boundary = `boundary_${Date.now()}`;

  const mimeMessage = [
    `From: Ecomex Automation <${fromEmail}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    btoa(unescape(encodeURIComponent(htmlContent))),
    `--${boundary}--`,
  ].join("\r\n");

  return btoa(mimeMessage).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function updateEnrollmentAfterSend(supabase: any, enrollment: Enrollment, sequence: Sequence, channel: string) {
  const now = new Date();
  const nextMessageDate = new Date(now);
  nextMessageDate.setDate(nextMessageDate.getDate() + 2); // Default 2 day gap

  // Determine next step
  let nextWeek = sequence.week_number;
  let nextStep = sequence.step_order;

  // Move to next step (the actual next sequence will be found in next cron run)
  nextStep++;

  await supabase
    .from("admin_marketing_enrollments")
    .update({
      current_week: nextWeek,
      current_step: nextStep,
      last_message_at: now.toISOString(),
      next_message_at: nextMessageDate.toISOString(),
      messages_this_week: enrollment.messages_this_week + 1,
      messages_this_month: enrollment.messages_this_month + 1,
      total_messages_sent: (enrollment as any).total_messages_sent + 1 || 1,
      metadata: {
        ...(enrollment as any).metadata,
        last_channel: channel,
        last_sequence_id: sequence.id,
      },
    })
    .eq("id", enrollment.id);
}

async function logToJourney(supabase: any, enrollment: Enrollment, sequence: Sequence, channel: string) {
  await supabase.from("admin_customer_journey").insert({
    entity_type: enrollment.entity_type,
    entity_id: enrollment.entity_id,
    event_type: "marketing_message_sent",
    event_category: "marketing",
    title_bn: `মার্কেটিং মেসেজ পাঠানো হয়েছে (${channel === "whatsapp" ? "WhatsApp" : "Email"})`,
    description_bn: sequence.name,
    channel,
    metadata: {
      campaign_id: enrollment.campaign_id,
      sequence_id: sequence.id,
      week: sequence.week_number,
      step: sequence.step_order,
      theme: sequence.theme,
    },
  });
}

async function resetCounters(supabase: any) {
  const now = new Date();

  // Reset weekly counters (every Sunday)
  if (now.getDay() === 0) {
    await supabase
      .from("admin_marketing_enrollments")
      .update({
        messages_this_week: 0,
        week_reset_at: now.toISOString(),
      })
      .eq("status", "active")
      .lt("week_reset_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
  }

  // Reset monthly counters (1st of month)
  if (now.getDate() === 1) {
    await supabase
      .from("admin_marketing_enrollments")
      .update({
        messages_this_month: 0,
        month_reset_at: now.toISOString(),
      })
      .eq("status", "active")
      .lt("month_reset_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());
  }
}
