import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WooProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  images: { src: string; alt: string }[];
  categories: { id: number; name: string }[];
  tags: { id: number; name: string }[];
  status: string;
}

interface WooCategory {
  id: number;
  name: string;
  description: string;
  parent: number;
  image: { src: string } | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, tenantId, integrationId } = await req.json();

    if (!tenantId) {
      throw new Error("Tenant ID required");
    }

    // Fetch integration details
    const { data: integration, error: intError } = await supabaseClient
      .from("woocommerce_integrations")
      .select("*")
      .eq("id", integrationId || "")
      .eq("tenant_id", tenantId)
      .single();

    if (action === "test" || action === "sync") {
      const { storeUrl, consumerKey, consumerSecret } = await req.json();
      
      const url = storeUrl || integration?.store_url;
      const key = consumerKey || integration?.consumer_key_encrypted;
      const secret = consumerSecret || integration?.consumer_secret_encrypted;

      if (!url || !key || !secret) {
        throw new Error("Missing WooCommerce credentials");
      }

      // Test connection
      const authString = btoa(`${key}:${secret}`);
      const testResponse = await fetch(`${url}/wp-json/wc/v3/products?per_page=1`, {
        headers: {
          "Authorization": `Basic ${authString}`,
        },
      });

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        throw new Error(`WooCommerce API error: ${testResponse.status} - ${errorText}`);
      }

      if (action === "test") {
        return new Response(
          JSON.stringify({ success: true, message: "Connection successful" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sync products
      if (action === "sync" && integration) {
        // Update sync status
        await supabaseClient
          .from("woocommerce_integrations")
          .update({ sync_status: "syncing", sync_error: null })
          .eq("id", integration.id);

        // Create sync log
        const { data: syncLog } = await supabaseClient
          .from("woocommerce_sync_logs")
          .insert({
            integration_id: integration.id,
            sync_type: "full",
            status: "running",
          })
          .select()
          .single();

        try {
          // Fetch categories first
          const categoriesResponse = await fetch(`${url}/wp-json/wc/v3/products/categories?per_page=100`, {
            headers: { "Authorization": `Basic ${authString}` },
          });
          
          const wooCategories: WooCategory[] = await categoriesResponse.json();
          let categoriesSynced = 0;

          for (const wooCat of wooCategories) {
            // Check if category exists
            const { data: existingCat } = await supabaseClient
              .from("categories")
              .select("id")
              .eq("tenant_id", tenantId)
              .eq("woo_category_id", wooCat.id)
              .single();

            if (existingCat) {
              // Update existing
              await supabaseClient
                .from("categories")
                .update({
                  name: wooCat.name,
                  description: wooCat.description || null,
                  image_url: wooCat.image?.src || null,
                })
                .eq("id", existingCat.id);
            } else {
              // Create new
              await supabaseClient
                .from("categories")
                .insert({
                  tenant_id: tenantId,
                  name: wooCat.name,
                  description: wooCat.description || null,
                  image_url: wooCat.image?.src || null,
                  woo_category_id: wooCat.id,
                });
            }
            categoriesSynced++;
          }

          // Fetch products (paginated)
          let page = 1;
          let productsSynced = 0;
          const errors: any[] = [];

          while (true) {
            const productsResponse = await fetch(
              `${url}/wp-json/wc/v3/products?per_page=100&page=${page}`,
              { headers: { "Authorization": `Basic ${authString}` } }
            );

            const wooProducts: WooProduct[] = await productsResponse.json();
            
            if (!wooProducts.length) break;

            for (const wooProd of wooProducts) {
              try {
                // Find category
                let categoryId = null;
                if (wooProd.categories.length > 0) {
                  const { data: cat } = await supabaseClient
                    .from("categories")
                    .select("id")
                    .eq("tenant_id", tenantId)
                    .eq("woo_category_id", wooProd.categories[0].id)
                    .single();
                  categoryId = cat?.id || null;
                }

                // Check if product exists
                const { data: existingProd } = await supabaseClient
                  .from("products")
                  .select("id")
                  .eq("tenant_id", tenantId)
                  .eq("woo_product_id", wooProd.id)
                  .single();

                const productData = {
                  name: wooProd.name,
                  description: wooProd.short_description || wooProd.description || null,
                  sku: wooProd.sku || null,
                  price: parseFloat(wooProd.price) || 0,
                  compare_at_price: wooProd.regular_price && wooProd.sale_price 
                    ? parseFloat(wooProd.regular_price) 
                    : null,
                  stock_quantity: wooProd.stock_quantity || 0,
                  track_inventory: wooProd.manage_stock,
                  images: wooProd.images.map(img => img.src),
                  tags: wooProd.tags.map(tag => tag.name),
                  is_active: wooProd.status === "publish",
                  category_id: categoryId,
                  woo_last_synced_at: new Date().toISOString(),
                };

                if (existingProd) {
                  await supabaseClient
                    .from("products")
                    .update(productData)
                    .eq("id", existingProd.id);
                } else {
                  await supabaseClient
                    .from("products")
                    .insert({
                      ...productData,
                      tenant_id: tenantId,
                      woo_product_id: wooProd.id,
                    });
                }
                productsSynced++;
              } catch (err: any) {
                errors.push({ product_id: wooProd.id, error: err.message });
              }
            }

            page++;
          }

          // Update sync log
          await supabaseClient
            .from("woocommerce_sync_logs")
            .update({
              status: "completed",
              products_synced: productsSynced,
              categories_synced: categoriesSynced,
              errors,
              completed_at: new Date().toISOString(),
            })
            .eq("id", syncLog.id);

          // Update integration
          await supabaseClient
            .from("woocommerce_integrations")
            .update({
              sync_status: "idle",
              last_sync_at: new Date().toISOString(),
            })
            .eq("id", integration.id);

          return new Response(
            JSON.stringify({
              success: true,
              productsSynced,
              categoriesSynced,
              errors: errors.length,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );

        } catch (syncError: any) {
          // Update on error
          await supabaseClient
            .from("woocommerce_integrations")
            .update({ 
              sync_status: "error", 
              sync_error: syncError.message 
            })
            .eq("id", integration.id);

          if (syncLog) {
            await supabaseClient
              .from("woocommerce_sync_logs")
              .update({
                status: "failed",
                errors: [{ error: syncError.message }],
                completed_at: new Date().toISOString(),
              })
              .eq("id", syncLog.id);
          }

          throw syncError;
        }
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("WooCommerce sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
