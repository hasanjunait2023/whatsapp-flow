import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BDCourierResponse {
  status: "success" | "error";
  data?: {
    phone: string;
    couriers?: Array<{
      name: string;
      logo: string;
      total?: number;
      success?: number;
      cancel?: number;
      return?: number;
      pending?: number;
    }>;
    total_parcel?: number;
    successful_delivery?: number;
    cancelled?: number;
    returned?: number;
    risk_level?: "low" | "medium" | "high";
    rating?: number;
  };
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Create client with anon key for user auth validation
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // CRITICAL: Use getClaims for Lovable Cloud ES256 token validation
    const { data: claimsData, error: authError } = await supabaseAuth.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Create service role client for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phoneNumber, tenantId, contactId, forceRefresh } = await req.json();

    if (!phoneNumber || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing phoneNumber or tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize for caching (DB uses 880xxxxxxxxxx)
    const formattedPhone = formatPhoneForAPI(phoneNumber);
    // Format for BDCourier API (docs expect 017xxxxxxxx)
    const apiPhone = formatPhoneForBDCourierAPI(phoneNumber);

    // Check for cached result if not forcing refresh
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("purchase_behavior_checks")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("phone_number", formattedPhone)
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        // Check if cache is less than 24 hours old
        const cacheAge = Date.now() - new Date(cached.checked_at).getTime();
        const cacheValidHours = 24;
        
        if (cacheAge < cacheValidHours * 60 * 60 * 1000) {
          console.log("Returning cached result for:", formattedPhone);
          return new Response(
            JSON.stringify({
              success: true,
              data: formatCachedResponse(cached),
              cached: true,
              cached_at: cached.checked_at,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Call BDCourier API
    // API Key stored in BDCOURIER_API_KEY secret
    const BDCOURIER_API_KEY = (Deno.env.get("BDCOURIER_API_KEY") || "").trim();
    
    if (!BDCOURIER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "BDCourier API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking purchase behavior for:", formattedPhone, "(apiPhone:", apiPhone, ")");

    const apiResponse = await fetch("https://api.bdcourier.com/courier-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${BDCOURIER_API_KEY}`,
      },
      body: JSON.stringify({ phone: apiPhone }),
    });

    if (!apiResponse.ok) {
      // Capture API error body for debugging
      const apiErrorText = await apiResponse.text().catch(() => "");
      console.error("BDCourier API error:", apiResponse.status, apiErrorText);

      // Try to extract a human-friendly message from the API response
      let apiMessage = `BDCourier API error (${apiResponse.status})`;
      try {
        const parsed = JSON.parse(apiErrorText);
        if (typeof parsed?.message === "string" && parsed.message.trim()) {
          apiMessage = parsed.message.trim();
        } else if (typeof parsed?.error === "string" && parsed.error.trim()) {
          apiMessage = parsed.error.trim();
        }
      } catch {
        // ignore JSON parse errors
      }

      // If API call fails, try to return cached data if available
      const { data: fallbackCache } = await supabase
        .from("purchase_behavior_checks")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("phone_number", formattedPhone)
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();

      if (fallbackCache) {
        return new Response(
          JSON.stringify({
            success: true,
            data: formatCachedResponse(fallbackCache),
            cached: true,
            cached_at: fallbackCache.checked_at,
            api_error: "API temporarily unavailable, showing cached data",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

       // No cache available: return a non-fatal response so the UI can show the message
       // (avoids blank screen / unhandled non-2xx errors on the client)
       return new Response(
         JSON.stringify({
           success: false,
           error: apiMessage,
           api_status: apiResponse.status,
         }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
    }

    const courierData: BDCourierResponse = await apiResponse.json();
    console.log("BDCourier API response:", courierData);

    if (courierData.status !== "success" || !courierData.data) {
      // No data found for this number - create a "new customer" response
      const newCustomerData = {
        tenant_id: tenantId,
        contact_id: contactId || null,
        phone_number: formattedPhone,
        risk_level: "medium", // New customers get medium risk
        customer_rating: null,
        total_deliveries: 0,
        successful_deliveries: 0,
        cancelled_deliveries: 0,
        returned_deliveries: 0,
        courier_stats: {},
        raw_response: courierData,
        checked_by: userId,
        checked_at: new Date().toISOString(),
      };

      const { error: newCustomerInsertError } = await supabase.from("purchase_behavior_checks").insert(newCustomerData);
      
      if (newCustomerInsertError) {
        console.error("Failed to cache new customer behavior:", newCustomerInsertError);
      }

      // Log journey event for new customer check too
      if (contactId) {
        await supabase.from("customer_journey_events").insert({
          tenant_id: tenantId,
          contact_id: contactId,
          event_type: "behavior_check",
          event_category: "system",
          title: "Purchase Behavior Checked",
          description: `Risk level: MEDIUM | New customer (no delivery history)`,
          metadata: {
            risk_level: "medium",
            total_deliveries: 0,
            success_rate: "0.0",
            is_new_customer: true,
            checked_by: userId,
          },
          created_by: userId,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            phoneNumber: formattedPhone,
            riskLevel: "medium",
            customerRating: null,
            totalDeliveries: 0,
            successfulDeliveries: 0,
            cancelledDeliveries: 0,
            returnedDeliveries: 0,
            successRate: 0,
            courierBreakdown: {},
            isNewCustomer: true,
          },
          cached: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse courier data into breakdown and totals
    // API returns object with courier names as keys (pathao, steadfast, redx, etc.)
    // Each courier has: name, logo, total_parcel, success_parcel, cancelled_parcel, success_ratio
    // Plus a summary object with aggregated totals
    const data = courierData.data as Record<string, any>;
    const courierBreakdown: Record<string, { total: number; success: number; cancel: number; return: number }> = {};
    
    // Get totals from summary if available
    const summary = data.summary || {};
    let totalParcel = summary.total_parcel || 0;
    let successfulDelivery = summary.success_parcel || 0;
    let cancelled = summary.cancelled_parcel || 0;
    let returned = 0; // API doesn't distinguish returned from cancelled
    
    // Parse individual courier stats
    const courierKeys = ['pathao', 'steadfast', 'redx', 'paperfly', 'parceldex', 'carrybee', 'sundarban', 'e-courier'];
    courierKeys.forEach((key) => {
      const courier = data[key];
      if (courier && courier.total_parcel > 0) {
        courierBreakdown[courier.name || key] = {
          total: courier.total_parcel || 0,
          success: courier.success_parcel || 0,
          cancel: courier.cancelled_parcel || 0,
          return: 0, // API doesn't track returns separately
        };
      }
    });
    
    // If no summary, aggregate from individual couriers
    if (!summary.total_parcel && Object.keys(courierBreakdown).length > 0) {
      totalParcel = 0;
      successfulDelivery = 0;
      cancelled = 0;
      Object.values(courierBreakdown).forEach((stats) => {
        totalParcel += stats.total;
        successfulDelivery += stats.success;
        cancelled += stats.cancel;
      });
    }
    // Calculate success rate using aggregated values
    const successRate = totalParcel > 0 
      ? (successfulDelivery / totalParcel) * 100 
      : 0;

    // Determine risk level based on success rate
    let riskLevel: "low" | "medium" | "high" = data.risk_level || "medium";
    if (!data.risk_level && totalParcel > 0) {
      if (successRate >= 80) riskLevel = "low";
      else if (successRate >= 50) riskLevel = "medium";
      else riskLevel = "high";
    }

    // Store the result
    const behaviorData = {
      tenant_id: tenantId,
      contact_id: contactId || null,
      phone_number: formattedPhone,
      risk_level: riskLevel,
      customer_rating: data.rating || null,
      total_deliveries: totalParcel,
      successful_deliveries: successfulDelivery,
      cancelled_deliveries: cancelled,
      returned_deliveries: returned,
      courier_stats: courierBreakdown,
      raw_response: courierData,
      checked_by: userId,
      checked_at: new Date().toISOString(),
    };

    // Insert new record (history-friendly approach - UI fetches latest via ORDER BY checked_at DESC)
    const { error: insertError } = await supabase
      .from("purchase_behavior_checks")
      .insert(behaviorData);

    if (insertError) {
      console.error("Failed to cache purchase behavior:", insertError);
      // Continue to return success response - data still returned to user
    }

    // Log a journey event if we have a contact_id
    if (contactId) {
      await supabase.from("customer_journey_events").insert({
        tenant_id: tenantId,
        contact_id: contactId,
        event_type: "behavior_check",
        event_category: "system",
        title: "Purchase Behavior Checked",
        description: `Risk level: ${riskLevel.toUpperCase()} | ${totalParcel} total deliveries`,
        metadata: {
          risk_level: riskLevel,
          total_deliveries: totalParcel,
          success_rate: successRate.toFixed(1),
          checked_by: userId,
        },
        created_by: userId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          phoneNumber: formattedPhone,
          riskLevel: riskLevel,
          customerRating: data.rating || null,
          totalDeliveries: totalParcel,
          successfulDeliveries: successfulDelivery,
          cancelledDeliveries: cancelled,
          returnedDeliveries: returned,
          successRate,
          courierBreakdown: courierBreakdown,
          isNewCustomer: totalParcel === 0,
        },
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error checking purchase behavior:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatPhoneForAPI(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // Remove leading + if present after cleaning
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle Bangladesh numbers
  if (cleaned.startsWith("880")) {
    return cleaned;
  } else if (cleaned.startsWith("0")) {
    return "880" + cleaned.substring(1);
  } else if (cleaned.length === 10) {
    return "880" + cleaned;
  }
  
  return cleaned;
}

function formatPhoneForBDCourierAPI(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // BDCourier docs expect local BD format (e.g., 017xxxxxxxx)
  if (cleaned.startsWith("880")) {
    // 88017xxxxxxxx -> 017xxxxxxxx
    return "0" + cleaned.substring(3);
  }

  if (cleaned.startsWith("0")) {
    return cleaned;
  }

  // 10-digit without leading 0 (e.g., 17xxxxxxxx) -> 017xxxxxxxx
  if (cleaned.length === 10) {
    return "0" + cleaned;
  }

  return cleaned;
}

function formatCachedResponse(cached: any) {
  const successRate = cached.total_deliveries > 0 
    ? (cached.successful_deliveries / cached.total_deliveries) * 100 
    : 0;

  return {
    phoneNumber: cached.phone_number,
    riskLevel: cached.risk_level,
    customerRating: cached.customer_rating,
    totalDeliveries: cached.total_deliveries,
    successfulDeliveries: cached.successful_deliveries,
    cancelledDeliveries: cached.cancelled_deliveries,
    returnedDeliveries: cached.returned_deliveries,
    successRate,
    courierBreakdown: cached.courier_stats || {},
    isNewCustomer: cached.total_deliveries === 0,
    checkedAt: cached.checked_at,
  };
}
