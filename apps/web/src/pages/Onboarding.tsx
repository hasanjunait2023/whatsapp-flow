import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';
import { useBusinessTypes } from '@/hooks/useBusinessTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, ArrowRight, ArrowLeft, Sparkles, Check, MessageSquare, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AppLogo } from '@/components/AppLogo';
import { APP_NAME } from '@/config/branding';
import { BusinessTypeSelector } from '@/components/onboarding/BusinessTypeSelector';
import { PlanSelectionStep } from '@/components/onboarding/PlanSelectionStep';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const { createTenant, tenants, switchTenant, hasTenants, loading: tenantLoading, currentTenant } = useTenant();
  const { businessTypes, loading: businessTypesLoading } = useBusinessTypes();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Preselect the plan chosen on the landing pricing CTA (/onboarding?plan=pro).
  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan && !selectedPlanId) setSelectedPlanId(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Only redirect if the user already has an ACTIVATED tenant.
  // Non-activated tenants stay on /pending-activation, so we also redirect there if needed.
  useEffect(() => {
    if (tenantLoading) return;
    if (!currentTenant) return; // No tenant yet — stay on onboarding
    
    if (currentTenant.is_activated) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/pending-activation', { replace: true });
    }
  }, [tenantLoading, currentTenant, navigate]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceName.trim()) {
      toast({
        title: 'Workspace name required',
        description: 'Please enter a name for your workspace.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBusinessType) {
      toast({
        title: 'Business type required',
        description: 'Please select your business type.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedPlanId) {
      toast({
        title: 'Plan required',
        description: 'Please select a subscription plan.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await createTenant(workspaceName, selectedBusinessType, selectedPlanId);
      // The 5-day trial auto-activates the tenant server-side, so go straight to
      // the panel — no "complete payment to activate" gate during the trial.
      toast({
        title: 'Workspace ready!',
        description: `Your 5-day free trial of "${workspaceName}" is live.`,
      });
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      toast({
        title: 'Failed to create workspace',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorkspace = (tenantId: string) => {
    switchTenant(tenantId);
    toast({
      title: 'Workspace switched',
      description: 'You have been redirected to your workspace.',
    });
    navigate('/dashboard');
  };

  const handleNextStep = () => {
    if (step === 2 && !selectedBusinessType) {
      toast({
        title: 'Please select a business type',
        variant: 'destructive',
      });
      return;
    }
    if (step === 3 && !workspaceName.trim()) {
      toast({
        title: 'Please enter a workspace name',
        variant: 'destructive',
      });
      return;
    }
    setStep(step + 1);
  };

  if (tenantLoading || businessTypesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSteps = 4;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-3xl">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <AppLogo size="xl" withMotion />
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <Card className="border-border/50 shadow-lg animate-fade-in">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Welcome to {APP_NAME}!</CardTitle>
              <CardDescription className="text-base">
                Let's get you set up with your own workspace in just a few seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-light">
                  <MessageSquare className="h-5 w-5 text-brand mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">WhatsApp Integration</p>
                    <p className="text-xs text-muted-foreground">Connect multiple WhatsApp instances</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent">
                  <Building2 className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Team Collaboration</p>
                    <p className="text-xs text-muted-foreground">Invite team members and assign conversations</p>
                  </div>
                </div>
              </div>
              <Button className="w-full mt-6" onClick={() => setStep(2)}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {hasTenants && (
                <Button variant="ghost" className="w-full mt-2" onClick={() => setShowWorkspacePicker(true)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Switch to existing workspace
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Business Type Selection */}
        {step === 2 && (
          <Card className="border-border/50 shadow-lg animate-fade-in">
            <CardContent className="pt-6">
              <BusinessTypeSelector
                businessTypes={businessTypes}
                selectedType={selectedBusinessType}
                onSelect={setSelectedBusinessType}
              />
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={handleNextStep} disabled={!selectedBusinessType}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Workspace Name */}
        {step === 3 && (
          <Card className="border-border/50 shadow-lg animate-fade-in max-w-lg mx-auto">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Name your workspace</CardTitle>
              <CardDescription className="text-base">
                Your workspace is where your team manages conversations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace name</Label>
                <Input
                  id="workspaceName"
                  type="text"
                  placeholder="e.g., My Company"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  className="h-12 text-base"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is typically your company or team name.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button className="flex-1" onClick={handleNextStep} disabled={!workspaceName.trim()}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {hasTenants && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => setShowWorkspacePicker(true)}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Switch to existing workspace
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Plan Selection */}
        {step === 4 && (
          <Card className="border-border/50 shadow-lg animate-fade-in">
            <CardContent className="pt-6">
              <PlanSelectionStep
                businessTypeId={selectedBusinessType}
                selectedPlanId={selectedPlanId}
                onSelect={setSelectedPlanId}
              />
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateWorkspace}
                  disabled={!selectedPlanId || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Create & Pay
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Workspace Picker Dialog */}
      <Dialog open={showWorkspacePicker} onOpenChange={setShowWorkspacePicker}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Workspace</DialogTitle>
            <DialogDescription>Select an existing workspace to continue</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2 pr-4">
              {tenants.map((t) => (
                <button
                  key={t.tenant_id}
                  onClick={() => handleSelectWorkspace(t.tenant_id)}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg border border-border hover:bg-accent hover:border-primary/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.tenant.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.role}</p>
                  </div>
                  <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </ScrollArea>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setShowWorkspacePicker(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
