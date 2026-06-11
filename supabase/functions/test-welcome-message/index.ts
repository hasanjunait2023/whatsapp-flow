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
  const wasenderToken = Deno.env.get('WASENDER_PERSONAL_TOKEN');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { phone, customerName, email, tempPassword, businessName } = await req.json();

    if (!wasenderToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'WASENDER_PERSONAL_TOKEN not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get an active instance with wasender session and API key
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('wasender_session_id, name, api_key_encrypted')
      .eq('status', 'active')
      .not('wasender_session_id', 'is', null)
      .not('api_key_encrypted', 'is', null)
      .limit(1)
      .maybeSingle();

    if (instanceError || !instance?.wasender_session_id || !instance?.api_key_encrypted) {
      return new Response(
        JSON.stringify({ success: false, error: 'No connected WhatsApp instance with API key found', details: instanceError }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Using instance:', instance.name, 'session:', instance.wasender_session_id);

    // Format phone number
    let phoneNumber = phone.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '880' + phoneNumber.slice(1);
    } else if (!phoneNumber.startsWith('880')) {
      phoneNumber = '880' + phoneNumber;
    }

    const whatsappMessage = `🎉 *Ecomex Automation এ স্বাগতম!*

প্রিয় ${customerName || 'Customer'},

আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। নিচে আপনার Login তথ্য দেওয়া হলো:

━━━━━━━━━━━━━━━━
📧 *Email:* ${email || 'test@example.com'}
🔑 *Password:* ${tempPassword || 'Temp@TestPass123'}
━━━━━━━━━━━━━━━━

👉 *Login করতে এখানে যান:*
https://whataapp.myecomex.com/auth/login

⚠️ *গুরুত্বপূর্ণ:*
প্রথম Login এর পর আপনার Password অবশ্যই পরিবর্তন করুন।

📍 Settings → Profile → Security

সাহায্য প্রয়োজন? এই নম্বরে Reply করুন অথবা support@myecomex.com এ Email করুন।

ধন্যবাদ! 🙏
Ecomex Automation Team`;

    console.log('Sending to:', phoneNumber);

    const waResponse = await fetch(`https://www.wasenderapi.com/api/send-message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${instance.api_key_encrypted}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: instance.wasender_session_id,
        to: phoneNumber,
        text: whatsappMessage,
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
          instance: instance.name,
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
    console.error('Test welcome message error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
