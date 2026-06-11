import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default Bangla invite template
const DEFAULT_INVITE_TEMPLATE = `প্রিয় {{customer_name}},

{{company_name}} এর পক্ষ থেকে আপনাকে আমাদের বিশেষ গ্রুপে যোগ দিতে আমন্ত্রণ জানাচ্ছি।

📱 গ্রুপে যোগ দিন: {{invite_link}}

এই গ্রুপে আপনি পাবেন:
✅ এক্সক্লুসিভ অফার ও ডিস্কাউন্ট
✅ নতুন প্রোডাক্ট আপডেট
✅ সরাসরি কাস্টমার সাপোর্ট

ধন্যবাদ,
{{company_name}}`;

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { group_id, contact_ids, custom_template } = await req.json();

    if (!group_id || !contact_ids || !Array.isArray(contact_ids) || contact_ids.length === 0) {
      return new Response(JSON.stringify({ error: "group_id and contact_ids array are required" }), {
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

    if (!group.invite_link) {
      return new Response(JSON.stringify({ error: "Group does not have an invite link" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get tenant info for company name
    const { data: tenant } = await supabaseClient
      .from("tenants")
      .select("name")
      .eq("id", instance.tenant_id)
      .single();

    const companyName = tenant?.name || "আমাদের কোম্পানি";
    const template = custom_template || DEFAULT_INVITE_TEMPLATE;

    // Get contacts to send invites
    const { data: contacts, error: contactsError } = await supabaseClient
      .from("contacts")
      .select("id, name, phone_number, wa_id")
      .in("id", contact_ids);

    if (contactsError || !contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ error: "No contacts found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const contact of contacts) {
      try {
        // Personalize message
        const message = template
          .replace(/{{customer_name}}/g, contact.name || "গ্রাহক")
          .replace(/{{company_name}}/g, companyName)
          .replace(/{{invite_link}}/g, group.invite_link)
          .replace(/{{group_name}}/g, group.name);

        // Send message via Wasender
        const wasenderResponse = await fetch(
          "https://www.wasenderapi.com/api/send-message",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${sessionApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: contact.wa_id || contact.phone_number,
              text: message,
            }),
          }
        );

        if (wasenderResponse.ok) {
          sentCount++;

          // Log customer journey event
          await serviceClient
            .from("customer_journey_events")
            .insert({
              contact_id: contact.id,
              tenant_id: instance.tenant_id,
              event_type: "group_invite_sent",
              event_category: "communication",
              title: "গ্রুপ আমন্ত্রণ পাঠানো হয়েছে",
              description: `"${group.name}" গ্রুপে যোগ দেওয়ার আমন্ত্রণ পাঠানো হয়েছে`,
              metadata: {
                group_id: group.id,
                group_name: group.name,
                invite_link: group.invite_link,
                sent_by: user.id,
              },
              created_by: user.id,
            });
        } else {
          failedCount++;
          const errorData = await wasenderResponse.text();
          errors.push({ contact_id: contact.id, error: errorData });
        }
      } catch (err: any) {
        failedCount++;
        errors.push({ contact_id: contact.id, error: err?.message || "Unknown error" });
      }
    }

    return new Response(
      JSON.stringify({
        success: sentCount > 0,
        sent: sentCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-send-invite:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
