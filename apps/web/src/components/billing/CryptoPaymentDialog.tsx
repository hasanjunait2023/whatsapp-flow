import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { Plan } from '@/hooks/usePlans';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, CheckCircle2, Copy, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// TODO i18n: hardcoded English strings

interface CryptoPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

type Network = 'TRC20' | 'BEP20';
type Step = 'config' | 'pay' | 'status';

interface CheckoutData {
  request_id: string;
  wallet_address: string;
  network: Network;
  currency: string;
  amount: number;
  base_amount: number;
  discount_applied: number;
  expires_at: string;
}

interface CouponState {
  code: string;
  valid: boolean | null;
  reason?: string;
  discountedAmount?: number;
}

interface RequestRow {
  id: string;
  status: string;
  review_note: string | null;
}

function formatCountdown(expiresAt: string, now: number): string {
  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function CryptoPaymentDialog({ open, onOpenChange, plan }: CryptoPaymentDialogProps) {
  const [step, setStep] = useState<Step>('config');
  const [network, setNetwork] = useState<Network>('TRC20');
  const [coupon, setCoupon] = useState<CouponState>({ code: '', valid: null });
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [txid, setTxid] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick the expiry countdown while the payment screen is visible.
  useEffect(() => {
    if (step !== 'pay' || !open) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [step, open]);

  const statusQuery = useQuery({
    queryKey: ['crypto-payment-request', checkout?.request_id],
    enabled: open && step === 'status' && !!checkout?.request_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crypto_payment_requests')
        .select('id, status, review_note')
        .eq('id', checkout!.request_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as RequestRow | null;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'approved' || status === 'rejected' || status === 'expired' ? false : 5000;
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep('config');
      setCheckout(null);
      setTxid('');
      setCoupon({ code: '', valid: null });
    }, 200);
  };

  const validateCoupon = async () => {
    const code = coupon.code.trim();
    if (!code || !plan) {
      setCoupon((prev) => ({ ...prev, valid: null, reason: undefined, discountedAmount: undefined }));
      return;
    }
    const { data, error } = await supabase.functions.invoke<{
      valid: boolean;
      reason?: string;
      base_amount?: number;
      discounted_amount?: number;
    }>('coupon-validate', { body: { code, plan_id: plan.id } });

    if (error || !data) {
      setCoupon((prev) => ({ ...prev, valid: false, reason: error?.message ?? 'Validation failed' }));
    } else {
      setCoupon((prev) => ({
        ...prev,
        valid: data.valid,
        reason: data.reason,
        discountedAmount: data.discounted_amount,
      }));
    }
  };

  const handleCreateCheckout = async () => {
    if (!plan) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke<CheckoutData>('crypto-checkout-create', {
      body: {
        plan_id: plan.id,
        network,
        coupon_code: coupon.valid ? coupon.code.trim() : undefined,
      },
    });
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message ?? 'Failed to create checkout');
      return;
    }
    setCheckout(data);
    setStep('pay');
  };

  const handleSubmitTxid = async () => {
    if (!checkout || !txid.trim()) return;
    setLoading(true);
    const { error } = await supabase.functions.invoke('crypto-submit-txid', {
      body: { request_id: checkout.request_id, txid: txid.trim() },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Transaction submitted for verification');
    setStep('status');
  };

  const copyAddress = () => {
    if (!checkout) return;
    void navigator.clipboard.writeText(checkout.wallet_address);
    toast.success('Address copied');
  };

  if (!plan) return null;

  const requestStatus = statusQuery.data?.status;

  return (
    <ResponsiveDialog open={open} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        {step === 'config' && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Pay with Crypto (USDT)</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {plan.name} Plan — manual USDT transfer, verified by our team
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Network</Label>
                <RadioGroup
                  value={network}
                  onValueChange={(value) => setNetwork(value as Network)}
                  className="grid grid-cols-2 gap-3"
                >
                  {(['TRC20', 'BEP20'] as const).map((option) => (
                    <Label
                      key={option}
                      htmlFor={`network-${option}`}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                        network === option
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={option} id={`network-${option}`} className="sr-only" />
                      <span className="font-medium">{option}</span>
                      <span className="text-xs text-muted-foreground">
                        {option === 'TRC20' ? 'Tron network' : 'BNB Smart Chain'}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-code">Coupon code (optional)</Label>
                <Input
                  id="coupon-code"
                  placeholder="SAVE10"
                  value={coupon.code}
                  onChange={(e) => setCoupon({ code: e.target.value, valid: null })}
                  onBlur={() => void validateCoupon()}
                />
                {coupon.valid === true && (
                  <p className="text-sm text-success flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Coupon applied
                    {coupon.discountedAmount != null && (
                      <span className="font-medium">— new price ${coupon.discountedAmount}</span>
                    )}
                  </p>
                )}
                {coupon.valid === false && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {coupon.reason || 'Invalid coupon'}
                  </p>
                )}
              </div>
            </div>

            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreateCheckout} disabled={loading || coupon.valid === false}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Continue
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}

        {step === 'pay' && checkout && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Send USDT ({checkout.network})</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Expires in{' '}
                <span className="font-mono font-semibold">
                  {formatCountdown(checkout.expires_at, now)}
                </span>
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="space-y-4 py-2">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Send <span className="font-bold">exactly {checkout.amount} USDT</span> on{' '}
                  {checkout.network}. A different amount cannot be matched to your payment
                  automatically.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={checkout.wallet_address} size={140} />
                </div>
                <div className="flex items-center gap-2 w-full">
                  <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 break-all">
                    {checkout.wallet_address}
                  </code>
                  <Button variant="outline" size="icon" onClick={copyAddress}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan price</span>
                  <span>${checkout.base_amount}</span>
                </div>
                {checkout.discount_applied > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-${checkout.discount_applied}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Amount to send</span>
                  <span>{checkout.amount} USDT</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crypto-txid">Transaction ID (TxID)</Label>
                <Input
                  id="crypto-txid"
                  placeholder="Paste the transaction hash after sending"
                  value={txid}
                  onChange={(e) => setTxid(e.target.value)}
                />
              </div>
            </div>

            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmitTxid} disabled={loading || !txid.trim()}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit TxID
              </Button>
            </ResponsiveDialogFooter>
          </>
        )}

        {step === 'status' && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Payment status</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                We verify USDT transfers manually — this usually takes a few hours.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="flex flex-col items-center gap-4 py-8">
              {requestStatus === 'approved' ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-success" />
                  <p className="font-medium">Payment approved — your plan is active!</p>
                </>
              ) : requestStatus === 'rejected' ? (
                <>
                  <XCircle className="h-12 w-12 text-destructive" />
                  <p className="font-medium">Payment rejected</p>
                  {statusQuery.data?.review_note && (
                    <p className="text-sm text-muted-foreground">{statusQuery.data.review_note}</p>
                  )}
                </>
              ) : requestStatus === 'expired' ? (
                <>
                  <XCircle className="h-12 w-12 text-destructive" />
                  <p className="font-medium">Request expired</p>
                </>
              ) : (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <div className="text-center">
                    <p className="font-medium mb-1">Awaiting verification</p>
                    <Badge variant="outline">{requestStatus ?? 'submitted'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    You can safely close this dialog — we will activate your plan once the transfer
                    is confirmed.
                  </p>
                </>
              )}
            </div>

            <ResponsiveDialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </ResponsiveDialogFooter>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
