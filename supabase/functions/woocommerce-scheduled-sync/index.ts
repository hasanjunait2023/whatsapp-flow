import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting scheduled WooCommerce sync...');

    // Get all integrations with auto sync enabled
    const { data: integrations, error: intError } = await supabase
      .from('woocommerce_integrations')
      .select('*')
      .eq('is_active', true)
      .eq('auto_sync_enabled', true)
      .or(`next_scheduled_sync.is.null,next_scheduled_sync.lte.${new Date().toISOString()}`);

    if (intError) throw intError;

    console.log(`Found ${integrations?.length || 0} integrations to sync`);

    const results = [];

    for (const integration of integrations || []) {
      try {
        console.log(`Syncing tenant ${integration.tenant_id}...`);

        // Call the existing woocommerce-sync function
        const response = await fetch(`${supabaseUrl}/functions/v1/woocommerce-sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: integration.tenant_id,
            action: 'sync',
          }),
        });

        const result = await response.json();

        // Calculate next sync time
        const nextSync = new Date();
        nextSync.setHours(nextSync.getHours() + (integration.sync_interval_hours || 24));

        // Update integration with next sync time
        await supabase
          .from('woocommerce_integrations')
          .update({
            last_sync_at: new Date().toISOString(),
            next_scheduled_sync: nextSync.toISOString(),
          })
          .eq('id', integration.id);

        results.push({
          tenant_id: integration.tenant_id,
          success: true,
          result,
        });

        console.log(`Tenant ${integration.tenant_id} synced successfully`);
      } catch (error: any) {
        console.error(`Failed to sync tenant ${integration.tenant_id}:`, error);
        results.push({
          tenant_id: integration.tenant_id,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Scheduled sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
