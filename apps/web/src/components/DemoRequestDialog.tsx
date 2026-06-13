import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Sparkles } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';

const demoRequestSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  whatsappNumber: z.string().min(11, 'Please enter a valid WhatsApp number'),
  email: z.string().email('Please enter a valid email'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
});

type DemoRequestFormData = z.infer<typeof demoRequestSchema>;

interface DemoRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (credentials: { email: string; password: string }) => void;
}

export function DemoRequestDialog({ open, onOpenChange, onSuccess }: DemoRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DemoRequestFormData>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: {
      fullName: '',
      whatsappNumber: '',
      email: '',
      businessName: '',
    },
  });

  const handleSubmit = async (data: DemoRequestFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/public/demo-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.fullName,
          whatsapp_number: data.whatsappNumber,
          email: data.email,
          business_name: data.businessName,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.message ?? 'Failed to submit request');
      }

      // Provide demo credentials
      const demoCredentials = {
        email: 'demo@whatscrm.com',
        password: 'demo123',
      };

      onSuccess(demoCredentials);
      onOpenChange(false);
      form.reset();
      
      toast.success('Demo access granted!', {
        description: 'Your credentials have been filled. Click "Sign In" to access the demo.',
      });
    } catch (error: any) {
      console.error('Demo request error:', error);
      toast.error('Failed to submit request', {
        description: error.message || 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Try Demo
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Please provide your details to get instant demo access.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="আপনার নাম" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsappNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input placeholder="01XXXXXXXXX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="আপনার ব্যবসার নাম" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ResponsiveDialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get Demo Access
                  </>
                )}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
