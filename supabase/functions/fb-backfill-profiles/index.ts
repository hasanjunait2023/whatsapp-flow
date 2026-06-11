 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
   "Access-Control-Allow-Methods": "POST, OPTIONS",
 };
 
 const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const { tenant_id, batch_size = 50, force = false } = await req.json();
 
     if (!tenant_id) {
       return new Response(
         JSON.stringify({ error: "tenant_id is required" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Query contacts that need profile updates
     let query = supabase
       .from("fb_contacts")
       .select("id, psid, name, profile_pic_url, profile_pic_synced_at")
       .eq("tenant_id", tenant_id)
       .limit(batch_size);
 
     if (force) {
       // Force refresh all contacts
       query = query.order("updated_at", { ascending: true });
     } else {
       // Only contacts without name or profile pic
       query = query.or("name.is.null,profile_pic_url.is.null");
     }
 
     const { data: contacts, error: fetchError } = await query;
 
     if (fetchError) {
       console.error("Failed to fetch contacts:", fetchError);
       return new Response(
         JSON.stringify({ error: "Failed to fetch contacts" }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     if (!contacts || contacts.length === 0) {
       return new Response(
         JSON.stringify({ 
           success: true, 
           message: "No contacts need profile updates",
           processed: 0,
           total: 0 
         }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`Starting backfill for ${contacts.length} contacts in tenant ${tenant_id}`);
 
     const results: Array<{
       contact_id: string;
       psid: string;
       success: boolean;
       name?: string | null;
       error?: string;
     }> = [];
 
     // Process each contact with rate limiting
     for (let i = 0; i < contacts.length; i++) {
       const contact = contacts[i];
       
       try {
         // Call fb-refresh-profile for this contact
         const refreshResponse = await fetch(
           `${supabaseUrl}/functions/v1/fb-refresh-profile`,
           {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
               "Authorization": `Bearer ${supabaseServiceKey}`,
             },
             body: JSON.stringify({
               contact_id: contact.id,
               force: force,
             }),
           }
         );
 
         const refreshResult = await refreshResponse.json();
 
         results.push({
           contact_id: contact.id,
           psid: contact.psid,
           success: refreshResult.success === true,
           name: refreshResult.name,
           error: refreshResult.error || refreshResult.message,
         });
 
         console.log(`[${i + 1}/${contacts.length}] Processed ${contact.psid}: ${refreshResult.success ? 'OK' : 'Failed'}`);
 
       } catch (error) {
         console.error(`Failed to refresh contact ${contact.id}:`, error);
         results.push({
           contact_id: contact.id,
           psid: contact.psid,
           success: false,
           error: error instanceof Error ? error.message : "Unknown error",
         });
       }
 
       // Rate limit: 1 second between API calls to respect Meta limits
       if (i < contacts.length - 1) {
         await sleep(1000);
       }
     }
 
     const successCount = results.filter((r) => r.success).length;
     const failCount = results.filter((r) => !r.success).length;
 
     // Get remaining count
     const { count: remainingCount } = await supabase
       .from("fb_contacts")
       .select("id", { count: "exact", head: true })
       .eq("tenant_id", tenant_id)
       .or("name.is.null,profile_pic_url.is.null");
 
     console.log(`Backfill complete: ${successCount} success, ${failCount} failed, ${remainingCount || 0} remaining`);
 
     return new Response(
       JSON.stringify({
         success: true,
         processed: contacts.length,
         success_count: successCount,
         fail_count: failCount,
         remaining: remainingCount || 0,
         results: results,
       }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
 
   } catch (error) {
     console.error("Error in fb-backfill-profiles:", error);
     return new Response(
       JSON.stringify({ error: "Internal server error" }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });