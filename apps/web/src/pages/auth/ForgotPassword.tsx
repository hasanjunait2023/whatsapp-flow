import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

/**
 * Forgot password page — submits to /api/auth/forgot-password (better-auth).
 * Server sends a reset email via Resend; same success UX whether email exists
 * or not to prevent enumeration.
 */
export default function ForgotPassword() {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/auth/reset-password` }),
      });

      if (res.ok || res.status === 404) {
        setSubmitted(true);
        toast({
          title: t('forgotPassword.title', 'Check your email'),
          description: t(
            'forgotPassword.sent',
            'If an account exists for that email, we sent a reset link.',
          ),
        });
      } else {
        toast({
          title: t('errors.generic', 'Something went wrong'),
          description: t('errors.tryAgain', 'Please try again in a moment.'),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: t('errors.generic', 'Something went wrong'),
        description: t('errors.tryAgain', 'Please try again in a moment.'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <Link
            to="/auth/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            {t('forgotPassword.backToLogin', 'Back to login')}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('forgotPassword.heading', 'Forgot your password?')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              'forgotPassword.subheading',
              "Enter your email and we'll send you a reset link.",
            )}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-lg border border-border bg-muted/40 p-6 space-y-3">
            <p className="text-sm">
              {t(
                'forgotPassword.confirmation',
                'Check your inbox for a reset link. If you do not see it, check your spam folder.',
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setSubmitted(false)}
            >
              {t('forgotPassword.sendAnother', 'Send another email')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email', 'Email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('forgotPassword.sending', 'Sending…')}
                </>
              ) : (
                t('forgotPassword.submit', 'Send reset link')
              )}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}