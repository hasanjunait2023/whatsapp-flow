import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wc-webhook-signature, x-wc-webhook-topic",
};

interface WooOrderItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  price: string;
  total: string;
  sku: string;
}

interface WooOrder {
  id: number;
  status: string;
  currency: string;
  total: string;
  subtotal?: string;
  discount_total: string;
  shipping_total: string;
  total_tax: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: WooOrderItem[];
  date_created: string;
  payment_method: string;
  payment_method_title: string;
  customer_note: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tenant from query params or headers
    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing tenant_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify tenant and get webhook secret
    const { data: integration, error: integrationError } = await supabase
      .from("woocommerce_integrations")
      .select("id, webhook_secret, sync_orders_enabled, store_url")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration) {
      console.error("Integration not found:", integrationError);
      return new Response(
        JSON.stringify({ error: "WooCommerce integration not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!integration.sync_orders_enabled) {
      return new Response(
        JSON.stringify({ error: "Order sync is not enabled for this integration" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get webhook topic
    const topic = req.headers.get("x-wc-webhook-topic");
    console.log("Webhook topic:", topic);

    // Parse the WooCommerce order payload
    const wooOrder: WooOrder = await req.json();
    console.log("Received WooCommerce order:", wooOrder.id);

    // Check if order already exists
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("woo_order_id", wooOrder.id)
      .single();

    if (existingOrder) {
      // Update existing order status
      const status = mapWooStatusToLocal(wooOrder.status);
      const paymentStatus = wooOrder.status === "completed" || wooOrder.status === "processing" 
        ? "paid" 
        : wooOrder.status === "pending" ? "pending" : "unpaid";

      await supabase
        .from("orders")
        .update({
          status,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOrder.id);

      return new Response(
        JSON.stringify({ success: true, action: "updated", order_id: existingOrder.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    const phoneNumber = formatPhoneNumber(wooOrder.billing.phone);

    // Find or create contact
    let contactId: string | null = null;
    if (phoneNumber) {
      const { data: existingContact } = await supabase
        .from("contacts")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("phone_number", phoneNumber)
        .single();

      if (existingContact) {
        contactId = existingContact.id;
      }
    }

    // Generate order number
    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    const orderNumber = `WOO-${String((orderCount || 0) + 1).padStart(6, "0")}`;

    // Map WooCommerce status to local status
    const status = mapWooStatusToLocal(wooOrder.status);
    const paymentStatus = wooOrder.status === "completed" || wooOrder.status === "processing" 
      ? "paid" 
      : wooOrder.status === "pending" ? "pending" : "unpaid";

    // Calculate subtotal from items if not provided
    const subtotal = wooOrder.subtotal 
      ? parseFloat(wooOrder.subtotal) 
      : wooOrder.line_items.reduce((sum, item) => sum + parseFloat(item.total), 0);

    // Create order
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        order_number: orderNumber,
        woo_order_id: wooOrder.id,
        source: "woocommerce",
        customer_name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`.trim(),
        customer_email: wooOrder.billing.email,
        customer_phone: phoneNumber,
        status,
        payment_status: paymentStatus,
        currency: wooOrder.currency || "BDT",
        subtotal,
        discount_amount: parseFloat(wooOrder.discount_total) || 0,
        shipping_amount: parseFloat(wooOrder.shipping_total) || 0,
        tax_amount: parseFloat(wooOrder.total_tax) || 0,
        total: parseFloat(wooOrder.total),
        notes: wooOrder.customer_note || null,
        billing_address: {
          name: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`.trim(),
          address_1: wooOrder.billing.address_1,
          address_2: wooOrder.billing.address_2,
          city: wooOrder.billing.city,
          state: wooOrder.billing.state,
          postcode: wooOrder.billing.postcode,
          country: wooOrder.billing.country,
        },
        shipping_address: {
          name: `${wooOrder.shipping.first_name} ${wooOrder.shipping.last_name}`.trim(),
          address_1: wooOrder.shipping.address_1,
          address_2: wooOrder.shipping.address_2,
          city: wooOrder.shipping.city,
          state: wooOrder.shipping.state,
          postcode: wooOrder.shipping.postcode,
          country: wooOrder.shipping.country,
        },
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw orderError;
    }

    // Create order items
    const orderItems = wooOrder.line_items.map((item) => ({
      order_id: newOrder.id,
      product_name: item.name,
      product_sku: item.sku || null,
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      total: parseFloat(item.total),
      notes: item.variation_id ? `Variation ID: ${item.variation_id}` : null,
    }));

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
      }
    }

    // Log journey event if contact exists
    if (contactId) {
      await supabase.from("customer_journey_events").insert({
        tenant_id: tenantId,
        contact_id: contactId,
        event_type: "woocommerce_order",
        event_category: "order",
        title: "WooCommerce Order Placed",
        description: `Order ${orderNumber} received from WooCommerce store`,
        metadata: {
          order_id: newOrder.id,
          woo_order_id: wooOrder.id,
          order_number: orderNumber,
          total: wooOrder.total,
          currency: wooOrder.currency,
          items_count: wooOrder.line_items.length,
        },
      });
    }

    // Automatically check purchase behavior via BDCourier API
    if (phoneNumber) {
      try {
        const bdcourierApiKey = Deno.env.get("BDCOURIER_API_KEY");
        if (bdcourierApiKey) {
          // Format phone for BDCourier API (local format without +)
          let checkPhone = phoneNumber.replace(/\D/g, "");
          if (checkPhone.startsWith("880")) {
            checkPhone = "0" + checkPhone.substring(3);
          }

          const checkResponse = await fetch("https://api.bdcourier.com/courier-check", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${bdcourierApiKey}`,
            },
            body: JSON.stringify({ phone: checkPhone }),
          });

          if (checkResponse.ok) {
            const checkData = await checkResponse.json();
            console.log("BDCourier check result:", checkData);

            // Calculate risk level
            const successRate = checkData.summary?.success_rate || 0;
            const totalDeliveries = checkData.summary?.total || 0;
            let riskLevel = "medium"; // default for new customers
            
            if (totalDeliveries > 0) {
              if (successRate >= 80) {
                riskLevel = "low";
              } else if (successRate >= 50) {
                riskLevel = "medium";
              } else {
                riskLevel = "high";
              }
            }

            // Store in purchase_behavior_checks
            await supabase
              .from("purchase_behavior_checks")
              .upsert({
                tenant_id: tenantId,
                contact_id: contactId || null,
                phone_number: checkPhone,
                risk_level: riskLevel,
                total_deliveries: totalDeliveries,
                successful_deliveries: checkData.summary?.success || 0,
                cancelled_deliveries: checkData.summary?.cancel || 0,
                returned_deliveries: checkData.summary?.return || 0,
                courier_breakdown: checkData.couriers || {},
                raw_response: checkData,
                checked_at: new Date().toISOString(),
              }, { onConflict: 'phone_number' });

            console.log("Purchase behavior stored for:", checkPhone);
          }
        }
      } catch (checkError) {
        console.warn("Failed to check purchase behavior:", checkError);
        // Don't fail the order creation if behavior check fails
      }
    }

    console.log("Order created successfully:", newOrder.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action: "created", 
        order_id: newOrder.id,
        order_number: orderNumber
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function mapWooStatusToLocal(wooStatus: string): string {
  const statusMap: Record<string, string> = {
    "pending": "pending",
    "processing": "confirmed",
    "on-hold": "pending",
    "completed": "delivered",
    "cancelled": "cancelled",
    "refunded": "cancelled",
    "failed": "cancelled",
  };
  return statusMap[wooStatus] || "pending";
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  // Handle Bangladesh phone numbers
  if (cleaned.startsWith("880")) {
    cleaned = "+" + cleaned;
  } else if (cleaned.startsWith("0")) {
    cleaned = "+88" + cleaned;
  } else if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = "+88" + (cleaned.startsWith("0") ? cleaned : "0" + cleaned);
  }
  return cleaned;
}
