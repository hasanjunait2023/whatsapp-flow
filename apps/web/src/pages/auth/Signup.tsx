import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { cn } from '@/lib/utils';

const benefits = [
  '5-day free trial',
  'No credit card required',
  'Full access to all features',
];

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan'); // carried from landing pricing CTA
  const redirect = searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast({
        title: 'Signup failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // better-auth signs the user in on signup — send them straight to
      // onboarding (carrying the chosen plan) to create their workspace + start
      // the 5-day trial, NOT back to the login page.
      toast({
        title: 'Account created!',
        description: 'Let’s set up your workspace.',
      });
      navigate(redirect ?? (plan ? `/onboarding?plan=${encodeURIComponent(plan)}` : '/onboarding'), { replace: true });
    }

    setIsLoading(false);
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: 'Weak', color: 'bg-destructive', width: '33%' };
    if (password.length < 10) return { label: 'Medium', color: 'bg-warning', width: '66%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
          <p className="text-muted-foreground">Start your journey with What A App</p>
        </div>

        {/* Benefits Pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {benefit}
            </div>
          ))}
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">Full name</Label>
            <div className="relative">
              <User className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                focusedField === 'fullName' ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
                required
                disabled={isLoading}
                className={cn(
                  "pl-11 h-12 text-base transition-all duration-200",
                  "border-2 focus:border-primary focus:ring-2 focus:ring-primary/20",
                  focusedField === 'fullName' && "border-primary shadow-sm"
                )}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative">
              <Mail className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                focusedField === 'email' ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
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

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative">
              <Lock className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                focusedField === 'password' ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
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
            {/* Password Strength Indicator */}
            {passwordStrength && (
              <div className="space-y-1">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-300", passwordStrength.color)}
                    style={{ width: passwordStrength.width }}
                  />
                </div>
                <p className={cn(
                  "text-xs",
                  passwordStrength.label === 'Weak' && "text-destructive",
                  passwordStrength.label === 'Medium' && "text-warning",
                  passwordStrength.label === 'Strong' && "text-green-500"
                )}>
                  {passwordStrength.label} password
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
            <div className="relative">
              <Lock className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200",
                focusedField === 'confirmPassword' ? "text-primary" : "text-muted-foreground"
              )} />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                required
                disabled={isLoading}
                className={cn(
                  "pl-11 h-12 text-base transition-all duration-200",
                  "border-2 focus:border-primary focus:ring-2 focus:ring-primary/20",
                  focusedField === 'confirmPassword' && "border-primary shadow-sm",
                  confirmPassword && password !== confirmPassword && "border-destructive"
                )}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            size="lg"
            className="w-full h-12 text-base font-semibold group mt-2" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Terms */}
        <p className="text-xs text-muted-foreground text-center">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.
        </p>

        {/* Sign In Link */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link 
            to="/auth/login" 
            className="font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
