import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({
        title: t('resetPassword.mismatch', "Passwords don't match"),
        variant: 'destructive',
      });
      return;
    }
    if (password.length < 8) {
      toast({
        title: t('resetPassword.tooShort', 'Password must be at least 8 characters'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (res.ok) {
        setDone(true);
        toast({
          title: t('resetPassword.success', 'Password updated'),
          description: t('resetPassword.successDesc', 'You can now sign in with your new password.'),
        });
        setTimeout(() => navigate('/auth/login'), 2500);
      } else {
        const data = await res.json().catch(() => null);
        toast({
          title: t('errors.generic', 'Something went wrong'),
          description: data?.message ?? t('resetPassword.tokenInvalid', 'The reset link may have expired. Request a new one.'),
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

  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t('resetPassword.noToken', 'This link is invalid or has expired.')}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/auth/forgot-password">
              {t('resetPassword.requestNew', 'Request a new reset link')}
            </Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('resetPassword.heading', 'Set a new password')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('resetPassword.subheading', 'Choose a strong password for your account.')}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/40 p-8">
            <CheckCircle2 className="h-10 w-10 text-primary" />
            <p className="text-sm text-center text-muted-foreground">
              {t('resetPassword.redirecting', 'Password updated. Redirecting to login…')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('resetPassword.newPassword', 'New password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('resetPassword.confirmPassword', 'Confirm password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('resetPassword.saving', 'Updating…')}
                </>
              ) : (
                t('resetPassword.submit', 'Update password')
              )}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
