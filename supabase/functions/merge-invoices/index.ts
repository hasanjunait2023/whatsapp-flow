import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

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

    const { pdf_urls, tenant_id } = await req.json();

    if (!pdf_urls || !Array.isArray(pdf_urls) || pdf_urls.length === 0) {
      throw new Error('No PDF URLs provided');
    }

    if (!tenant_id) {
      throw new Error('No tenant_id provided');
    }

    console.log(`Merging ${pdf_urls.length} PDFs for tenant ${tenant_id}`);

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Fetch and merge each PDF
    for (const url of pdf_urls) {
      try {
        console.log(`Fetching PDF: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Failed to fetch PDF: ${url}, status: ${response.status}`);
          continue;
        }
        
        const pdfBytes = await response.arrayBuffer();
        const pdf = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        pages.forEach(page => mergedPdf.addPage(page));
        console.log(`Added ${pages.length} pages from ${url}`);
      } catch (pdfError) {
        console.error(`Error processing PDF ${url}:`, pdfError);
        // Continue with other PDFs even if one fails
      }
    }

    if (mergedPdf.getPageCount() === 0) {
      throw new Error('No valid PDFs could be merged');
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();

    // Generate a unique filename for the merged PDF
    const timestamp = Date.now();
    const fileName = `${tenant_id}/merged-invoices-${timestamp}.pdf`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, mergedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    console.log(`Merged PDF uploaded: ${urlData.publicUrl}`);

    return new Response(JSON.stringify({ 
      success: true,
      pdf_url: urlData.publicUrl,
      page_count: mergedPdf.getPageCount(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error merging invoices:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
