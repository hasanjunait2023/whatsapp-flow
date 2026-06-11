import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_API_URL = 'https://app.wasenderapi.com/api';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wasenderToken = Deno.env.get('WASENDER_PERSONAL_TOKEN');
    
    if (!wasenderToken) {
      throw new Error('WASENDER_PERSONAL_TOKEN not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { instance_id } = await req.json();

    if (!instance_id) {
      return new Response(
        JSON.stringify({ error: 'instance_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get instance details
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('id, tenant_id, wasender_session_id, session_id, status')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      throw new Error('Instance not found');
    }

    // Use numeric session_id for API calls (preferred), fallback to wasender_session_id
    const sessionIdForApi = instance.session_id || instance.wasender_session_id;
    
    if (!sessionIdForApi) {
      return new Response(
        JSON.stringify({ status: instance.status, message: 'No Wasender session' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using session ID for API:', sessionIdForApi);

    // Call Wasender API to get session status
    const statusResponse = await fetch(
      `${WASENDER_API_URL}/whatsapp-sessions/${sessionIdForApi}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${wasenderToken}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Wasender status check error:', errorText);
      return new Response(
        JSON.stringify({ status: instance.status, error: 'Failed to check status' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    console.log('Wasender session status:', statusData);

    // Extract status from response
    const sessionInfo = statusData.data || statusData;
    const wasenderStatus = sessionInfo.status?.toLowerCase() || sessionInfo.state?.toLowerCase();
    
    console.log('Wasender status:', wasenderStatus);

    // Map Wasender status to our status
    let newStatus = instance.status;
    if (wasenderStatus === 'connected' || wasenderStatus === 'ready' || wasenderStatus === 'logged_in' || wasenderStatus === 'open') {
      newStatus = 'active';
    } else if (wasenderStatus === 'disconnected' || wasenderStatus === 'close' || wasenderStatus === 'logged_out') {
      newStatus = 'disconnected';
    } else if (wasenderStatus === 'need_scan' || wasenderStatus === 'qr' || wasenderStatus === 'connecting') {
      newStatus = 'disconnected'; // Still waiting for QR scan
    }

    // Update instance if status changed
    if (newStatus !== instance.status) {
      console.log('Updating instance status from', instance.status, 'to', newStatus);
      
      const updateData: Record<string, any> = {
        status: newStatus,
        last_status_at: new Date().toISOString()
      };

      if (newStatus === 'active') {
        updateData.qr_code = null;
        updateData.qr_expires_at = null;
        updateData.connection_error = null;
        updateData.last_connected_at = new Date().toISOString();
        
        // Update phone number if available
        if (sessionInfo.phone_number || sessionInfo.phone) {
          updateData.phone_number = sessionInfo.phone_number || sessionInfo.phone;
        }
      }

      await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('id', instance_id);

      // Update onboarding job if exists
      if (newStatus === 'active') {
        await supabase
          .from('onboarding_jobs')
          .update({ status: 'connected', step: 'completed' })
          .eq('instance_id', instance_id)
          .in('status', ['awaiting_scan', 'connecting']);
      }
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        wasender_status: wasenderStatus,
        updated: newStatus !== instance.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Check status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
