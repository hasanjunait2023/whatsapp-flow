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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse the webhook payload
    const webhookData = await req.json();
    console.log("UddoktaPay webhook received:", webhookData);

    const {
      invoice_id,
      status,
      transaction_id,
      amount,
      fee,
      charged_amount,
      payment_method,
      sender_number,
      metadata,
    } = webhookData;

    if (!invoice_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Invoice ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the payment record
    const { data: paymentData, error: paymentFetchError } = await supabase
      .from("payments")
      .select("*")
      .eq("uddoktapay_invoice_id", invoice_id)
      .single();

    if (paymentFetchError || !paymentData) {
      console.error("Payment not found for invoice:", invoice_id);
      return new Response(
        JSON.stringify({ success: false, error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate processing (idempotency)
    if (paymentData.status === "verified" && status === "COMPLETED") {
      console.log("Payment already verified, skipping duplicate webhook");
      return new Response(
        JSON.stringify({ success: true, message: "Already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isCompleted = status === "COMPLETED";

    // Update payment record
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: isCompleted ? "verified" : paymentData.status === "verified" ? "verified" : "pending",
        verified_at: isCompleted ? new Date().toISOString() : paymentData.verified_at,
        transaction_id: transaction_id || sender_number || paymentData.transaction_id,
        gateway_response: webhookData,
        notes: `${paymentData.notes || ""} | Webhook: ${status} | Method: ${payment_method || "unknown"}`,
      })
      .eq("id", paymentData.id);

    if (updateError) {
      console.error("Error updating payment:", updateError);
      throw updateError;
    }

    // If completed, update subscription order
    if (isCompleted && paymentData.subscription_id) {
      const { error: orderUpdateError } = await supabase
        .from("subscription_orders")
        .update({
          status: "paid",
          verified_at: new Date().toISOString(),
          transaction_id: transaction_id || sender_number,
        })
        .eq("id", paymentData.subscription_id);

      if (orderUpdateError) {
        console.error("Error updating subscription order:", orderUpdateError);
      }

      console.log("Payment and order updated successfully via webhook");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
