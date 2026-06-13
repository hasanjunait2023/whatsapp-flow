import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { MessageSquare, CalendarClock, Receipt, Columns3, History, ListOrdered } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Plan } from '@/hooks/usePlans';
import { usePayments, CreatePaymentInput } from '@/hooks/usePayments';
import { useSubscription } from '@/hooks/useSubscription';
import { useDemoSession } from '@/hooks/useDemoSession';
import { UsageSummary } from '@/components/billing/UsageSummary';
import { RenewalCard } from '@/components/billing/RenewalCard';
import { BillingTimeline } from '@/components/billing/BillingTimeline';
import { UpgradePlanSection } from '@/components/billing/UpgradePlanSection';
import { PaymentDialog } from '@/components/billing/PaymentDialog';
import { CryptoPaymentDialog } from '@/components/billing/CryptoPaymentDialog';
import { AiUsageWidget } from '@/components/billing/AiUsageWidget';
import { SubscriptionOrdersCard } from '@/components/billing/SubscriptionOrdersCard';
import { PlanDetailsCard } from '@/components/billing/PlanDetailsCard';
import { PlanComparisonModal } from '@/components/billing/PlanComparisonModal';
import { BillingPlanHero } from '@/components/billing/BillingPlanHero';
import { InvoiceTable } from '@/components/billing/InvoiceTable';
import { DemoSpecialOfferCard } from '@/components/demo/DemoSpecialOfferCard';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { toast } from 'sonner';

export default function Billing() {
  const { payments, loading: paymentsLoading, submitPayment } = usePayments();
  const { subscription, usage, plan: currentPlan, loading: subLoading, isActive, isTrialing, isPastDue, isSuspended, daysUntilExpiry, refetch } = useSubscription();
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

  // --- Presentational derivations (no new data sources) ---
  const statusLabel = isSuspended
    ? 'Suspended'
    : isPastDue
      ? 'Past due'
      : isTrialing
        ? 'Trial'
        : isActive
          ? 'Active'
          : 'No plan';

  const messagesUsed = usage?.messages_sent ?? 0;
  const messageLimit = currentPlan?.max_messages_per_month ?? 1000;
  const renewalDate = subscription?.current_period_end ?? null;
  const daysLeft = daysUntilExpiry != null ? Math.max(0, daysUntilExpiry) : 0;
  const verifiedCount = payments.filter((p) => p.status === 'verified').length;

  // Renew surfaces when past-due or within 7 days of period end.
  const showRenew =
    isPastDue ||
    (!!subscription &&
      new Date(subscription.current_period_end) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  const renewalSubtitle = renewalDate
    ? `Renews ${format(new Date(renewalDate), 'MMM d, yyyy')}`
    : 'Manage your subscription and payments';

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Billing</h1>
            <p className="text-sm text-muted-foreground">{renewalSubtitle}</p>
          </div>
          <Button variant="outline" onClick={() => setComparisonModalOpen(true)} className="gap-2">
            <Columns3 className="h-4 w-4" />
            Compare plans
          </Button>
        </header>

        {/* Hero: orange current-plan surface + KPI strip */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12"
        >
          {/* The ONE orange surface */}
          <div className="lg:col-span-5">
            <BillingPlanHero
              planName={currentPlan?.name ?? null}
              priceMonthly={currentPlan?.price_monthly ?? 0}
              used={messagesUsed}
              limit={messageLimit}
              renewalDate={renewalDate}
              statusLabel={statusLabel}
              loading={subLoading}
              onUpgradeClick={handleUpgradeClick}
              onRenewClick={handleRenewClick}
              showRenew={showRenew}
            />
          </div>

          {/* KPI strip — real billing metrics */}
          <div className="grid grid-cols-2 gap-4 md:gap-5 lg:col-span-7 lg:grid-cols-3">
            <m.div variants={staggerItem}>
              <KpiCard
                title="Messages used"
                value={messagesUsed}
                icon={MessageSquare}
                tone="primary"
                trendLabel={`of ${messageLimit.toLocaleString('en-US')} this cycle`}
                loading={subLoading}
              />
            </m.div>
            <m.div variants={staggerItem}>
              <KpiCard
                title="Days left in cycle"
                value={daysLeft}
                icon={CalendarClock}
                tone="info"
                trendLabel={renewalDate ? `until ${format(new Date(renewalDate), 'MMM d')}` : undefined}
                loading={subLoading}
              />
            </m.div>
            <m.div variants={staggerItem} className="col-span-2 lg:col-span-1">
              <KpiCard
                title="Paid invoices"
                value={verifiedCount}
                icon={Receipt}
                tone="success"
                trendLabel={`${payments.length} total`}
                loading={paymentsLoading}
              />
            </m.div>
          </div>
        </m.div>

        {/* Body bento — usage + history (left) · plan/renewal/timeline (right) */}
        <div className="grid grid-cols-1 gap-5 md:gap-6 lg:grid-cols-12">
          <div className="space-y-5 md:space-y-6 lg:col-span-8">
            <UsageSummary onUpgradeClick={handleUpgradeClick} />

            <Tabs defaultValue="payments" className="w-full">
              <TabsList>
                <TabsTrigger value="payments" className="gap-2">
                  <History className="h-4 w-4" />
                  Payment History
                </TabsTrigger>
                <TabsTrigger value="orders" className="gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Subscription Orders
                </TabsTrigger>
              </TabsList>
              <TabsContent value="payments" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InvoiceTable
                      payments={payments}
                      loading={paymentsLoading}
                      onEmptyAction={handleUpgradeClick}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="orders" className="mt-4">
                <SubscriptionOrdersCard />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right rail */}
          <div className="space-y-5 md:space-y-6 lg:col-span-4">
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
      </m.div>

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
