import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';
import type { CompanyBranding } from '@/lib/report-pdf-export';

export function useCompanyBranding() {
  const { currentTenant } = useTenantContext();
  const tenantId = currentTenant?.id;

  const { data: branding, isLoading } = useQuery({
    queryKey: ['company-branding', tenantId],
    queryFn: async (): Promise<CompanyBranding> => {
      if (!tenantId) {
        return { companyName: 'Business Report' };
      }

      // Try to get invoice settings first
      const { data: settings } = await supabase
        .from('invoice_settings')
        .select('company_name, company_address, company_phone, company_email, logo_url')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (settings?.company_name) {
        return {
          companyName: settings.company_name,
          companyAddress: settings.company_address || undefined,
          companyPhone: settings.company_phone || undefined,
          companyEmail: settings.company_email || undefined,
          logoUrl: settings.logo_url || undefined,
        };
      }

      // Fall back to tenant name
      return {
        companyName: currentTenant?.name || 'Business Report',
      };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    branding: branding || { companyName: 'Business Report' },
    isLoading,
  };
}
