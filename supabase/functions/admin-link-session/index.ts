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
     const { instance_id, session_id } = await req.json();
 
     if (!instance_id || !session_id) {
       return new Response(
         JSON.stringify({ error: 'instance_id and session_id are required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Verify the session exists in Wasender
     console.log(`Verifying session ${session_id} with Wasender API...`);
     const verifyResponse = await fetch(
       `${WASENDER_API_URL}/whatsapp-sessions/${session_id}`,
       {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${wasenderToken}`,
           'Content-Type': 'application/json',
         },
       }
     );
 
     if (!verifyResponse.ok) {
       const errorText = await verifyResponse.text();
       console.error('Wasender verify error:', errorText);
       throw new Error(`Session ${session_id} not found or inaccessible`);
     }
 
     const sessionData = await verifyResponse.json();
     console.log('Session verified:', sessionData);
 
     // Get the API key from the session
     const apiKey = sessionData.data?.api_key || sessionData.api_key;
     const phoneNumber = sessionData.data?.phone_number || sessionData.phone_number;
     const sessionStatus = sessionData.data?.status || sessionData.status;
 
     // Update the instance with session details
     const { error: updateError } = await supabase
       .from('whatsapp_instances')
       .update({
         session_id: session_id.toString(),
         wasender_session_id: apiKey || session_id.toString(),
         api_key_encrypted: apiKey,
         phone_number: phoneNumber,
         status: sessionStatus === 'connected' ? 'active' : 'disconnected',
         updated_at: new Date().toISOString()
       })
       .eq('id', instance_id);
 
     if (updateError) {
       console.error('Update error:', updateError);
       throw new Error(`Failed to update instance: ${updateError.message}`);
     }
 
     // Update webhook URL on Wasender
     const webhookUrl = `${supabaseUrl}/functions/v1/wasender-webhook/${instance_id}`;
     console.log(`Updating webhook URL to: ${webhookUrl}`);
 
     const webhookResponse = await fetch(
       `${WASENDER_API_URL}/whatsapp-sessions/${session_id}`,
       {
         method: 'PUT',
         headers: {
           'Authorization': `Bearer ${wasenderToken}`,
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           webhook_url: webhookUrl,
           webhook_enabled: true,
           webhook_events: ['messages.received', 'messages.upsert', 'messages.update', 'session.status', 'qrcode.updated']
         }),
       }
     );
 
     if (!webhookResponse.ok) {
       const errorText = await webhookResponse.text();
       console.error('Webhook update error:', errorText);
       // Don't fail - session is linked, webhook can be fixed later
     } else {
       console.log('Webhook updated successfully');
     }
 
     // Clear this session from any other instances
     const { data: cleared } = await supabase
       .from('whatsapp_instances')
       .update({ 
         session_id: null, 
         wasender_session_id: null,
         status: 'disconnected'
       })
       .eq('session_id', session_id.toString())
       .neq('id', instance_id)
       .select('id, name');
 
     console.log('Cleared duplicates:', cleared);
 
     return new Response(
       JSON.stringify({
         success: true,
         message: 'Session linked successfully',
         instance_id,
         session_id,
         phone_number: phoneNumber,
         status: sessionStatus,
         webhook_url: webhookUrl,
         duplicates_cleared: cleared?.length || 0
       }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error: unknown) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error('Error in admin-link-session:', errorMessage);
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });