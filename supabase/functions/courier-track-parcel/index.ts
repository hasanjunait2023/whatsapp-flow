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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { shipment_id } = await req.json();

    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', shipment_id)
      .single();

    if (shipmentError) throw new Error('Shipment not found');

    // Get courier integration
    const { data: integration, error: integrationError } = await supabase
      .from('courier_integrations')
      .select('*')
      .eq('tenant_id', shipment.tenant_id)
      .eq('provider', shipment.courier)
      .single();

    if (integrationError) throw new Error('Courier integration not found');

    let status = shipment.status;
    let trackingData;

    if (shipment.courier === 'steadfast') {
      trackingData = await trackSteadfast(integration, shipment.consignment_id);
      status = mapSteadfastStatus(trackingData.delivery_status);
    } else if (shipment.courier === 'pathao') {
      trackingData = await trackPathao(integration, shipment.consignment_id);
      status = mapPathaoStatus(trackingData.order_status);
    }

    // Update shipment status
    const updateData: any = {
      status,
      courier_response: trackingData,
    };

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipment_id);

    // Update order status if delivered
    if (status === 'delivered') {
      await supabase
        .from('orders')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', shipment.order_id);
    }

    return new Response(JSON.stringify({ status, tracking: trackingData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error tracking parcel:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function trackSteadfast(integration: any, consignmentId: string) {
  const response = await fetch(
    `https://portal.packzy.com/api/v1/status_by_cid/${consignmentId}`,
    {
      headers: {
        'Api-Key': integration.api_key,
        'Secret-Key': integration.api_secret,
      },
    }
  );

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Steadfast API returned an invalid response');
  }

  const data = await response.json();
  return data.delivery_status ? data : { delivery_status: 'unknown', ...data };
}

async function trackPathao(integration: any, consignmentId: string) {
  // Get access token
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
  const accessToken = tokenData.access_token;

  const response = await fetch(
    `https://courier-api-bd.pathao.com/aladdin/api/v1/orders/${consignmentId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  return await response.json();
}

function mapSteadfastStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'booked',
    'delivered_approval_pending': 'in_transit',
    'partial_delivered_approval_pending': 'in_transit',
    'cancelled_approval_pending': 'cancelled',
    'unknown_approval_pending': 'in_transit',
    'delivered': 'delivered',
    'partial_delivered': 'delivered',
    'cancelled': 'cancelled',
    'hold': 'on_hold',
    'in_review': 'in_transit',
    'unknown': 'in_transit',
  };
  return statusMap[status] || 'in_transit';
}

function mapPathaoStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Pending': 'booked',
    'Picked': 'picked_up',
    'In Transit': 'in_transit',
    'Delivered': 'delivered',
    'Partial Delivery': 'delivered',
    'Return': 'returned',
    'Hold': 'on_hold',
    'Exchange': 'in_transit',
  };
  return statusMap[status] || 'in_transit';
}
