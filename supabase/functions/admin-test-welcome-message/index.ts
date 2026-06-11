import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { phone, message } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get an active ADMIN instance with session and API key
    const { data: instance, error: instanceError } = await supabase
      .from('admin_whatsapp_instances')
      .select('session_id, name, api_key_encrypted')
      .eq('status', 'active')
      .not('session_id', 'is', null)
      .not('api_key_encrypted', 'is', null)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();

    if (instanceError || !instance?.session_id || !instance?.api_key_encrypted) {
      // Try any active instance if no default found
      const { data: fallbackInstance, error: fallbackError } = await supabase
        .from('admin_whatsapp_instances')
        .select('session_id, name, api_key_encrypted')
        .eq('status', 'active')
        .not('session_id', 'is', null)
        .not('api_key_encrypted', 'is', null)
        .limit(1)
        .maybeSingle();

      if (fallbackError || !fallbackInstance?.session_id || !fallbackInstance?.api_key_encrypted) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No connected Admin WhatsApp instance found', 
            details: instanceError || fallbackError 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Use fallback instance
      Object.assign(instance || {}, fallbackInstance);
    }

    const activeInstance = instance!;
    console.log('Using admin instance:', activeInstance.name, 'session:', activeInstance.session_id);

    // Format phone number for Bangladesh
    let phoneNumber = phone.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '880' + phoneNumber.slice(1);
    } else if (!phoneNumber.startsWith('880')) {
      phoneNumber = '880' + phoneNumber;
    }

    console.log('Sending to:', phoneNumber);

    const waResponse = await fetch(`https://www.wasenderapi.com/api/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${activeInstance.api_key_encrypted}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: activeInstance.session_id,
        to: phoneNumber,
        text: message,
      }),
    });

    const responseText = await waResponse.text();
    console.log('Wasender response:', waResponse.status, responseText);

    if (waResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp message sent!',
          phone: phoneNumber,
          instance: activeInstance.name,
          response: responseText
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send WhatsApp message',
          status: waResponse.status,
          response: responseText
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error('Admin test welcome message error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
