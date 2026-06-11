import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FB_GRAPH_API = "https://graph.facebook.com/v18.0";

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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { comment_id, message, attachment_url } = await req.json();

    if (!comment_id || !message) {
      return new Response(
        JSON.stringify({ error: "comment_id and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch comment to get page info
    const { data: comment, error: commentError } = await supabase
      .from("fb_post_comments")
      .select(`
        id,
        post_id,
        fb_comment_id,
        tenant_id,
        page_id,
        fb_posts (
          id,
          fb_post_id
        ),
        facebook_pages (
          id,
          page_id,
          page_access_token
        )
      `)
      .eq("id", comment_id)
      .single();

    if (commentError || !comment) {
      return new Response(
        JSON.stringify({ error: "Comment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to this tenant
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", comment.tenant_id)
      .single();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const page = comment.facebook_pages as unknown as { 
      id: string; 
      page_id: string; 
      page_access_token: string;
    };

    if (!page?.page_access_token) {
      return new Response(
        JSON.stringify({ error: "Page access token not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Facebook API request
    const fbUrl = `${FB_GRAPH_API}/${comment.fb_comment_id}/comments`;
    const body: Record<string, string> = { 
      message,
      access_token: page.page_access_token,
    };

    if (attachment_url) {
      body.attachment_url = attachment_url;
    }

    console.log("Sending reply to comment:", comment.fb_comment_id);

    const fbResponse = await fetch(fbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error("Facebook API error:", fbResult);
      return new Response(
        JSON.stringify({ 
          error: fbResult.error?.message || "Failed to reply to comment",
          facebook_error: fbResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert reply as a new comment in our database
    const { data: newComment, error: insertError } = await supabase
      .from("fb_post_comments")
      .insert({
        tenant_id: comment.tenant_id,
        page_id: comment.page_id,
        post_id: comment.post_id,
        fb_comment_id: fbResult.id,
        parent_comment_id: comment.id,
        commenter_fb_id: page.page_id, // Page is the commenter
        commenter_name: null, // Will be page name
        is_from_page: true,
        message,
        sent_by_user_id: user.id,
        created_time: new Date().toISOString(),
        is_read: true, // Our own replies are automatically read
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to save reply:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        comment_id: newComment?.id,
        fb_comment_id: fbResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Reply comment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
