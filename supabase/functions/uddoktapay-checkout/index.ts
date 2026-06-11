import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  tenant_id: string;
  plan_id: string;
  amount: number;
  billing_cycle: "monthly" | "yearly";
  order_type: "subscription" | "renewal";
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const UDDOKTAPAY_API_KEY = Deno.env.get("UDDOKTAPAY_API_KEY");
    const UDDOKTAPAY_BASE_URL = Deno.env.get("UDDOKTAPAY_BASE_URL");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!UDDOKTAPAY_API_KEY || !UDDOKTAPAY_BASE_URL) {
      throw new Error("UddoktaPay configuration missing");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: CheckoutRequest = await req.json();
    const {
      tenant_id,
      plan_id,
      amount,
      billing_cycle,
      order_type,
      customer_name,
      customer_email,
      customer_phone,
    } = body;

    // Validate required fields
    if (!tenant_id || !plan_id || !amount || !customer_name || !customer_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get the frontend base URL from request origin or use default
    const origin = req.headers.get("origin") || "https://whataapp.myecomex.com";
    const successUrl = `${origin}/billing/payment-success?order_id=${orderId}`;
    const cancelUrl = `${origin}/billing/payment-cancelled?order_id=${orderId}`;
    const webhookUrl = `${SUPABASE_URL}/functions/v1/uddoktapay-webhook`;

    // Generate order number for subscription_orders
    const orderNumber = `SUB-${Date.now().toString(36).toUpperCase()}`;

    // Create subscription order in database first
    const { data: orderData, error: orderError } = await supabase
      .from("subscription_orders")
      .insert({
        tenant_id,
        plan_id,
        order_number: orderNumber,
        amount,
        billing_cycle,
        status: "pending",
        payment_method: "uddoktapay",
        notes: `Order ID: ${orderId}, Type: ${order_type}`,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating subscription order:", orderError);
      throw new Error("Failed to create order");
    }

    // Create UddoktaPay checkout - metadata should be an object (not stringified)
    const checkoutPayload = {
      full_name: customer_name,
      email: customer_email,
      amount: amount.toString(),
      metadata: {
        order_id: orderId,
        subscription_order_id: orderData.id,
        tenant_id,
        plan_id,
        billing_cycle,
        order_type,
      },
      redirect_url: successUrl,
      cancel_url: cancelUrl,
      webhook_url: webhookUrl,
    };

    // Remove trailing /api from base URL if present to avoid duplication
    const baseUrl = UDDOKTAPAY_BASE_URL.replace(/\/api\/?$/, '');

    console.log("Creating UddoktaPay checkout:", {
      url: `${baseUrl}/api/checkout-v2`,
      payload: checkoutPayload,
    });

    const uddoktaResponse = await fetch(`${baseUrl}/api/checkout-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify(checkoutPayload),
    });

    const uddoktaData = await uddoktaResponse.json();
    console.log("UddoktaPay response:", uddoktaData);

    if (!uddoktaResponse.ok || !uddoktaData.payment_url) {
      // Update order status to failed
      await supabase
        .from("subscription_orders")
        .update({ status: "failed", notes: `Gateway error: ${JSON.stringify(uddoktaData)}` })
        .eq("id", orderData.id);

      throw new Error(uddoktaData.message || "Failed to create payment");
    }

    // Create pending payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      tenant_id,
      subscription_id: orderData.id,
      amount,
      currency: "BDT",
      payment_method: "uddoktapay",
      payment_gateway: "uddoktapay",
      uddoktapay_invoice_id: uddoktaData.invoice_id,
      status: "pending",
      notes: `Order: ${orderId}`,
      gateway_response: uddoktaData,
    });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    }

    // Update subscription order with invoice ID
    await supabase
      .from("subscription_orders")
      .update({
        notes: `Order ID: ${orderId}, Invoice: ${uddoktaData.invoice_id}`,
      })
      .eq("id", orderData.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: uddoktaData.payment_url,
        order_id: orderId,
        invoice_id: uddoktaData.invoice_id,
        subscription_order_id: orderData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
