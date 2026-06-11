import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePlans } from '@/hooks/usePlans';
import { useBusinessTypes } from '@/hooks/useBusinessTypes';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Warehouse, ShoppingBag, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

const formSchema = z.object({
  business_type_id: z.string().min(1, 'Business type is required'),
  plan_id: z.string().min(1, 'Plan is required'),
  billing_cycle: z.enum(['monthly', 'yearly']),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  payment_method: z.string().optional(),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
  mark_as_paid: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateSubscriptionOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    business_type_id?: string | null;
  } | null;
  onSuccess: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  warehouse: Warehouse,
  'shopping-bag': ShoppingBag,
  briefcase: Briefcase,
};

export function CreateSubscriptionOrderDialog({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}: CreateSubscriptionOrderDialogProps) {
  const { user } = useAuth();
  const { plans } = usePlans();
  const { businessTypes } = useBusinessTypes();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      business_type_id: tenant?.business_type_id || '',
      plan_id: '',
      billing_cycle: 'monthly',
      amount: 0,
      payment_method: '',
      transaction_id: '',
      notes: '',
      mark_as_paid: false,
    },
  });

  // Reset form when tenant changes
  useEffect(() => {
    if (tenant) {
      form.reset({
        business_type_id: tenant.business_type_id || '',
        plan_id: '',
        billing_cycle: 'monthly',
        amount: 0,
        payment_method: '',
        transaction_id: '',
        notes: '',
        mark_as_paid: false,
      });
    }
  }, [tenant, form]);

  const selectedBusinessTypeId = form.watch('business_type_id');
  const selectedPlanId = form.watch('plan_id');
  const billingCycle = form.watch('billing_cycle');

  // Filter plans by selected business type
  const filteredPlans = plans.filter(
    (p) => (p as any).business_type_id === selectedBusinessTypeId
  );

  // Auto-fill amount when plan changes
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const suggestedAmount = selectedPlan
    ? billingCycle === 'yearly' && selectedPlan.price_yearly
      ? selectedPlan.price_yearly
      : selectedPlan.price_monthly
    : 0;

  const handleBusinessTypeChange = (typeId: string) => {
    form.setValue('business_type_id', typeId);
    form.setValue('plan_id', ''); // Reset plan when business type changes
    form.setValue('amount', 0);
  };

  const handlePlanChange = (planId: string) => {
    form.setValue('plan_id', planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const amount =
        billingCycle === 'yearly' && plan.price_yearly
          ? plan.price_yearly
          : plan.price_monthly;
      form.setValue('amount', amount);
    }
  };

  const handleBillingCycleChange = (cycle: 'monthly' | 'yearly') => {
    form.setValue('billing_cycle', cycle);
    if (selectedPlan) {
      const amount =
        cycle === 'yearly' && selectedPlan.price_yearly
          ? selectedPlan.price_yearly
          : selectedPlan.price_monthly;
      form.setValue('amount', amount);
    }
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${year}${month}-${random}`;
  };

  const onSubmit = async (data: FormValues) => {
    if (!tenant || !user) return;

    setLoading(true);
    try {
      const orderNumber = generateOrderNumber();

      // If tenant doesn't have a business type, update it
      if (!tenant.business_type_id && data.business_type_id) {
        const { error: updateError } = await supabase
          .from('tenants')
          .update({ business_type_id: data.business_type_id })
          .eq('id', tenant.id);

        if (updateError) throw updateError;
      }

      const orderData = {
        tenant_id: tenant.id,
        plan_id: data.plan_id,
        order_number: orderNumber,
        amount: data.amount,
        billing_cycle: data.billing_cycle,
        status: data.mark_as_paid ? 'paid' : 'pending',
        payment_method: data.payment_method || null,
        transaction_id: data.transaction_id || null,
        notes: data.notes || null,
        created_by: user.id,
        verified_by: data.mark_as_paid ? user.id : null,
        verified_at: data.mark_as_paid ? new Date().toISOString() : null,
      };

      const { error } = await supabase.from('subscription_orders').insert(orderData);

      if (error) throw error;

      toast.success(
        data.mark_as_paid
          ? `Order created and tenant "${tenant.name}" activated!`
          : `Order ${orderNumber} created successfully`
      );

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error(error.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const selectedBusinessType = businessTypes.find((t) => t.id === selectedBusinessTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Subscription Order</DialogTitle>
          <DialogDescription>
            Create a subscription order for <strong>{tenant?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Business Type Selection */}
            <FormField
              control={form.control}
              name="business_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Type</FormLabel>
                  <Select onValueChange={handleBusinessTypeChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {businessTypes.map((type) => {
                        const IconComponent = ICON_MAP[type.icon || ''] || Briefcase;
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {type.name}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {tenant?.business_type_id && (
                    <FormDescription>
                      Current: {businessTypes.find((t) => t.id === tenant.business_type_id)?.name}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Plan Selection */}
            <FormField
              control={form.control}
              name="plan_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <Select
                    onValueChange={handlePlanChange}
                    value={field.value}
                    disabled={!selectedBusinessTypeId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedBusinessTypeId
                              ? 'Select a plan'
                              : 'Select business type first'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredPlans.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No plans for this business type
                        </div>
                      ) : (
                        filteredPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            <div className="flex items-center gap-2">
                              {plan.name}
                              <Badge variant="outline" className="text-xs capitalize">
                                {(plan as any).tier || 'starter'}
                              </Badge>
                              <span className="text-muted-foreground">
                                ৳{plan.price_monthly}/mo
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_cycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Cycle</FormLabel>
                  <Select
                    onValueChange={(v) => handleBillingCycleChange(v as 'monthly' | 'yearly')}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (BDT)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  {suggestedAmount > 0 && field.value !== suggestedAmount && (
                    <FormDescription className="text-warning">
                      Suggested: ৳{suggestedAmount}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bkash">bKash</SelectItem>
                      <SelectItem value="nagad">Nagad</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., TXN12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mark_as_paid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">Mark as Paid & Activate Tenant</FormLabel>
                    <FormDescription>
                      This will immediately activate the tenant's account
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Order
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
