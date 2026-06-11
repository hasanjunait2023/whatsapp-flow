import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  ExternalLink, 
  Phone,
  Mail,
  Building2,
  Calendar,
  BarChart3,
  CreditCard,
  HelpCircle,
  Shield,
  Activity,
  Key
} from 'lucide-react';
import { format } from 'date-fns';
import { useCustomerDetails } from '@/hooks/useCustomerDetails';
import { OverviewTab } from './customer-detail/OverviewTab';
import { ActivityLogTab } from './customer-detail/ActivityLogTab';
import { UsageStatsTab } from './customer-detail/UsageStatsTab';
import { PaymentsTab } from './customer-detail/PaymentsTab';
import { SupportTab } from './customer-detail/SupportTab';
import { AuditLogTab } from './customer-detail/AuditLogTab';
import { ResetPasswordDialog } from './customer-detail/ResetPasswordDialog';
import type { AdminCustomer } from '@/hooks/useAdminCustomers';

interface CustomerDetailSheetProps {
  customer: AdminCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailSheet({ customer, open, onOpenChange }: CustomerDetailSheetProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const { details, loading, error } = useCustomerDetails(customer?.id || null);

  const handleMessageCustomer = () => {
    if (customer?.phone_number) {
      // Navigate to admin inbox with phone number
      navigate(`/admin/inbox?phone=${encodeURIComponent(customer.phone_number)}`);
      onOpenChange(false);
    }
  };

  const handleViewWorkspace = () => {
    if (customer?.id) {
      // This could open in a new tab or navigate to impersonate
      window.open(`/dashboard?tenant=${customer.id}`, '_blank');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b shrink-0">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={customer?.avatar_url || ''} />
              <AvatarFallback className="text-lg">
                {customer?.full_name?.charAt(0) || customer?.email?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl truncate">
                {customer?.full_name || 'Unknown Customer'}
              </SheetTitle>
              <div className="space-y-1 mt-1">
                {customer?.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </p>
                )}
                {customer?.phone_number && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {customer.phone_number}
                  </p>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {customer?.tenant_name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Joined {customer?.created_at ? format(new Date(customer.created_at), 'MMMM d, yyyy') : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button 
              size="sm" 
              onClick={handleMessageCustomer}
              disabled={!customer?.phone_number}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message on WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewWorkspace}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Workspace
            </Button>
            {customer?.phone_number && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`tel:${customer.phone_number}`, '_self')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setResetPasswordOpen(true)}
              disabled={!details?.owner_id}
            >
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          </div>
        </SheetHeader>

        {/* Reset Password Dialog */}
        <ResetPasswordDialog
          open={resetPasswordOpen}
          onOpenChange={setResetPasswordOpen}
          userId={details?.owner_id || null}
          userEmail={customer?.email || null}
          userName={customer?.full_name || null}
        />

        {/* Tabs */}
        <div className="flex-1 overflow-hidden mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start overflow-x-auto shrink-0">
              <TabsTrigger value="overview" className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Usage
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                Support
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Audit
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4">
              {loading ? (
                <div className="space-y-4 p-1">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-destructive">{error}</p>
                </div>
              ) : details ? (
                <>
                  <TabsContent value="overview" className="mt-0 p-1">
                    <OverviewTab details={details} />
                  </TabsContent>
                  <TabsContent value="activity" className="mt-0 p-1">
                    <ActivityLogTab activities={details.activities} />
                  </TabsContent>
                  <TabsContent value="usage" className="mt-0 p-1">
                    <UsageStatsTab 
                      usageStats={details.usage_stats} 
                      totalMessages={details.message_count} 
                    />
                  </TabsContent>
                  <TabsContent value="payments" className="mt-0 p-1">
                    <PaymentsTab 
                      payments={details.payments} 
                      totalPaid={details.total_paid} 
                    />
                  </TabsContent>
                  <TabsContent value="support" className="mt-0 p-1">
                    <SupportTab 
                      tickets={details.tickets} 
                      tenantId={details.id} 
                    />
                  </TabsContent>
                  <TabsContent value="audit" className="mt-0 p-1">
                    <AuditLogTab auditLogs={details.audit_logs} />
                  </TabsContent>
                </>
              ) : null}
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
