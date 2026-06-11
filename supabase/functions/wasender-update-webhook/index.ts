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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!wasenderToken) {
      throw new Error('WASENDER_PERSONAL_TOKEN not configured');
    }

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
      .select('id, tenant_id, wasender_session_id, webhook_secret')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      throw new Error('Instance not found');
    }

    if (!instance.wasender_session_id) {
      throw new Error('Instance has no Wasender session');
    }

    // Generate webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/wasender-webhook/${instance.id}`;
    const webhookSecret = instance.webhook_secret || crypto.randomUUID().replace(/-/g, '');

    console.log('Updating webhook for session:', instance.wasender_session_id);
    console.log('Webhook URL:', webhookUrl);

    // Update the Wasender session with webhook settings
    const updateResponse = await fetch(
      `${WASENDER_API_URL}/whatsapp-sessions/${instance.wasender_session_id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${wasenderToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          webhook_enabled: true,
          log_messages: true,
          webhook_events: [
            'messages.received',
            'messages.upsert',
            'messages.update',
            'session.status',
            'qrcode.updated'
          ]
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Wasender API error:', errorText);
      throw new Error(`Failed to update webhook: ${errorText}`);
    }

    const updateResult = await updateResponse.json();
    console.log('Webhook updated successfully:', updateResult);

    // Update local instance with webhook secret if not already set
    if (!instance.webhook_secret) {
      await supabase
        .from('whatsapp_instances')
        .update({ webhook_secret: webhookSecret })
        .eq('id', instance_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook configuration updated',
        webhook_url: webhookUrl,
        wasender_response: updateResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Update webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
