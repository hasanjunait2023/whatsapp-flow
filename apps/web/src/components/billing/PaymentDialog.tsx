import { useState } from 'react';
import { BKASH_NUMBER, NAGAD_NUMBER } from '@/config/branding';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plan } from '@/hooks/usePlans';
import { CreatePaymentInput } from '@/hooks/usePayments';
import { useUddoktaPay } from '@/hooks/useUddoktaPay';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { Smartphone, CreditCard, Loader2, ArrowLeft, ExternalLink, Coins } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onSubmit: (input: CreatePaymentInput) => Promise<void>;
  orderType?: 'subscription' | 'renewal';
  /** Optional: when provided, shows a "Pay with Crypto (USDT)" option that delegates to the crypto flow. */
  onCryptoSelect?: () => void;
}

type Step = 'method' | 'manual' | 'processing';

export function PaymentDialog({ open, onOpenChange, plan, onSubmit, orderType = 'subscription', onCryptoSelect }: PaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('method');
  const [paymentType, setPaymentType] = useState<'online' | 'manual'>('online');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'bank_transfer'>('bkash');
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  
  const { initiateCheckout, redirectToPayment, loading: checkoutLoading } = useUddoktaPay();

  const paymentNumbers = {
    bkash: BKASH_NUMBER,
    nagad: NAGAD_NUMBER,
    bank_transfer: 'Account: 1234567890, Routing: 123456789',
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setStep('method');
      setPaymentType('online');
      setTransactionId('');
      setNotes('');
    }, 200);
  };

  const handleMethodSelect = async () => {
    if (paymentType === 'manual') {
      setStep('manual');
    } else {
      // Online payment - initiate checkout
      if (!plan) return;
      
      setStep('processing');
      
      const result = await initiateCheckout({
        planId: plan.id,
        amount: plan.price_monthly,
        billingCycle: 'monthly',
        orderType,
      });

      if (result.success && result.paymentUrl) {
        toast.success('Redirecting to payment gateway...');
        redirectToPayment(result.paymentUrl);
      } else {
        toast.error(result.error || 'Failed to initiate payment');
        setStep('method');
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan || !transactionId.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        amount: plan.price_monthly,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        notes: notes || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Payment submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        {/* Step 1: Payment Method Selection */}
        {step === 'method' && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Choose Payment Method</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {plan.name} Plan - ৳{plan.price_monthly}/month
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            
            <div className="py-6 space-y-4">
              <PaymentMethodSelector
                value={paymentType}
                onChange={setPaymentType}
              />
              {onCryptoSelect && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                  onClick={() => {
                    onOpenChange(false);
                    onCryptoSelect();
                  }}
                >
                  <Coins className="h-4 w-4" />
                  Pay with Crypto (USDT)
                </Button>
              )}
            </div>

            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleMethodSelect} disabled={checkoutLoading} className="gap-2">
                {paymentType === 'online' ? (
                  <>
                    Pay Online
                    <ExternalLink className="h-4 w-4" />
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}

        {/* Step 2: Manual Payment Form */}
        {step === 'manual' && (
          <form onSubmit={handleManualSubmit}>
            <ResponsiveDialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setStep('method')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <ResponsiveDialogTitle>Manual Payment</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription>
                    {plan.name} Plan - ৳{plan.price_monthly}/month
                  </ResponsiveDialogDescription>
                </div>
              </div>
            </ResponsiveDialogHeader>

            <div className="grid gap-6 py-4">
              <div className="grid gap-3">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'bkash' | 'nagad' | 'bank_transfer')}
                  className="grid grid-cols-3 gap-3"
                >
                  <Label
                    htmlFor="bkash"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      paymentMethod === 'bkash' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="bkash" id="bkash" className="sr-only" />
                    <div className="h-10 w-10 rounded-full bg-pink-500 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">bKash</span>
                  </Label>
                  <Label
                    htmlFor="nagad"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      paymentMethod === 'nagad' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="nagad" id="nagad" className="sr-only" />
                    <div className="h-10 w-10 rounded-full bg-violet-500 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">Nagad</span>
                  </Label>
                  <Label
                    htmlFor="bank_transfer"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      paymentMethod === 'bank_transfer' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" className="sr-only" />
                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-sm font-medium">Bank</span>
                  </Label>
                </RadioGroup>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-1">Send payment to:</p>
                <p className="text-lg font-mono font-bold text-primary">
                  {paymentNumbers[paymentMethod]}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Amount: ৳{plan.price_monthly}
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transactionId">Transaction ID</Label>
                <Input
                  id="transactionId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter your transaction ID"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the transaction ID from your payment confirmation
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>
            </div>

            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep('method')}>
                Back
              </Button>
              <Button type="submit" disabled={loading || !transactionId.trim()}>
                {loading ? 'Submitting...' : 'Submit Payment'}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        )}

        {/* Step 3: Processing Online Payment */}
        {step === 'processing' && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Processing Payment</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Please wait while we redirect you to the payment gateway...
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Connecting to UddoktaPay...
              </p>
            </div>

            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={() => setStep('method')}>
                Cancel
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
