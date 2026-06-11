import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookParcelRequest {
  order_id: string;
  courier: 'steadfast' | 'pathao';
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city?: string;
  recipient_zone?: string;
  recipient_area?: string;
  weight_kg?: number;
  cod_amount?: number;
  item_description?: string;
  special_instructions?: string;
}

interface BulkRequest {
  parcels: BookParcelRequest[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    
    // Handle bulk requests
    if (body.parcels && Array.isArray(body.parcels)) {
      const results = [];
      for (const parcel of body.parcels as BookParcelRequest[]) {
        try {
          const result = await bookSingleParcel(supabase, parcel);
          results.push({ success: true, order_id: parcel.order_id, ...result });
        } catch (error: any) {
          results.push({ success: false, order_id: parcel.order_id, error: error.message });
        }
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Single parcel booking
    const request = body as BookParcelRequest;
    const result = await bookSingleParcel(supabase, request);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error booking parcel:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function bookSingleParcel(supabase: any, request: BookParcelRequest) {
  // Get order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, contact:contacts(*)')
    .eq('id', request.order_id)
    .single();

  if (orderError) throw new Error('Order not found');

  // Get courier integration
  const { data: integration, error: integrationError } = await supabase
    .from('courier_integrations')
    .select('*')
    .eq('tenant_id', order.tenant_id)
    .eq('provider', request.courier)
    .eq('is_active', true)
    .single();

  if (integrationError || !integration) {
    throw new Error(`${request.courier} integration not configured or inactive`);
  }

  let courierResponse;
  let consignmentId;
  let trackingCode;
  let deliveryFee;

  if (request.courier === 'steadfast') {
    courierResponse = await bookSteadfast(integration, request, order);
    consignmentId = courierResponse.consignment?.consignment_id;
    trackingCode = courierResponse.consignment?.tracking_code;
    deliveryFee = courierResponse.consignment?.cod_charge;
  } else if (request.courier === 'pathao') {
    courierResponse = await bookPathao(integration, request, order);
    consignmentId = courierResponse.data?.consignment_id;
    trackingCode = courierResponse.data?.consignment_id;
    deliveryFee = courierResponse.data?.delivery_fee;
  }

  // Create shipment record
  const { data: shipment, error: shipmentError } = await supabase
    .from('shipments')
    .insert({
      tenant_id: order.tenant_id,
      order_id: request.order_id,
      courier: request.courier,
      consignment_id: consignmentId,
      tracking_code: trackingCode,
      status: 'booked',
      delivery_fee: deliveryFee,
      cod_amount: request.cod_amount,
      pickup_address: integration.default_pickup_address,
      delivery_address: {
        name: request.recipient_name,
        phone: request.recipient_phone,
        address: request.recipient_address,
        city: request.recipient_city,
        zone: request.recipient_zone,
        area: request.recipient_area,
      },
      weight_kg: request.weight_kg,
      item_description: request.item_description,
      special_instructions: request.special_instructions,
      courier_response: courierResponse,
      booked_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (shipmentError) throw shipmentError;

  // Update order with tracking info
  await supabase
    .from('orders')
    .update({
      status: 'processing',
      tracking_number: trackingCode,
      courier: request.courier,
    })
    .eq('id', request.order_id);

  return {
    shipment,
    consignment_id: consignmentId,
    tracking_code: trackingCode,
  };
}

async function bookSteadfast(integration: any, request: BookParcelRequest, order: any) {
  const apiKey = integration.api_key;
  const secretKey = integration.api_secret;
  
  if (!apiKey || !secretKey) {
    throw new Error('Steadfast API Key and Secret Key are required');
  }
  
  const payload = {
    invoice: order.order_number,
    recipient_name: request.recipient_name,
    recipient_phone: request.recipient_phone,
    recipient_address: request.recipient_address,
    cod_amount: request.cod_amount || 0,
    note: request.special_instructions || '',
  };

  console.log('Booking with Steadfast:', { 
    invoice: payload.invoice, 
    recipient: payload.recipient_name,
    apiKeyPrefix: apiKey.substring(0, 8) + '...',
    hasSecretKey: !!secretKey
  });

  const response = await fetch('https://portal.packzy.com/api/v1/create_order', {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Secret-Key': secretKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log('Steadfast response status:', response.status);

  // Check if response is JSON
  const contentType = response.headers.get('content-type');
  const responseText = await response.text();
  
  console.log('Steadfast response content-type:', contentType);
  console.log('Steadfast response body:', responseText.substring(0, 500));
  
  if (!contentType || !contentType.includes('application/json')) {
    // Check for common HTML error patterns
    if (responseText.includes('Server Error') || responseText.includes('<!DOCTYPE')) {
      throw new Error('Steadfast API credentials are invalid or the service is temporarily unavailable. Please verify your API Key and Secret Key from portal.steadfast.com.bd');
    }
    throw new Error('Steadfast API returned an unexpected response');
  }

  const data = JSON.parse(responseText);
  
  if (data.status !== 200) {
    console.error('Steadfast API error:', data);
    throw new Error(data.message || data.errors?.join(', ') || 'Steadfast API error');
  }

  return data;
}

async function bookPathao(integration: any, request: BookParcelRequest, order: any) {
  // First, get access token
  const tokenResponse = await fetch('https://courier-api-bd.pathao.com/aladdin/api/v1/issue-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: integration.api_key,
      client_secret: integration.api_secret,
      grant_type: 'client_credentials',
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get Pathao access token');
  }

  const accessToken = tokenData.access_token;

  const payload = {
    store_id: integration.store_id,
    merchant_order_id: order.order_number,
    recipient_name: request.recipient_name,
    recipient_phone: request.recipient_phone,
    recipient_address: request.recipient_address,
    recipient_city: parseInt(request.recipient_city || '1'),
    recipient_zone: parseInt(request.recipient_zone || '1'),
    recipient_area: parseInt(request.recipient_area || '1'),
    delivery_type: 48, // Standard delivery
    item_type: 2, // Parcel
    special_instruction: request.special_instructions || '',
    item_quantity: 1,
    item_weight: request.weight_kg || 0.5,
    amount_to_collect: request.cod_amount || 0,
    item_description: request.item_description || '',
  };

  const response = await fetch('https://courier-api-bd.pathao.com/aladdin/api/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  
  if (data.type === 'error') {
    throw new Error(data.message || 'Pathao API error');
  }

  return data;
}
