import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useSystemAdmin } from '@/hooks/useSystemAdmin';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Play, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { ProductVideoPlayer } from '@/components/auth/ProductVideoPlayer';
import { DemoRequestDialog } from '@/components/DemoRequestDialog';
import { cn } from '@/lib/utils';

export default function Login() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useSystemAdmin();
  const { tenants, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  type LocationState = {
    from?: {
      pathname?: string;
    };
  };

  const fromPath = (location.state as LocationState | null)?.from?.pathname;

  // If already authenticated (or just signed in), send user back to intended page.
  useEffect(() => {
    // Avoid redirect loops when a logged-in user has NO tenant:
    // /dashboard (ProtectedRoute) -> /auth/login -> (auto-redirect) /dashboard -> ...
    if (authLoading || adminLoading || tenantLoading) return;
    if (!user) return;

    // Admins can always go to admin panel.
    if (isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    // Regular users must have a tenant before we auto-redirect them away from /auth/login.
    if (tenants.length === 0) return;

    const target =
      fromPath && fromPath !== '/auth/login'
        ? fromPath
        : '/dashboard';

    navigate(target, { replace: true });
  }, [authLoading, adminLoading, tenantLoading, user, fromPath, isAdmin, tenants.length, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: t('errors.invalidCredentials'),
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
    } else {
      toast({
        title: t('login.title'),
        description: tCommon('messages.saveSuccess'),
      });
      // Navigate immediately — ProtectedRoute / RootRedirect will handle
      // the final destination (admin panel vs dashboard).
      navigate(fromPath && fromPath !== '/auth/login' ? fromPath : '/dashboard', { replace: true });
    }
  };

  const handleDemoSuccess = (credentials: { email: string; password: string }) => {
    setEmail(credentials.email);
    setPassword(credentials.password);
  };

  return (
    <AuthLayout>
      <div className="space-y-8">
        {/* Mobile Video - shown on small screens */}
        <div className="lg:hidden">
          <ProductVideoPlayer compact />
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('login.title')}</h1>
          <p className="text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        {/* Google Sign-In */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full h-12 text-base font-medium border-2"
          onClick={signInWithGoogle}
          disabled={isLoading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        {/* Demo Button - Prominent */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={cn(
            "w-full relative overflow-hidden group",
            "border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-violet-500/10",
            "hover:from-amber-500/20 hover:to-violet-500/20",
            "text-amber-600 dark:text-amber-400 font-semibold"
          )}
          onClick={() => setDemoDialogOpen(true)}
          disabled={isLoading}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/20 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Sparkles className="mr-2 h-5 w-5" />
          🎮 {t('login.tryDemo')}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-muted-foreground">
              {t('login.or')}
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {t('login.email')}
            </Label>
            <div className="relative">
              <Mail className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                focusedField === 'email' ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                id="email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                disabled={isLoading}
                className={cn(
                  "pl-11 h-12 text-base transition-all duration-200",
                  "border-2 focus:border-primary focus:ring-2 focus:ring-primary/20",
                  focusedField === 'email' && "border-primary shadow-sm"
                )}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                {t('login.password')}
              </Label>
              <Link
                to="/auth/forgot-password"
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <Lock className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                focusedField === 'password' ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                id="password"
                type="password"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                disabled={isLoading}
                className={cn(
                  "pl-11 h-12 text-base transition-all duration-200",
                  "border-2 focus:border-primary focus:ring-2 focus:ring-primary/20",
                  focusedField === 'password' && "border-primary shadow-sm"
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            size="lg"
            className="w-full h-12 text-base font-semibold group" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('login.signingIn')}
              </>
            ) : (
              <>
                {t('login.signIn')}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground">
          {t('login.noAccount')}{' '}
          <Link 
            to="/auth/signup" 
            className="font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            {t('login.signUp')}
          </Link>
        </p>
      </div>

      {/* Demo Request Dialog */}
      <DemoRequestDialog
        open={demoDialogOpen}
        onOpenChange={setDemoDialogOpen}
        onSuccess={handleDemoSuccess}
      />
    </AuthLayout>
  );
}
