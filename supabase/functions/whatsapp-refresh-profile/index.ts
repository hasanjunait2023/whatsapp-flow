import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WASENDER_API_BASE = "https://www.wasenderapi.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { contact_id } = await req.json();

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: "contact_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch contact first
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, phone_number, tenant_id, profile_pic_url, profile_pic_synced_at, instance_id")
      .eq("id", contact_id)
      .maybeSingle();

    if (contactError || !contact) {
      console.error("Contact not found:", contact_id, contactError);
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already synced (one-time fetch only)
    if (contact.profile_pic_synced_at) {
      console.log("Profile already synced for contact:", contact_id);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "already_synced" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key from instance (separate query)
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("api_key_encrypted")
      .eq("id", contact.instance_id)
      .maybeSingle();

    const apiKey = instance?.api_key_encrypted;
    if (!apiKey) {
      console.error("No API key for instance");
      // Mark as synced to prevent repeated attempts
      await supabase
        .from("contacts")
        .update({ profile_pic_synced_at: new Date().toISOString() })
        .eq("id", contact_id);
      return new Response(
        JSON.stringify({ success: false, reason: "no_api_key" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phoneNumber = contact.phone_number;
    if (!phoneNumber) {
      console.error("No phone number for contact");
      await supabase
        .from("contacts")
        .update({ profile_pic_synced_at: new Date().toISOString() })
        .eq("id", contact_id);
      return new Response(
        JSON.stringify({ success: false, reason: "no_phone_number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching profile picture for:", phoneNumber);

    // Call Wasender API to get profile picture
    const pictureResponse = await fetch(
      `${WASENDER_API_BASE}/contacts/${phoneNumber}/picture`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      }
    );

    if (!pictureResponse.ok) {
      console.error("Wasender picture API failed:", pictureResponse.status);
      // Mark as synced even on failure to prevent repeated attempts
      await supabase
        .from("contacts")
        .update({ profile_pic_synced_at: new Date().toISOString() })
        .eq("id", contact_id);
      return new Response(
        JSON.stringify({ success: false, reason: "api_failed", status: pictureResponse.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pictureData = await pictureResponse.json();
    console.log("Wasender picture response:", JSON.stringify(pictureData));

    // Extract image URL from response
    const imgUrl = pictureData.data?.imgUrl || pictureData.imgUrl || pictureData.url;

    if (!imgUrl) {
      console.log("No profile picture available for:", phoneNumber);
      // Mark as synced - user has no profile pic or privacy settings block it
      await supabase
        .from("contacts")
        .update({ profile_pic_synced_at: new Date().toISOString() })
        .eq("id", contact_id);
      return new Response(
        JSON.stringify({ success: true, reason: "no_picture_available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the image
    console.log("Downloading profile picture from:", imgUrl);
    const imageResponse = await fetch(imgUrl);
    
    if (!imageResponse.ok) {
      console.error("Failed to download image:", imageResponse.status);
      await supabase
        .from("contacts")
        .update({ profile_pic_synced_at: new Date().toISOString() })
        .eq("id", contact_id);
      return new Response(
        JSON.stringify({ success: false, reason: "download_failed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBlob = await imageResponse.blob();
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    
    // Determine file extension
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extMap[contentType] || "jpg";
    
    // Store in Supabase Storage
    const filePath = `avatars/${contact.tenant_id}/${contact_id}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(filePath, imageBlob, {
        contentType,
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error("Failed to upload avatar:", uploadError);
      await supabase
        .from("contacts")
        .update({ profile_pic_synced_at: new Date().toISOString() })
        .eq("id", contact_id);
      return new Response(
        JSON.stringify({ success: false, reason: "upload_failed", error: uploadError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log("Avatar stored at:", publicUrl);

    // Update contact with profile picture URL and sync timestamp
    const { error: updateError } = await supabase
      .from("contacts")
      .update({
        profile_pic_url: publicUrl,
        profile_pic_synced_at: new Date().toISOString(),
      })
      .eq("id", contact_id);

    if (updateError) {
      console.error("Failed to update contact:", updateError);
      return new Response(
        JSON.stringify({ success: false, reason: "update_failed", error: updateError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully synced profile picture for contact:", contact_id);

    return new Response(
      JSON.stringify({
        success: true,
        profile_pic_url: publicUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Profile refresh error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
