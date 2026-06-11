import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';
import { useBusinessTypes } from '@/hooks/useBusinessTypes';
import { useAdminPlans } from '@/hooks/useAdminPlans';

const formSchema = z.object({
  customerName: z.string().min(2, 'Name is required'),
  customerEmail: z.string().email('Valid email required'),
  customerPhone: z.string().optional(),
  businessName: z.string().min(2, 'Business name is required'),
  businessTypeId: z.string().min(1, 'Business type is required'),
  planId: z.string().min(1, 'Plan is required'),
  billingCycle: z.enum(['monthly', 'yearly']),
  amount: z.number().min(0, 'Amount must be positive'),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateExternalOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues & { processImmediately: boolean }) => Promise<void>;
  isSubmitting: boolean;
}

export default function CreateExternalOrderDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CreateExternalOrderDialogProps) {
  const [processImmediately, setProcessImmediately] = useState(true);
  const { businessTypes, loading: loadingBusinessTypes } = useBusinessTypes();
  const { plans, loading: loadingPlans } = useAdminPlans();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      businessName: '',
      businessTypeId: '',
      planId: '',
      billingCycle: 'monthly',
      amount: 0,
      paymentMethod: 'bkash',
      transactionId: '',
    },
  });

  const selectedBusinessTypeId = form.watch('businessTypeId');
  const selectedPlanId = form.watch('planId');
  const billingCycle = form.watch('billingCycle');

  // Filter plans by business type
  const filteredPlans = plans.filter(
    (plan) => plan.business_type_id === selectedBusinessTypeId
  );

  // Auto-fill amount when plan or billing cycle changes
  useEffect(() => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (selectedPlan) {
      const price =
        billingCycle === 'yearly'
          ? selectedPlan.price_yearly || selectedPlan.price_monthly * 12
          : selectedPlan.price_monthly;
      form.setValue('amount', price);
    }
  }, [selectedPlanId, billingCycle, plans, form]);

  // Reset plan when business type changes
  useEffect(() => {
    form.setValue('planId', '');
    form.setValue('amount', 0);
  }, [selectedBusinessTypeId, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSubmit({ ...values, processImmediately });
    form.reset();
    onOpenChange(false);
  };

  const paymentMethods = [
    { value: 'bkash', label: 'bKash' },
    { value: 'nagad', label: 'Nagad' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create External Sales Order
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Customer Information
              </h3>

              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+8801712345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Business Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Business Details
              </h3>

              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John's Fashion Store" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loadingBusinessTypes}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {businessTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subscription */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Subscription
              </h3>

              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedBusinessTypeId || loadingPlans}
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
                        {filteredPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - ৳{plan.price_monthly.toLocaleString()}
                            /mo
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing Cycle</FormLabel>
                      <Select
                        onValueChange={field.onChange}
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
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Payment Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID</FormLabel>
                      <FormControl>
                        <Input placeholder="TXN123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Process Immediately Checkbox */}
            <div className="flex items-start space-x-3 rounded-lg border p-4 bg-muted/50">
              <Checkbox
                id="processImmediately"
                checked={processImmediately}
                onCheckedChange={(checked) =>
                  setProcessImmediately(checked === true)
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="processImmediately"
                  className="font-medium cursor-pointer"
                >
                  Process immediately
                </Label>
                <p className="text-xs text-muted-foreground">
                  Create user, tenant & activate subscription now
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
