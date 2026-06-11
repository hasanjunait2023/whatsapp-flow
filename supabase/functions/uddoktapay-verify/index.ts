import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Invoice ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verifying payment for invoice:", invoice_id);

    // Remove trailing /api from base URL if present to avoid duplication
    const baseUrl = UDDOKTAPAY_BASE_URL.replace(/\/api\/?$/, '');

    // Verify payment with UddoktaPay
    const verifyResponse = await fetch(`${baseUrl}/api/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify({ invoice_id }),
    });

    const verifyData = await verifyResponse.json();
    console.log("UddoktaPay verify response:", verifyData);

    if (!verifyResponse.ok) {
      throw new Error(verifyData.message || "Verification failed");
    }

    // Find the payment record
    const { data: paymentData, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*, tenants(*)")
      .eq("uddoktapay_invoice_id", invoice_id)
      .single();

    if (paymentFetchError || !paymentData) {
      console.error("Payment not found:", paymentFetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Payment record not found",
          verification_status: verifyData.status 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already processed
    if (paymentData.status === "verified") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already verified",
          status: "verified",
          amount: paymentData.amount,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isCompleted = verifyData.status === "COMPLETED";

    // Update payment record
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: isCompleted ? "verified" : "pending",
        verified_at: isCompleted ? new Date().toISOString() : null,
        transaction_id: verifyData.transaction_id || verifyData.sender_number,
        gateway_response: verifyData,
        notes: `${paymentData.notes || ""} | Gateway: ${verifyData.payment_method || "unknown"} | Status: ${verifyData.status}`,
      })
      .eq("id", paymentData.id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
    }

    // If payment is completed, update subscription order and activate tenant
    if (isCompleted) {
      // Parse metadata to get subscription_order_id
      let subscriptionOrderId = paymentData.subscription_id;
      
      if (subscriptionOrderId) {
        // Update subscription order status
        const { error: orderUpdateError } = await supabase
          .from("subscription_orders")
          .update({
            status: "paid",
            verified_at: new Date().toISOString(),
            transaction_id: verifyData.transaction_id,
          })
          .eq("id", subscriptionOrderId);

        if (orderUpdateError) {
          console.error("Error updating subscription order:", orderUpdateError);
        }
      }

      // The trigger `activate_tenant_on_order_paid` will handle tenant activation
      console.log("Payment verified successfully for tenant:", paymentData.tenant_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: isCompleted ? "verified" : "pending",
        payment_status: verifyData.status,
        amount: paymentData.amount,
        transaction_id: verifyData.transaction_id,
        payment_method: verifyData.payment_method,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
