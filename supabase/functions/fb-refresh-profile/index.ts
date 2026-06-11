import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

async function downloadAndUploadImage(
  supabase: any,
  imageUrl: string,
  tenantId: string,
  contactId: string
): Promise<string | null> {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("Failed to download image:", response.status);
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    // Determine file extension
    let extension = "jpg";
    if (contentType.includes("png")) extension = "png";
    else if (contentType.includes("gif")) extension = "gif";
    else if (contentType.includes("webp")) extension = "webp";

    const storagePath = `fb-avatars/${tenantId}/${contactId}.${extension}`;

    // Upload to Supabase Storage (upsert)
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(storagePath, imageBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload image to storage:", uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("chat-media")
      .getPublicUrl(storagePath);

    console.log("Uploaded FB avatar to storage:", storagePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error downloading/uploading image:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contact_id, force } = await req.json();

    if (!contact_id) {
      return new Response(
        JSON.stringify({ error: "contact_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the contact with its associated page
    const { data: contact, error: contactError } = await supabase
      .from("fb_contacts")
      .select(`
        id,
        psid,
        name,
        profile_pic_url,
        profile_pic_synced_at,
        page_id,
        tenant_id,
        facebook_pages!inner (
          page_access_token
        )
      `)
      .eq("id", contact_id)
      .single();

    if (contactError || !contact) {
      console.error("Contact not found:", contactError);
      return new Response(
        JSON.stringify({ error: "Contact not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip if already synced (unless force=true)
    if (contact.profile_pic_synced_at && !force) {
      console.log("Profile already synced for contact:", contact_id);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true,
          message: "Profile already synced. Use force=true to refresh." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pageAccessToken = (contact.facebook_pages as any)?.page_access_token;
    if (!pageAccessToken) {
      return new Response(
        JSON.stringify({ error: "Page access token not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profile from Meta Graph API
    const profile = await fetchFBUserProfile(pageAccessToken, contact.psid);

    // Prepare update data
    const updateData: Record<string, any> = {
      profile_pic_synced_at: new Date().toISOString(),
    };

    if (profile.name) {
      updateData.name = profile.name;
    }

    // If we got a profile picture URL, download and store it permanently
    if (profile.profile_pic) {
      const permanentUrl = await downloadAndUploadImage(
        supabase,
        profile.profile_pic,
        contact.tenant_id,
        contact.id
      );

      if (permanentUrl) {
        updateData.profile_pic_url = permanentUrl;
        console.log("Stored permanent profile pic for contact:", contact_id);
      } else {
        // Fallback to temporary URL if storage fails
        updateData.profile_pic_url = profile.profile_pic;
        console.log("Using temporary profile pic URL for contact:", contact_id);
      }
    }

    // Update the contact
    const { error: updateError } = await supabase
      .from("fb_contacts")
      .update(updateData)
      .eq("id", contact_id);

    if (updateError) {
      console.error("Failed to update contact:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update contact" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.name && !profile.profile_pic) {
      console.log("No profile data available for contact:", contact_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Could not fetch profile from Facebook. The user may have privacy settings that prevent profile access." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully refreshed profile for contact:", contact_id, {
      name: profile.name,
      hasPic: !!updateData.profile_pic_url,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        name: profile.name,
        profile_pic_url: updateData.profile_pic_url 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fb-refresh-profile:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
