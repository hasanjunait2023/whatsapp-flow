import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const digitsOnly = (value: unknown) => (value ?? "").toString().replace(/\D/g, "");

// Compare phone-like strings by checking full match or last 10/11 digits (handles country codes).
const looselySameNumber = (a: string, b: string) => {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const a10 = da.slice(-10);
  const a11 = da.slice(-11);
  const b10 = db.slice(-10);
  const b11 = db.slice(-11);
  return a10 === b10 || a11 === b11 || da.endsWith(b10) || da.endsWith(b11) || db.endsWith(a10) || db.endsWith(a11);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { instance_id } = await req.json();

    if (!instance_id) {
      return new Response(JSON.stringify({ error: "instance_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: instance, error: instanceError } = await supabaseAdmin
      .from("whatsapp_instances")
      .select("id, tenant_id, api_key_encrypted, phone_number")
      .eq("id", instance_id)
      .single();

    if (instanceError || !instance) {
      console.error("Instance fetch error:", instanceError);
      return new Response(JSON.stringify({ error: "Instance not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionApiKey = (instance as any).api_key_encrypted as string | null;
    const myPhoneNumber = (instance as any).phone_number as string | null;
    
    console.log("My phone number from instance:", myPhoneNumber);

    if (!sessionApiKey) {
      return new Response(JSON.stringify({ error: "Instance not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch groups from Wasender API
    const wasenderResponse = await fetch("https://www.wasenderapi.com/api/groups", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${sessionApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!wasenderResponse.ok) {
      const errorText = await wasenderResponse.text();
      console.error("Wasender API error:", errorText);
      return new Response(JSON.stringify({ error: "Failed to fetch groups from Wasender" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wasenderData = await wasenderResponse.json();
    const groups = wasenderData.data || wasenderData || [];
    
    console.log(`Found ${groups.length} groups, fetching metadata for each...`);

    // Load existing values so we don't overwrite admin=true -> false when metadata fetch is rate-limited.
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("whatsapp_groups")
      .select("wa_group_id,is_admin,participant_count,description,invite_link")
      .eq("tenant_id", instance.tenant_id);

    if (existingError) {
      console.error("Failed to load existing whatsapp_groups:", existingError);
    }

    const existingByWaId = new Map<string, any>();
    for (const row of existingRows ?? []) {
      existingByWaId.set((row as any).wa_group_id, row);
    }

    let syncedCount = 0;
    let adminCount = 0;
    let metadataLoggedOnce = false;

    // Wasender metadata endpoint is rate limited (10/min). We rotate which groups get metadata each minute.
    const MAX_METADATA_REQUESTS = 10;
    const minuteBucket = Math.floor(Date.now() / 60000);
    const startIndex = groups.length > 0 ? minuteBucket % groups.length : 0;
    let metadataRequestsUsed = 0;

    for (let idx = 0; idx < groups.length; idx++) {
      const group = groups[(startIndex + idx) % groups.length];
      const existing = existingByWaId.get(group.id) as any | undefined;

      let isAdmin = (existing?.is_admin ?? false) as boolean;
      let participantCount = (existing?.participant_count ?? 0) as number;
      let description = (existing?.description ?? null) as string | null;
      let inviteLink = (existing?.invite_link ?? null) as string | null;

      // Fetch detailed metadata for a limited number of groups to stay under rate limits.
      // Skip if we already know this group is admin.
      if (metadataRequestsUsed < MAX_METADATA_REQUESTS && existing?.is_admin !== true) {
        metadataRequestsUsed++;
        try {
          const metadataResponse = await fetch(
            `https://www.wasenderapi.com/api/groups/${encodeURIComponent(group.id)}/metadata`,
            {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${sessionApiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (metadataResponse.status === 429) {
            const errorText = await metadataResponse.text();
            console.log(`Metadata rate limit hit for ${group.id}: 429 - ${errorText}`);
            // Stop further metadata attempts this run.
          } else if (metadataResponse.ok) {
            const metadataResult = await metadataResponse.json();
            const metadata = metadataResult.data || metadataResult || {};

            // Log first successful metadata for debugging
            if (!metadataLoggedOnce) {
              console.log("=== FIRST GROUP METADATA ===");
              console.log("Instance phone:", myPhoneNumber);
              console.log("Group ID:", group.id);
              console.log("Group Name:", group.subject || group.name);
              console.log("Full metadata:", JSON.stringify(metadata, null, 2));
              if (metadata.participants && metadata.participants.length > 0) {
                console.log(
                  "First 3 participants:",
                  JSON.stringify(metadata.participants.slice(0, 3), null, 2)
                );
              }
              metadataLoggedOnce = true;
            }

            participantCount = (metadata.participants || []).length || metadata.size || 0;
            description = metadata.desc || metadata.description || null;

            if (metadata.inviteCode) {
              inviteLink = `https://chat.whatsapp.com/${metadata.inviteCode}`;
            }

            // Admin detection
            // Method 1: Direct flag
            if (metadata.isAdmin === true || metadata.iAmAdmin === true) {
              isAdmin = true;
              console.log(`Group "${group.subject || group.name}" - Admin via direct flag`);
            }

            // Method 2: Owner fields (often present)
            if (!isAdmin) {
              const myDigits = digitsOnly(myPhoneNumber);
              const myDigitsNoCountry = myDigits.startsWith("880") ? myDigits.slice(3) : myDigits;
              const myDigitsLocal0 = myDigits.startsWith("880") ? `0${myDigits.slice(3)}` : myDigits;
              const variants = [myDigits, myDigitsNoCountry, myDigitsLocal0].filter(Boolean);

              const ownerCandidates = [
                metadata.ownerPn,
                metadata.subjectOwnerPn,
                metadata.descOwnerPn,
              ].filter(Boolean);

              if (variants.length > 0) {
                for (const ownerVal of ownerCandidates) {
                  if (variants.some((v: string) => looselySameNumber(ownerVal, v))) {
                    isAdmin = true;
                    console.log(`Group "${group.subject || group.name}" - Admin via ownerPn`);
                    break;
                  }
                }
              }
            }

            // Method 3: Participants array
            if (!isAdmin && metadata.participants && Array.isArray(metadata.participants)) {
              const myDigits = digitsOnly(myPhoneNumber);
              const myDigitsNoCountry = myDigits.startsWith("880") ? myDigits.slice(3) : myDigits;
              const myDigitsLocal0 = myDigits.startsWith("880") ? `0${myDigits.slice(3)}` : myDigits;
              const variants = [myDigits, myDigitsNoCountry, myDigitsLocal0].filter(Boolean);

              for (const participant of metadata.participants) {
                // IMPORTANT: Wasender returns participants with LID ids; use pn/jid to match phone.
                const candidate = participant.pn || participant.jid || participant.wa_id || participant.id || "";
                const isMe = variants.some((v) => looselySameNumber(candidate, v));

                if (isMe) {
                  const adminStatus = participant.admin;
                  const isSuperAdmin =
                    participant.isSuperAdmin === true ||
                    participant.superAdmin === true ||
                    adminStatus === "superadmin";
                  const isParticipantAdmin =
                    participant.isAdmin === true ||
                    adminStatus === "admin" ||
                    adminStatus === true;

                  console.log(
                    `Found myself in group "${group.subject || group.name}": admin=${adminStatus}, isSuperAdmin=${isSuperAdmin}, isAdmin=${isParticipantAdmin}`
                  );

                  if (isSuperAdmin || isParticipantAdmin) {
                    isAdmin = true;
                    console.log(`Group "${group.subject || group.name}" - I AM ADMIN`);
                  }
                  break;
                }
              }
            }
          } else {
            const errorText = await metadataResponse.text();
            console.log(
              `Metadata fetch failed for ${group.id}: ${metadataResponse.status} - ${errorText}`
            );
          }
        } catch (metadataError) {
          console.error(`Failed to fetch metadata for group ${group.id}:`, metadataError);
        }
      }

      if (isAdmin) adminCount++;

      const { error: upsertError } = await supabaseAdmin
        .from("whatsapp_groups")
        .upsert(
          {
            tenant_id: instance.tenant_id,
            instance_id: instance.id,
            wa_group_id: group.id,
            name: group.subject || group.name || "Unknown Group",
            description,
            invite_link: inviteLink,
            participant_count: participantCount,
            is_admin: isAdmin,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "tenant_id,wa_group_id",
          }
        );

      if (!upsertError) {
        syncedCount++;
      } else {
        console.error("Upsert error for group:", group.id, upsertError);
      }

      // Tiny delay to be gentle on Supabase / Wasender, but we stay under metadata rate limit via MAX_METADATA_REQUESTS.
      await sleep(5);
    }

    console.log(`Sync complete: ${syncedCount} groups synced, ${adminCount} admin groups`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: syncedCount,
        total_groups: groups.length,
        admin_groups: adminCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in group-sync:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
