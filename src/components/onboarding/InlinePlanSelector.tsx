import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanSelectionStep } from './PlanSelectionStep';
import { usePlans, Plan } from '@/hooks/usePlans';
import { useUddoktaPay } from '@/hooks/useUddoktaPay';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InlinePlanSelectorProps {
  businessTypeId?: string | null;
  onPlanSelected?: (plan: Plan) => void;
}

export function InlinePlanSelector({ businessTypeId, onPlanSelected }: InlinePlanSelectorProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { plans } = usePlans(businessTypeId);
  const { initiateCheckout, redirectToPayment, loading: checkoutLoading } = useUddoktaPay();
  const { currentTenant } = useTenant();

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handlePayOnline = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan first');
      return;
    }

    if (!currentTenant) {
      toast.error('No workspace found');
      return;
    }

    setIsProcessing(true);

    try {
      // Update tenant with pending_plan_id
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ pending_plan_id: selectedPlan.id })
        .eq('id', currentTenant.id);

      if (updateError) throw updateError;

      // Initiate checkout
      const result = await initiateCheckout({
        planId: selectedPlan.id,
        amount: selectedPlan.price_monthly,
        billingCycle: 'monthly',
        orderType: 'subscription',
      });

      if (result.success && result.paymentUrl) {
        toast.success('Redirecting to payment gateway...');
        redirectToPayment(result.paymentUrl);
      } else {
        toast.error(result.error || 'Failed to initiate payment');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">আপনার প্ল্যান বেছে নিন</CardTitle>
        <CardDescription>
          পেমেন্ট করতে আপনার প্ল্যান সিলেক্ট করুন
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PlanSelectionStep
          businessTypeId={businessTypeId}
          selectedPlanId={selectedPlanId}
          onSelect={setSelectedPlanId}
        />

        {selectedPlan && (
          <div className="pt-4 border-t">
            <Button
              onClick={handlePayOnline}
              className="w-full h-12 text-lg"
              disabled={isProcessing || checkoutLoading}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay ৳{selectedPlan.price_monthly.toLocaleString()} Online
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              অনলাইন পেমেন্ট করলে সাথে সাথে একাউন্ট একটিভ হয়ে যাবে
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
