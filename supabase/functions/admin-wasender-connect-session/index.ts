import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WASENDER_API_URL = 'https://app.wasenderapi.com/api';

/**
 * Admin Connect Session - Proper Wasender 3-Step Flow
 * 
 * This function handles the connect/QR flow for admin WhatsApp instances.
 * It requires session_id to exist (created by admin-wasender-create-session).
 * 
 * Flow:
 * 1. Validate instance exists and has session_id
 * 2. Call Wasender POST /api/whatsapp-sessions/{id}/connect
 * 3. Parse response:
 *    - NEED_SCAN: Return QR code from response
 *    - Already connected: Verify with GET, only mark active if authenticated
 * 4. If no QR in connect response, call GET /api/whatsapp-sessions/{id}/qrcode
 * 5. Save QR to DB and return it
 */
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

    // Get instance from whatsapp_instances
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('id, name, session_id, wasender_session_id, api_key_encrypted, status, tenant_id')
      .eq('id', instance_id)
      .single();

    if (instanceError || !instance) {
      console.error('Instance lookup error:', instanceError);
      throw new Error('Admin instance not found');
    }

    // Verify this belongs to the system tenant
    const { data: systemTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('settings->>is_system_tenant', 'true')
      .single();
    
    if (!systemTenant || instance.tenant_id !== systemTenant.id) {
      throw new Error('Instance does not belong to system tenant');
    }

    // Get session_id - REQUIRED (must be created first via admin-wasender-create-session)
    const sessionId = instance.session_id;
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ 
          error: 'No session_id found. Create the session first using admin-wasender-create-session.',
          needs_create: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Connecting admin session:', sessionId);

    // Update status to connecting
    await supabase
      .from('whatsapp_instances')
      .update({
        status: 'connecting',
        connection_error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', instance_id);

    // Step 1: Call Wasender connect endpoint
    const connectResponse = await fetch(
      `${WASENDER_API_URL}/whatsapp-sessions/${sessionId}/connect`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${wasenderToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    let connectData: any = null;
    let qrCode: string | null = null;

    if (connectResponse.ok) {
      connectData = await connectResponse.json();
      console.log('Connect response:', connectData);

      // Check for QR code in response
      const data = connectData.data || connectData;
      qrCode = data?.qrCode || data?.qr_code || data?.qr;
      
      if (data?.status === 'NEED_SCAN' && qrCode) {
        console.log('Got QR code from connect response');
      }
    } else {
      const errorText = await connectResponse.text();
      console.error('Wasender connect response:', connectResponse.status, errorText);
      
      // Parse error
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // Check if "already connected" - need to verify actual status
      const isAlreadyConnected = 
        errorData?.message?.toLowerCase().includes('already connected') ||
        errorData?.message?.toLowerCase().includes('already initialized');
      
      if (isAlreadyConnected) {
        console.log('Wasender says already connected; verifying actual status...');
        
        // Verify actual session status
        const verifyResult = await verifySessionStatus(wasenderToken, sessionId);
        
        if (verifyResult.isAuthenticated && verifyResult.phoneNumber) {
          console.log('Session verified as authenticated with phone:', verifyResult.phoneNumber);
          
          await supabase
            .from('whatsapp_instances')
            .update({
              status: 'active',
              phone_number: verifyResult.phoneNumber,
              qr_code: null,
              qr_expires_at: null,
              last_connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', instance_id);

          return new Response(
            JSON.stringify({
              message: 'Already connected',
              instance_id,
              status: 'active',
              phone_number: verifyResult.phoneNumber
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Session exists but NOT authenticated - need QR
          console.log('Session exists but not authenticated - fetching QR code');
          // Continue to fetch QR below
        }
      } else {
        // Real error
        await supabase
          .from('whatsapp_instances')
          .update({
            status: 'error',
            connection_error: errorText,
            updated_at: new Date().toISOString()
          })
          .eq('id', instance_id);

        throw new Error(`Failed to connect: ${errorData?.message || errorText}`);
      }
    }

    // Step 2: If no QR from connect, fetch via qrcode endpoint
    if (!qrCode) {
      console.log('Fetching QR code from qrcode endpoint...');
      
      const qrResponse = await fetch(
        `${WASENDER_API_URL}/whatsapp-sessions/${sessionId}/qrcode`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${wasenderToken}`,
            'Accept': 'application/json'
          }
        }
      );

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        console.log('QR response:', qrData);
        
        const data = qrData.data || qrData;
        qrCode = data?.qrCode || data?.qr_code || data?.qr;
      } else {
        const qrErrorText = await qrResponse.text();
        console.error('QR fetch error:', qrResponse.status, qrErrorText);
        
        // Check if session needs to be initialized first
        if (qrResponse.status === 400 || qrErrorText.toLowerCase().includes('not initialized')) {
          return new Response(
            JSON.stringify({ 
              error: 'Session not initialized. Try reconnecting.',
              status: 'error'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Step 3: Save QR and return
    if (qrCode) {
      const expiresAt = new Date(Date.now() + 45 * 1000).toISOString(); // QR expires in 45s
      
      await supabase
        .from('whatsapp_instances')
        .update({
          status: 'disconnected', // awaiting scan
          qr_code: qrCode,
          qr_expires_at: expiresAt,
          connection_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', instance_id);

      return new Response(
        JSON.stringify({
          message: 'QR code ready',
          instance_id,
          status: 'awaiting_scan',
          qr_code: qrCode,
          expires_at: expiresAt
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No QR available - check if already connected
    const finalCheck = await verifySessionStatus(wasenderToken, sessionId);
    
    if (finalCheck.isAuthenticated && finalCheck.phoneNumber) {
      await supabase
        .from('whatsapp_instances')
        .update({
          status: 'active',
          phone_number: finalCheck.phoneNumber,
          qr_code: null,
          qr_expires_at: null,
          last_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', instance_id);

      return new Response(
        JSON.stringify({
          message: 'Already connected',
          instance_id,
          status: 'active',
          phone_number: finalCheck.phoneNumber
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Could not get QR or verify connection
    await supabase
      .from('whatsapp_instances')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('id', instance_id);

    return new Response(
      JSON.stringify({
        message: 'Connection initiated but no QR available yet. Try refreshing.',
        instance_id,
        status: 'pending'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Admin connect session error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Verify session status by fetching session details from Wasender
 */
async function verifySessionStatus(token: string, sessionId: string): Promise<{
  isAuthenticated: boolean;
  phoneNumber: string | null;
  status: string | null;
}> {
  try {
    const response = await fetch(
      `${WASENDER_API_URL}/whatsapp-sessions/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error('Session verify failed:', response.status);
      return { isAuthenticated: false, phoneNumber: null, status: null };
    }

    const data = await response.json();
    const session = data.data || data;
    
    const connectionStatus = session?.status || session?.connection_status;
    const phoneNumber = session?.phone_number || session?.phoneNumber || session?.phone;
    
    console.log('Session verification:', {
      sessionId,
      connectionStatus,
      hasPhone: !!phoneNumber
    });

    // Only authenticated if status is authenticated/connected AND has a phone number
    const isAuthenticated = 
      (connectionStatus === 'authenticated' || connectionStatus === 'connected') &&
      Boolean(phoneNumber && phoneNumber.length > 5);

    return {
      isAuthenticated,
      phoneNumber: phoneNumber || null,
      status: connectionStatus
    };
  } catch (err) {
    console.error('Session verify error:', err);
    return { isAuthenticated: false, phoneNumber: null, status: null };
  }
}
