import { useState, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plan } from '@/hooks/usePlans';
import { usePayments, CreatePaymentInput } from '@/hooks/usePayments';
import { useSubscription } from '@/hooks/useSubscription';
import { useDemoSession } from '@/hooks/useDemoSession';
import { SubscriptionOverview } from '@/components/billing/SubscriptionOverview';
import { RenewalCard } from '@/components/billing/RenewalCard';
import { UsageSummary } from '@/components/billing/UsageSummary';
import { BillingTimeline } from '@/components/billing/BillingTimeline';
import { UpgradePlanSection } from '@/components/billing/UpgradePlanSection';
import { PaymentDialog } from '@/components/billing/PaymentDialog';
import { CryptoPaymentDialog } from '@/components/billing/CryptoPaymentDialog';
import { AiUsageWidget } from '@/components/billing/AiUsageWidget';
import { PaymentHistory } from '@/components/billing/PaymentHistory';
import { SubscriptionOrdersCard } from '@/components/billing/SubscriptionOrdersCard';
import { PlanDetailsCard } from '@/components/billing/PlanDetailsCard';
import { PlanComparisonModal } from '@/components/billing/PlanComparisonModal';
import { DemoSpecialOfferCard } from '@/components/demo/DemoSpecialOfferCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Columns3 } from 'lucide-react';

export default function Billing() {
  const { payments, loading: paymentsLoading, submitPayment } = usePayments();
  const { subscription, plan: currentPlan, refetch } = useSubscription();
  const { isDemoTenant } = useDemoSession();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [cryptoDialogOpen, setCryptoDialogOpen] = useState(false);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const planSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPaymentDialogOpen(true);
  };

  const handleUpgradeClick = () => {
    planSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRenewClick = () => {
    if (currentPlan) {
      // For renewal, use the current plan - cast to Plan with required fields
      setSelectedPlan({
        id: currentPlan.id,
        name: currentPlan.name,
        description: null,
        price_monthly: currentPlan.price_monthly,
        price_yearly: currentPlan.price_yearly,
        max_instances: currentPlan.max_instances,
        max_agents: currentPlan.max_agents,
        max_messages_per_month: currentPlan.max_messages_per_month,
        ai_enabled: currentPlan.ai_enabled,
        is_active: true,
        created_at: new Date().toISOString(),
      });
      setPaymentDialogOpen(true);
    }
  };

  const handleSubmitPayment = async (input: CreatePaymentInput) => {
    try {
      await submitPayment(input);
      toast.success('Payment submitted successfully! We will verify it shortly.');
      refetch();
    } catch (error) {
      toast.error('Failed to submit payment');
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
            <p className="text-muted-foreground">
              Manage your subscription and payments
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setComparisonModalOpen(true)}
            className="gap-2"
          >
            <Columns3 className="h-4 w-4" />
            Compare Plans
          </Button>
        </div>

        {/* Subscription Overview - Hero Card */}
        <SubscriptionOverview 
          onUpgradeClick={handleUpgradeClick}
          onRenewClick={handleRenewClick}
        />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Usage, Orders and Payment History */}
          <div className="lg:col-span-2 space-y-6">
            <UsageSummary onUpgradeClick={handleUpgradeClick} />
            
            <Tabs defaultValue="payments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="payments">Payment History</TabsTrigger>
                <TabsTrigger value="orders">Subscription Orders</TabsTrigger>
              </TabsList>
              <TabsContent value="payments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Your payment submissions and their status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PaymentHistory payments={payments} loading={paymentsLoading} />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="orders" className="mt-4">
                <SubscriptionOrdersCard />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Plan Details, Renewal and Timeline */}
          <div className="space-y-6">
            {/* Demo Special Offer - Show for demo users */}
            {isDemoTenant && <DemoSpecialOfferCard />}
            
            <PlanDetailsCard />
            <AiUsageWidget />
            <RenewalCard onRenewClick={handleRenewClick} />
            <BillingTimeline />
          </div>
        </div>

        {/* Plans Section */}
        <div ref={planSectionRef} id="plans-section">
          <UpgradePlanSection onSelectPlan={handleSelectPlan} />
        </div>
      </div>

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        plan={selectedPlan}
        onSubmit={handleSubmitPayment}
        onCryptoSelect={() => setCryptoDialogOpen(true)}
      />

      <CryptoPaymentDialog
        open={cryptoDialogOpen}
        onOpenChange={setCryptoDialogOpen}
        plan={selectedPlan}
      />

      <PlanComparisonModal
        open={comparisonModalOpen}
        onOpenChange={setComparisonModalOpen}
        onSelectPlan={handleSelectPlan}
      />
    </DashboardLayout>
  );
}
