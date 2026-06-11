import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting contact_thread_state backfill...");

    // Run the backfill function
    const { data, error } = await supabase.rpc("backfill_contact_thread_state");

    if (error) {
      console.error("Backfill error:", error);
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    console.log("Backfill complete:", result);

    return new Response(
      JSON.stringify({
        success: true,
        wa_contacts_processed: result?.wa_contacts_processed || 0,
        fb_contacts_processed: result?.fb_contacts_processed || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in backfill-thread-state:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
