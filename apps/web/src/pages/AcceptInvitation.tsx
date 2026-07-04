import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, LogIn } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login_required'>('loading');
  const [message, setMessage] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setStatus('login_required');
      return;
    }

    acceptInvitation();
  }, [user, authLoading, token]);

  const acceptInvitation = async () => {
    if (!token || !user) return;

    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; tenant_id?: string; role?: string; error?: string }>('accept-invitation', {
        body: { token },
      });

      if (error) throw error;
      if (!data) throw new Error('Failed to accept invitation');
      if (data.error) throw new Error(data.error);

      setStatus('success');
      setMessage("You've been added to the workspace successfully.");
      setTenantId(data.tenant_id ?? null);

      toast({
        title: 'Invitation accepted!',
        description: "You've been added to the workspace.",
      });

      if (data.tenant_id) {
        localStorage.setItem('currentTenantId', data.tenant_id);
      }
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message);
      toast({
        title: 'Failed to accept invitation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <AppLogo size="xl" withMotion />
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            {status === 'loading' && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <CardTitle>Accepting Invitation</CardTitle>
                <CardDescription>Please wait while we add you to the workspace...</CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <CardTitle>Welcome to the team!</CardTitle>
                <CardDescription>{message}</CardDescription>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle>Invitation Failed</CardTitle>
                <CardDescription>{message}</CardDescription>
              </>
            )}

            {status === 'login_required' && (
              <>
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <LogIn className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Login Required</CardTitle>
                <CardDescription>
                  Please log in or create an account to accept this invitation.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {status === 'success' && (
              <p className="text-sm text-center text-muted-foreground">
                Redirecting you to the dashboard...
              </p>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth/login">Sign In</Link>
                </Button>
              </div>
            )}

            {status === 'login_required' && (
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link to={`/auth/login?redirect=/invite/${token}`}>Sign In</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to={`/auth/signup?redirect=/invite/${token}`}>Create Account</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
