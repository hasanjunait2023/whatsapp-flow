import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

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

    const { order_id } = await req.json();

    // Get order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        contact:contacts(*)
      `)
      .eq('id', order_id)
      .single();

    if (orderError) throw new Error('Order not found');

    // Get invoice settings
    const { data: settings } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('tenant_id', order.tenant_id)
      .single();

    // Get tenant info as fallback
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', order.tenant_id)
      .single();

    // If an invoice already exists for this order, reuse its invoice number and overwrite the file.
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('tenant_id', order.tenant_id)
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const invoicePrefix = settings?.invoice_prefix || 'INV-';
    const nextNumber = settings?.next_invoice_number || 1;
    const shouldIncrementNextNumber = !existingInvoice?.invoice_number;
    const invoiceNumber = existingInvoice?.invoice_number || `${invoicePrefix}${String(nextNumber).padStart(6, '0')}`;

    // Generate PDF using pdf-lib
    const pdfBytes = await generateInvoicePDF(order, settings, tenant, invoiceNumber);
    
    const fileName = `${order.tenant_id}/${invoiceNumber}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    // Create or update invoice record
    const invoiceWrite = existingInvoice?.id
      ? supabase
          .from('invoices')
          .update({
            pdf_url: urlData.publicUrl,
            total: order.total,
          })
          .eq('id', existingInvoice.id)
          .select()
          .single()
      : supabase
          .from('invoices')
          .insert({
            tenant_id: order.tenant_id,
            order_id: order.id,
            invoice_number: invoiceNumber,
            pdf_url: urlData.publicUrl,
            total: order.total,
          })
          .select()
          .single();

    const { data: invoice, error: invoiceError } = await invoiceWrite;

    if (invoiceError) throw invoiceError;

    // Only increment for brand new invoices
    if (shouldIncrementNextNumber) {
      await supabase
        .from('invoice_settings')
        .upsert({
          tenant_id: order.tenant_id,
          next_invoice_number: nextNumber + 1,
        }, { onConflict: 'tenant_id' });
    }

    return new Response(JSON.stringify({ invoice, pdf_url: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateInvoicePDF(order: any, settings: any, tenant: any, invoiceNumber: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // A4 size in points (595.28 x 841.89)
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  
  // Embed fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  
  // Colors
  const primaryColor = rgb(0.067, 0.094, 0.153); // Dark gray
  const secondaryColor = rgb(0.42, 0.447, 0.502); // Medium gray
  const lightGray = rgb(0.953, 0.957, 0.965); // Light background
  const borderColor = rgb(0.898, 0.906, 0.922);
  
  // Settings
  const companyName = settings?.company_name || tenant?.name || 'Company Name';
  const companyAddress = settings?.company_address || '';
  const companyPhone = settings?.company_phone || '';
  const companyEmail = settings?.company_email || '';
  const taxId = settings?.tax_id || '';
  const paymentTerms = settings?.payment_terms || 'Due upon receipt';
  const vatRate = settings?.vat_rate || 0;
  const footerText = settings?.footer_text || '';
  
  const items = order.items || [];
  
  // Calculate subtotal
  const subtotal = items.reduce((sum: number, item: any) => 
    sum + (item.quantity * item.unit_price) - (item.discount_amount || 0), 0
  );
  
  // Calculate VAT
  const vatAmount = subtotal * (vatRate / 100);
  
  // Format customer address
  let customerAddress = order.shipping_address || '';
  if (typeof customerAddress === 'object' && customerAddress !== null) {
    customerAddress = [
      customerAddress.street,
      customerAddress.city,
      customerAddress.postal_code,
      customerAddress.country,
    ].filter(Boolean).join(', ');
  }

  // Calculate due date
  const invoiceDate = new Date();
  let dueDate = new Date();
  if (paymentTerms.toLowerCase().includes('30')) {
    dueDate.setDate(dueDate.getDate() + 30);
  } else if (paymentTerms.toLowerCase().includes('15')) {
    dueDate.setDate(dueDate.getDate() + 15);
  } else if (paymentTerms.toLowerCase().includes('7')) {
    dueDate.setDate(dueDate.getDate() + 7);
  }

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  const formatCurrency = (amount: number) => {
    return `BDT ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const margin = 50;
  let y = height - margin;
  
  // ===== HEADER =====
  // Company name (left)
  page.drawText(companyName, {
    x: margin,
    y: y,
    size: 20,
    font: helveticaBold,
    color: primaryColor,
  });
  
  // INVOICE title (right)
  const invoiceTitle = 'INVOICE';
  const titleWidth = helveticaBold.widthOfTextAtSize(invoiceTitle, 24);
  page.drawText(invoiceTitle, {
    x: width - margin - titleWidth,
    y: y,
    size: 24,
    font: helveticaBold,
    color: primaryColor,
  });
  
  y -= 20;
  
  // Company details
  const companyDetails = [
    companyAddress,
    companyPhone ? `Tel: ${companyPhone}` : '',
    companyEmail ? `Email: ${companyEmail}` : '',
    taxId ? `Tax ID: ${taxId}` : '',
  ].filter(Boolean);
  
  for (const detail of companyDetails) {
    page.drawText(detail, {
      x: margin,
      y: y,
      size: 9,
      font: helvetica,
      color: secondaryColor,
    });
    y -= 12;
  }
  
  y -= 10;
  
  // Divider line
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 0.5,
    color: borderColor,
  });
  
  y -= 25;
  
  // ===== BILL TO & INVOICE DETAILS =====
  const leftColX = margin;
  const rightColX = 320;
  
  // Bill To header
  page.drawText('BILL TO', {
    x: leftColX,
    y: y,
    size: 9,
    font: helveticaBold,
    color: secondaryColor,
  });
  
  // Invoice Details header
  page.drawText('INVOICE DETAILS', {
    x: rightColX,
    y: y,
    size: 9,
    font: helveticaBold,
    color: secondaryColor,
  });
  
  y -= 15;
  
  // Customer name
  page.drawText(order.customer_name || 'Customer', {
    x: leftColX,
    y: y,
    size: 11,
    font: helveticaBold,
    color: primaryColor,
  });
  
  // Invoice number row
  page.drawText('Invoice Number:', {
    x: rightColX,
    y: y,
    size: 9,
    font: helvetica,
    color: secondaryColor,
  });
  page.drawText(invoiceNumber, {
    x: rightColX + 100,
    y: y,
    size: 9,
    font: helveticaBold,
    color: primaryColor,
  });
  
  y -= 14;
  
  // Customer phone
  if (order.customer_phone) {
    page.drawText(`Phone: ${order.customer_phone}`, {
      x: leftColX,
      y: y,
      size: 9,
      font: helvetica,
      color: secondaryColor,
    });
  }
  
  // Invoice date row
  page.drawText('Invoice Date:', {
    x: rightColX,
    y: y,
    size: 9,
    font: helvetica,
    color: secondaryColor,
  });
  page.drawText(formatDate(invoiceDate), {
    x: rightColX + 100,
    y: y,
    size: 9,
    font: helvetica,
    color: primaryColor,
  });
  
  y -= 14;
  
  // Customer address
  if (customerAddress) {
    const addressLines = wrapText(customerAddress, 35);
    for (const line of addressLines) {
      page.drawText(line, {
        x: leftColX,
        y: y,
        size: 9,
        font: helvetica,
        color: secondaryColor,
      });
      y -= 12;
    }
    y += 12; // Adjust back for right column alignment
  }
  
  // Payment terms row
  page.drawText('Payment Terms:', {
    x: rightColX,
    y: y,
    size: 9,
    font: helvetica,
    color: secondaryColor,
  });
  page.drawText(paymentTerms, {
    x: rightColX + 100,
    y: y,
    size: 9,
    font: helvetica,
    color: primaryColor,
  });
  
  y -= 14;
  
  // Due date row
  page.drawText('Due Date:', {
    x: rightColX,
    y: y,
    size: 9,
    font: helvetica,
    color: secondaryColor,
  });
  page.drawText(formatDate(dueDate), {
    x: rightColX + 100,
    y: y,
    size: 9,
    font: helvetica,
    color: primaryColor,
  });
  
  y -= 14;
  
  // Order number row
  page.drawText('Order Number:', {
    x: rightColX,
    y: y,
    size: 9,
    font: helvetica,
    color: secondaryColor,
  });
  page.drawText(order.order_number, {
    x: rightColX + 100,
    y: y,
    size: 9,
    font: helvetica,
    color: primaryColor,
  });
  
  y -= 30;
  
  // ===== THANK YOU MESSAGE =====
  const thankYouMsg = 'Thank you for your business!';
  const msgWidth = helveticaOblique.widthOfTextAtSize(thankYouMsg, 10);
  const msgX = (width - msgWidth) / 2;
  
  // Background box
  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: width - (margin * 2),
    height: 20,
    color: lightGray,
  });
  
  page.drawText(thankYouMsg, {
    x: msgX,
    y: y + 2,
    size: 10,
    font: helveticaOblique,
    color: secondaryColor,
  });
  
  y -= 35;
  
  // ===== ITEMS TABLE =====
  const tableX = margin;
  const colWidths = vatRate > 0 
    ? { desc: 200, qty: 50, price: 90, vat: 60, total: 95 }
    : { desc: 230, qty: 60, price: 100, vat: 0, total: 105 };
  
  // Table header background
  const tableWidth = width - (margin * 2);
  page.drawRectangle({
    x: tableX,
    y: y - 5,
    width: tableWidth,
    height: 18,
    color: lightGray,
  });
  
  // Table headers
  let colX = tableX + 5;
  page.drawText('DESCRIPTION', { x: colX, y: y, size: 8, font: helveticaBold, color: secondaryColor });
  colX += colWidths.desc;
  page.drawText('QTY', { x: colX, y: y, size: 8, font: helveticaBold, color: secondaryColor });
  colX += colWidths.qty;
  page.drawText('UNIT PRICE', { x: colX, y: y, size: 8, font: helveticaBold, color: secondaryColor });
  colX += colWidths.price;
  if (vatRate > 0) {
    page.drawText('VAT %', { x: colX, y: y, size: 8, font: helveticaBold, color: secondaryColor });
    colX += colWidths.vat;
  }
  page.drawText('TOTAL', { x: colX, y: y, size: 8, font: helveticaBold, color: secondaryColor });
  
  y -= 20;
  
  // Table rows
  for (const item of items) {
    const lineTotal = (item.quantity * item.unit_price) - (item.discount_amount || 0);
    
    // Product name
    let productName = item.product_name || 'Product';
    if (item.variant_name) {
      productName += ` (${item.variant_name})`;
    }
    
    // Wrap long product names
    const nameLines = wrapText(productName, 40);
    
    colX = tableX + 5;
    page.drawText(nameLines[0], { x: colX, y: y, size: 9, font: helvetica, color: primaryColor });
    colX += colWidths.desc;
    page.drawText(String(item.quantity), { x: colX, y: y, size: 9, font: helvetica, color: primaryColor });
    colX += colWidths.qty;
    page.drawText(formatCurrency(item.unit_price), { x: colX, y: y, size: 9, font: helvetica, color: primaryColor });
    colX += colWidths.price;
    if (vatRate > 0) {
      page.drawText(`${vatRate}%`, { x: colX, y: y, size: 9, font: helvetica, color: primaryColor });
      colX += colWidths.vat;
    }
    page.drawText(formatCurrency(lineTotal), { x: colX, y: y, size: 9, font: helvetica, color: primaryColor });
    
    // Additional name lines
    for (let i = 1; i < nameLines.length; i++) {
      y -= 12;
      page.drawText(nameLines[i], { x: tableX + 5, y: y, size: 9, font: helvetica, color: primaryColor });
    }
    
    y -= 15;
    
    // Row separator
    page.drawLine({
      start: { x: tableX, y: y + 5 },
      end: { x: width - margin, y: y + 5 },
      thickness: 0.5,
      color: borderColor,
    });
  }
  
  y -= 20;
  
  // ===== SUMMARY SECTION =====
  const summaryX = 350;
  const valueX = width - margin;
  
  // Subtotal
  page.drawText(vatRate > 0 ? 'Total excl. VAT:' : 'Subtotal:', {
    x: summaryX,
    y: y,
    size: 9,
    font: helvetica,
    color: secondaryColor,
  });
  const subtotalText = formatCurrency(subtotal);
  const subtotalWidth = helvetica.widthOfTextAtSize(subtotalText, 9);
  page.drawText(subtotalText, {
    x: valueX - subtotalWidth,
    y: y,
    size: 9,
    font: helvetica,
    color: primaryColor,
  });
  y -= 14;
  
  // Discount
  if (order.discount_amount && order.discount_amount > 0) {
    page.drawText('Discount:', {
      x: summaryX,
      y: y,
      size: 9,
      font: helvetica,
      color: secondaryColor,
    });
    const discountText = `-${formatCurrency(order.discount_amount)}`;
    const discountWidth = helvetica.widthOfTextAtSize(discountText, 9);
    page.drawText(discountText, {
      x: valueX - discountWidth,
      y: y,
      size: 9,
      font: helvetica,
      color: primaryColor,
    });
    y -= 14;
  }
  
  // Shipping
  if (order.shipping_amount && order.shipping_amount > 0) {
    page.drawText('Shipping:', {
      x: summaryX,
      y: y,
      size: 9,
      font: helvetica,
      color: secondaryColor,
    });
    const shippingText = formatCurrency(order.shipping_amount);
    const shippingWidth = helvetica.widthOfTextAtSize(shippingText, 9);
    page.drawText(shippingText, {
      x: valueX - shippingWidth,
      y: y,
      size: 9,
      font: helvetica,
      color: primaryColor,
    });
    y -= 14;
  }
  
  // VAT
  if (vatRate > 0) {
    page.drawText(`VAT ${vatRate}%:`, {
      x: summaryX,
      y: y,
      size: 9,
      font: helvetica,
      color: secondaryColor,
    });
    const vatText = formatCurrency(vatAmount);
    const vatWidth = helvetica.widthOfTextAtSize(vatText, 9);
    page.drawText(vatText, {
      x: valueX - vatWidth,
      y: y,
      size: 9,
      font: helvetica,
      color: primaryColor,
    });
    y -= 14;
  }
  
  y -= 5;
  
  // Total line separator
  page.drawLine({
    start: { x: summaryX, y: y },
    end: { x: valueX, y: y },
    thickness: 1,
    color: primaryColor,
  });
  
  y -= 15;
  
  // Grand total
  page.drawText('Total Amount Due:', {
    x: summaryX,
    y: y,
    size: 12,
    font: helveticaBold,
    color: primaryColor,
  });
  const totalText = formatCurrency(order.total);
  const totalWidth = helveticaBold.widthOfTextAtSize(totalText, 12);
  page.drawText(totalText, {
    x: valueX - totalWidth,
    y: y,
    size: 12,
    font: helveticaBold,
    color: primaryColor,
  });
  
  // ===== FOOTER =====
  if (footerText) {
    page.drawText(footerText, {
      x: margin,
      y: 40,
      size: 8,
      font: helvetica,
      color: secondaryColor,
    });
  }
  
  // Return PDF bytes
  return await pdfDoc.save();
}

// Helper function to wrap text
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines.length > 0 ? lines : [''];
}
