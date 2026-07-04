import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, FileText, Building2 } from 'lucide-react';
import { useInvoices, InvoiceSettingsFormData } from '@/hooks/useInvoices';

export function InvoiceSettings() {
  const { settings, settingsLoading, upsertSettings, uploadLogo } = useInvoices();
  const [formData, setFormData] = useState<InvoiceSettingsFormData>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        company_address: settings.company_address || '',
        company_phone: settings.company_phone || '',
        company_email: settings.company_email || '',
        logo_url: settings.logo_url || '',
        tax_id: settings.tax_id || '',
        footer_text: settings.footer_text || '',
        invoice_prefix: settings.invoice_prefix || 'INV-',
        payment_terms: settings.payment_terms || 'Due upon receipt',
        vat_rate: settings.vat_rate || 0,
      });
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await uploadLogo(file);
      setFormData({ ...formData, logo_url: url });
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    await upsertSettings.mutateAsync(formData);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Settings
          </CardTitle>
          <CardDescription>
            Configure your invoice branding and company information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Logo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={formData.logo_url} />
              <AvatarFallback className="bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <Button variant="outline" asChild disabled={uploading}>
                  <span>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload Logo
                  </span>
                </Button>
              </Label>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 2MB. Recommended: 200x200px
              </p>
            </div>
          </div>

          {/* Company Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name || ''}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID / VAT Number</Label>
              <Input
                id="tax_id"
                value={formData.tax_id || ''}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="123-456-789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_phone">Phone</Label>
              <Input
                id="company_phone"
                value={formData.company_phone || ''}
                onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                placeholder="+880 1234 567890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_email">Email</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email || ''}
                onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                placeholder="billing@company.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_address">Company Address</Label>
            <Textarea
              id="company_address"
              value={formData.company_address || ''}
              onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
              placeholder="123 Business Street, City, Country"
              rows={2}
            />
          </div>

          {/* Invoice Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice_prefix">Invoice Number Prefix</Label>
              <Input
                id="invoice_prefix"
                value={formData.invoice_prefix || ''}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                placeholder="INV-"
              />
              <p className="text-xs text-muted-foreground">
                Next invoice: {formData.invoice_prefix}{String(settings?.next_invoice_number || 1).padStart(6, '0')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms || ''}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="Due upon receipt"
              />
              <p className="text-xs text-muted-foreground">
                E.g., "Due upon receipt", "Net 30", "30 days"
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vat_rate">Default VAT Rate (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.vat_rate || 0}
                onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Enter 0 if no VAT/tax applies
              </p>
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={upsertSettings.isPending}
            className="w-full sm:w-auto"
          >
            {upsertSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Invoice Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
