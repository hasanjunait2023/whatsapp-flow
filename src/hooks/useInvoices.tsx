import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import { useToast } from '@/hooks/use-toast';

export interface InvoiceSettings {
  id: string;
  tenant_id: string;
  company_name: string | null;
  company_address: string | null;
  company_phone: string | null;
  company_email: string | null;
  logo_url: string | null;
  tax_id: string | null;
  footer_text: string | null;
  invoice_prefix: string;
  next_invoice_number: number;
  payment_terms: string | null;
  vat_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  order_id: string | null;
  invoice_number: string;
  pdf_url: string | null;
  total: number | null;
  sent_via_whatsapp: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface InvoiceSettingsFormData {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  tax_id?: string;
  footer_text?: string;
  invoice_prefix?: string;
  payment_terms?: string;
  vat_rate?: number;
}

export function useInvoices() {
  const { currentTenant } = useTenantContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id;

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['invoice-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      return data as InvoiceSettings | null;
    },
    enabled: !!tenantId,
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!tenantId,
  });

  const upsertSettings = useMutation({
    mutationFn: async (data: InvoiceSettingsFormData) => {
      if (!tenantId) throw new Error('No tenant selected');

      const { data: result, error } = await supabase
        .from('invoice_settings')
        .upsert({
          tenant_id: tenantId,
          ...data,
        }, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-settings', tenantId] });
      toast({ title: 'Invoice settings saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save settings', description: error.message, variant: 'destructive' });
    },
  });

  const generateInvoice = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await supabase.functions.invoke('generate-invoice', {
        body: { order_id: orderId },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
      toast({ title: 'Invoice generated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to generate invoice', description: error.message, variant: 'destructive' });
    },
  });

  const bulkGenerateInvoices = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const results = await Promise.allSettled(
        orderIds.map(orderId =>
          supabase.functions.invoke('generate-invoice', {
            body: { order_id: orderId },
          })
        )
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      return { successful, failed, total: orderIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
      toast({ 
        title: 'Bulk invoice generation complete', 
        description: `${data.successful}/${data.total} invoices generated successfully` 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to generate invoices', description: error.message, variant: 'destructive' });
    },
  });

  // Helper function to open the PDF and trigger the browser print dialog
  // We must print from a same-origin context; using a blob: URL ensures the iframe is same-origin
  // and avoids the cross-origin SecurityError.
  const openPdfForPrint = async (url: string): Promise<void> => {
    // Remove any existing print iframe
    const existingFrame = document.getElementById('invoice-print-frame');
    if (existingFrame) {
      document.body.removeChild(existingFrame);
    }

    let blobUrl: string | null = null;

    const cleanup = (iframe?: HTMLIFrameElement) => {
      try {
        if (iframe && document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      } catch {
        // no-op
      }
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {
          // no-op
        }
        blobUrl = null;
      }
    };

    try {
      // Fetch PDF as blob (no downloads, no popups)
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch PDF');

      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.id = 'invoice-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = '0';
      iframe.src = blobUrl;

      const onError = () => {
        cleanup(iframe);
        toast({
          title: 'Printing blocked',
          description:
            'Your browser/extension blocked loading the PDF for printing (ERR_BLOCKED_BY_CLIENT). Please disable ad-blockers for this site or allow PDF viewing in Chrome settings.',
          variant: 'destructive',
        });
      };

      // Some browsers don’t reliably fire iframe.onerror for blocked requests, so we also use a timeout.
      const errorTimeout = window.setTimeout(onError, 15000);

      iframe.onload = () => {
        window.clearTimeout(errorTimeout);

        // Small delay helps the built-in PDF viewer finish initializing
        window.setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            // Cleanup after the dialog has had time to open
            window.setTimeout(() => cleanup(iframe), 60000);
          } catch (e) {
            console.error('Print error:', e);
            onError();
          }
        }, 300);
      };

      iframe.onerror = () => {
        window.clearTimeout(errorTimeout);
        onError();
      };

      document.body.appendChild(iframe);
    } catch (error) {
      console.error('Error opening PDF for print:', error);
      cleanup();
      toast({
        title: 'Failed to load invoice',
        description: 'Could not load PDF for printing',
        variant: 'destructive',
      });
    }
  };

  const printInvoices = async (orderIds: string[]) => {
    const isPdfUrl = (url?: string | null) =>
      typeof url === 'string' && url.toLowerCase().endsWith('.pdf');

    // Get invoices for the selected orders
    const { data: existingInvoices, error } = await supabase
      .from('invoices')
      .select('*')
      .in('order_id', orderIds)
      .not('pdf_url', 'is', null);

    if (error) {
      toast({ title: 'Failed to fetch invoices', description: error.message, variant: 'destructive' });
      return;
    }

    // Treat legacy .html invoice URLs as missing so we regenerate as PDF
    const existingPdfInvoices = (existingInvoices || []).filter(inv => isPdfUrl(inv.pdf_url));

    const ordersWithPdfInvoices = new Set(existingPdfInvoices.map(inv => inv.order_id));
    const ordersNeedingInvoices = orderIds.filter(id => !ordersWithPdfInvoices.has(id));

    let invoicesToPrint = existingPdfInvoices;

    // If there are orders without PDF invoices, generate them first
    if (ordersNeedingInvoices.length > 0) {
      toast({ title: 'Generating invoices...', description: `Creating ${ordersNeedingInvoices.length} invoice(s)` });
      
      await Promise.allSettled(
        ordersNeedingInvoices.map(orderId =>
          supabase.functions.invoke('generate-invoice', {
            body: { order_id: orderId },
          })
        )
      );

      // Refetch all invoices after generation
      const { data: refreshedInvoices } = await supabase
        .from('invoices')
        .select('*')
        .in('order_id', orderIds)
        .not('pdf_url', 'is', null);

      invoicesToPrint = (refreshedInvoices || []).filter(inv => isPdfUrl(inv.pdf_url));
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
    }

    if (!invoicesToPrint || invoicesToPrint.length === 0) {
      toast({ title: 'No invoices available', description: 'Failed to generate invoices for printing', variant: 'destructive' });
      return;
    }

    // Get all PDF URLs
    const pdfUrls = invoicesToPrint
      .map(inv => inv.pdf_url)
      .filter((url): url is string => !!url);

    if (pdfUrls.length === 0) {
      toast({ title: 'No valid PDF invoices found', variant: 'destructive' });
      return;
    }

    // Single invoice - open print dialog
    if (pdfUrls.length === 1) {
      toast({ title: 'Preparing print...' });
      await openPdfForPrint(pdfUrls[0]);
      toast({ title: 'Print dialog opened' });
      return;
    }

    // Multiple invoices - merge into one PDF
    toast({ title: 'Merging invoices...', description: `Combining ${pdfUrls.length} invoices` });

    try {
      const response = await supabase.functions.invoke('merge-invoices', {
        body: { pdf_urls: pdfUrls, tenant_id: tenantId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { pdf_url } = response.data;
      
      if (!pdf_url) {
        throw new Error('No merged PDF URL returned');
      }

      // Open merged PDF for print
      await openPdfForPrint(pdf_url);
      toast({ 
        title: 'Print dialog opened', 
        description: `${pdfUrls.length} invoices combined` 
      });
    } catch (mergeError: any) {
      console.error('Merge error:', mergeError);
      toast({ 
        title: 'Failed to merge invoices', 
        description: 'Printing invoices separately...', 
        variant: 'destructive' 
      });
      
      // Fallback: print each invoice separately
      for (let i = 0; i < pdfUrls.length; i++) {
        await new Promise(resolve => setTimeout(resolve, i * 1000));
        await openPdfForPrint(pdfUrls[i]);
      }
    }
  };

  const sendInvoiceViaWhatsApp = useMutation({
    mutationFn: async ({ invoiceId, contactId }: { invoiceId: string; contactId: string }) => {
      // First get the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoice.pdf_url) throw new Error('Invoice PDF not generated');

      // Send via WhatsApp
      const response = await supabase.functions.invoke('send-message', {
        body: {
          contact_id: contactId,
          message_type: 'document',
          content: invoice.pdf_url,
          caption: `Invoice ${invoice.invoice_number}`,
        },
      });

      if (response.error) throw new Error(response.error.message);

      // Mark as sent
      await supabase
        .from('invoices')
        .update({ sent_via_whatsapp: true, sent_at: new Date().toISOString() })
        .eq('id', invoiceId);

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', tenantId] });
      toast({ title: 'Invoice sent via WhatsApp' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to send invoice', description: error.message, variant: 'destructive' });
    },
  });

  const uploadLogo = async (file: File): Promise<string> => {
    if (!tenantId) throw new Error('No tenant selected');

    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantId}/invoice-logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('workspace-logos')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('workspace-logos')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  return {
    settings,
    invoices,
    settingsLoading,
    invoicesLoading,
    upsertSettings,
    generateInvoice,
    bulkGenerateInvoices,
    printInvoices,
    sendInvoiceViaWhatsApp,
    uploadLogo,
  };
}
