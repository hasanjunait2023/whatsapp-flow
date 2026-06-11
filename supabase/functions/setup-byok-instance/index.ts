import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, name, phone_number, api_key, session_id } = await req.json();

    // Validate required fields
    if (!tenant_id || !api_key || !session_id || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: tenant_id, name, api_key, session_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if session_id is already linked to another instance
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id, tenant_id')
      .eq('wasender_session_id', session_id)
      .maybeSingle();

    if (existingInstance) {
      return new Response(
        JSON.stringify({ 
          error: 'This session is already linked to another instance',
          code: 'SESSION_ALREADY_LINKED'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the session exists in Wasender
    console.log(`Verifying session ${session_id} with Wasender API...`);
    const verifyResponse = await fetch(
      `https://app.wasenderapi.com/api/whatsapp-sessions/${session_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Wasender verify error:', errorText);
      
      if (verifyResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid WasenderAPI key', code: 'INVALID_API_KEY' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (verifyResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Session ID not found in your Wasender account', code: 'SESSION_NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Wasender API error: ${verifyResponse.status}`);
    }

    const sessionData = await verifyResponse.json();
    console.log('Session verified:', sessionData);

    // Generate webhook secret
    const webhookSecret = crypto.randomUUID();

    // CRITICAL: Wasender sends the API key as 'sessionId' in webhooks, NOT the numeric ID!
    // We must store the API key as wasender_session_id for webhook validation to work
    // The numeric session_id is stored separately for API calls
    const wasenderSessionIdForWebhook = api_key; // API key is what webhooks send
    
    console.log('Will store API key as wasender_session_id for webhook matching');
    console.log('Numeric session_id:', session_id, 'will be stored in session_id column');

    // First, insert the instance to get the ID
    const { data: instance, error: insertError } = await supabase
      .from('whatsapp_instances')
      .insert({
        tenant_id,
        name,
        phone_number: phone_number || sessionData.data?.phone_number || null,
        api_key_encrypted: api_key,
        wasender_session_id: wasenderSessionIdForWebhook, // API key for webhook matching
        session_id: session_id, // Numeric ID for API calls
        webhook_secret: webhookSecret,
        status: sessionData.data?.status === 'connected' ? 'active' : 'disconnected',
        last_connected_at: sessionData.data?.status === 'connected' ? new Date().toISOString() : null,
      })
      .select('id, tenant_id, name, phone_number, status, is_default, last_connected_at, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Configure webhook on the Wasender session
    const webhookUrl = `${supabaseUrl}/functions/v1/wasender-webhook/${instance.id}`;
    console.log(`Configuring webhook URL: ${webhookUrl}`);

    const updateResponse = await fetch(
      `https://app.wasenderapi.com/api/whatsapp-sessions/${session_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          webhook_enabled: true,
          webhook_events: ['messages.received', 'messages.update', 'session.status', 'qrcode.updated'],
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Webhook update error:', errorText);
      
      // Rollback: delete the instance if webhook setup failed
      await supabase.from('whatsapp_instances').delete().eq('id', instance.id);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to configure webhook on your Wasender session',
          details: errorText,
          code: 'WEBHOOK_SETUP_FAILED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook configured successfully');

    // Update instance with webhook_url
    await supabase
      .from('whatsapp_instances')
      .update({ webhook_url: webhookUrl })
      .eq('id', instance.id);

    return new Response(
      JSON.stringify({
        success: true,
        instance,
        message: 'Instance connected successfully',
        session_status: sessionData.data?.status || 'unknown',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in setup-byok-instance:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
