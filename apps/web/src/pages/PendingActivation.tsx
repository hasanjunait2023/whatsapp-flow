import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Phone, MessageCircle, LogOut, RefreshCw, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useSubscription } from '@/hooks/useSubscription';
import { useUddoktaPay } from '@/hooks/useUddoktaPay';
import { AppLogo } from '@/components/AppLogo';
import { InlinePlanSelector } from '@/components/onboarding/InlinePlanSelector';
import { SUPPORT_WHATSAPP, BKASH_NUMBER, NAGAD_NUMBER } from '@/config/branding';
import { toast } from 'sonner';

export default function PendingActivation() {
  const { signOut } = useAuth();
  const { refetch, currentTenant } = useTenant();
  const { plan, pendingPlan, loading: subscriptionLoading } = useSubscription();
  const { initiateCheckout, redirectToPayment, loading: checkoutLoading } = useUddoktaPay();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const effectivePlan = plan || pendingPlan;
  const hasPlan = !!effectivePlan;

  const handlePayOnline = async () => {
    if (!effectivePlan) {
      toast.error('No plan found. Please select a plan first.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await initiateCheckout({
        planId: effectivePlan.id,
        amount: effectivePlan.price_monthly,
        billingCycle: 'monthly',
        orderType: 'subscription',
      });

      if (result.success && result.paymentUrl) {
        toast.success('Redirecting to payment gateway...');
        redirectToPayment(result.paymentUrl);
      } else {
        toast.error(result.error || 'Failed to initiate payment');
      }
    } catch {
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-redirect when tenant becomes activated (admin action, webhook, etc.)
  useEffect(() => {
    if (currentTenant?.is_activated) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentTenant?.is_activated, navigate]);

  const handleRefresh = async () => {
    await refetch();
    // Navigation handled by the useEffect above once refetch updates state
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi, I need help with my account activation')}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-2 space-y-4">
          <div className="flex justify-center">
            <AppLogo className="h-12 w-auto" withMotion />
          </div>
          <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            আপনার অ্যাকাউন্ট অপেক্ষারত
          </CardTitle>
          <CardDescription className="text-base">
            আপনার পেমেন্ট ভেরিফাই হলে আপনি ড্যাশবোর্ড অ্যাক্সেস পাবেন
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Show plan selector if no plan is selected */}
          {!subscriptionLoading && !hasPlan && (
            <InlinePlanSelector businessTypeId={currentTenant?.business_type_id} />
          )}

          {/* Show payment options if plan exists */}
          {hasPlan && (
            <>
              {/* Selected Plan Info */}
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Selected Plan</p>
                    <p className="font-semibold text-lg">{effectivePlan.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">৳{effectivePlan.price_monthly.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  ম্যানুয়াল পেমেন্ট
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">bKash Personal:</span>
                    <span className="font-mono font-medium text-foreground">{BKASH_NUMBER}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Nagad Personal:</span>
                    <span className="font-mono font-medium text-foreground">{NAGAD_NUMBER}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  পেমেন্ট করার পর আমাদের সাপোর্ট টিমে স্ক্রিনশট পাঠান
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  onClick={handlePayOnline} 
                  className="w-full gap-2 h-12 text-base"
                  disabled={isProcessing || checkoutLoading}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pay ৳{effectivePlan.price_monthly.toLocaleString()} Online (Instant)
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleRefresh} className="w-full gap-2">
                  <RefreshCw className="h-4 w-4" />
                  স্ট্যাটাস রিফ্রেশ করুন
                </Button>
              </div>
            </>
          )}

          {/* Contact Support */}
          <div className="bg-accent rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              সাপোর্ট
            </h3>
            <div className="space-y-1 text-sm">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp এ যোগাযোগ করুন
              </a>
            </div>
          </div>

          <Button variant="ghost" onClick={handleLogout} className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            লগআউট
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            অনলাইন পেমেন্ট করলে সাথে সাথে একাউন্ট একটিভ হয়ে যাবে
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
